const db = require("../Utils/db");
const eaApi = require("./eaApi");
const {
    isValidClubId,
    normalizeClubId
} = require("../Utils/clubId");

function now() {
    return Date.now();
}

function normalizeClubLookup(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

async function getClubDisplayName(clubId) {
    const info =
        await eaApi.getClubInfo(clubId).catch(() => null);

    return info?.[String(clubId)]?.name ||
        info?.name ||
        null;
}

async function getLinkedClubs(guildId) {
    return db.all(
        `
        SELECT *
        FROM guild_clubs
        WHERE guild_id = ?
        ORDER BY is_default DESC, linked_at ASC, club_id ASC
        `,
        [guildId]
    );
}

async function getDefaultClub(guildId) {
    const linkedClubs =
        await db.all(
            `
            SELECT *
            FROM guild_clubs
            WHERE guild_id = ?
            ORDER BY is_default DESC, linked_at ASC
            `,
            [guildId]
        );
    const club =
        linkedClubs.find(row =>
            isValidClubId(row.club_id)
        );

    if (club) {
        if (!Number(club.is_default)) {
            return setDefaultClub(guildId, club.club_id);
        }

        return club;
    }

    const legacy =
        await db.get(
            `
            SELECT *
            FROM clubs
            WHERE guild_id = ?
            `,
            [guildId]
        );

    if (!legacy?.club_id || !normalizeClubId(legacy.club_id)) {
        return null;
    }

    await addLinkedClub(
        guildId,
        normalizeClubId(legacy.club_id),
        {
            makeDefault: true,
            statsStartedAt: legacy.stats_started_at
        }
    );

    return getDefaultClub(guildId);
}

async function findLinkedClub(guildId, query) {
    const value =
        String(query || "").trim();
    const normalized =
        normalizeClubLookup(value);

    if (!value) {
        return null;
    }

    const clubs =
        await getLinkedClubs(guildId);
    const byId =
        clubs.find(row =>
            String(row.club_id).toLowerCase() === value.toLowerCase()
        );

    if (byId) {
        return byId;
    }

    const exactName =
        clubs.find(row =>
            normalizeClubLookup(row.club_name) === normalized
        );

    if (exactName) {
        return exactName;
    }

    const partial =
        clubs.filter(row => {
            const name =
                normalizeClubLookup(row.club_name);

            return name &&
                (
                    name.includes(normalized) ||
                    normalized.includes(name)
                );
        });

    if (partial.length === 1) {
        return partial[0];
    }

    return null;
}

async function addLinkedClub(guildId, clubId, options = {}) {
    const value =
        normalizeClubId(clubId);

    if (!value) {
        throw new Error("invalid_club_id");
    }

    const existing =
        await db.get(
            `
            SELECT *
            FROM guild_clubs
            WHERE guild_id = ?
            AND club_id = ?
            `,
            [
                guildId,
                value
            ]
        );
    const linkedAt =
        existing?.linked_at ||
        now();
    const statsStartedAt =
        Number(
            options.statsStartedAt ||
            existing?.stats_started_at ||
            now()
        );
    const clubName =
        options.clubName ||
        existing?.club_name ||
        await getClubDisplayName(value);
    const shouldDefault =
        Boolean(options.makeDefault) ||
        !(await getDefaultClub(guildId));

    await db.run(
        `
        INSERT OR REPLACE INTO guild_clubs
        (guild_id, club_id, club_name, is_default, stats_started_at, linked_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            guildId,
            value,
            clubName,
            shouldDefault ? 1 : Number(existing?.is_default || 0),
            statsStartedAt,
            linkedAt
        ]
    );

    if (shouldDefault) {
        await setDefaultClub(guildId, value);
    }

    return {
        guild_id: guildId,
        club_id: value,
        club_name: clubName,
        is_default: shouldDefault ? 1 : Number(existing?.is_default || 0),
        stats_started_at: statsStartedAt,
        linked_at: linkedAt
    };
}

async function setDefaultClub(guildId, clubId) {
    const resolved =
        await findLinkedClub(guildId, clubId);
    const value =
        String(resolved?.club_id || "").trim();
    const club =
        resolved;

    if (!club || !isValidClubId(club.club_id)) {
        return null;
    }

    await db.run(
        `
        UPDATE guild_clubs
        SET is_default = CASE WHEN club_id = ? THEN 1 ELSE 0 END
        WHERE guild_id = ?
        `,
        [
            value,
            guildId
        ]
    );

    await db.run(
        `
        INSERT OR REPLACE INTO clubs
        (guild_id, club_id, stats_started_at)
        VALUES (?, ?, ?)
        `,
        [
            guildId,
            value,
            club.stats_started_at || now()
        ]
    );

    return {
        ...club,
        is_default: 1
    };
}

async function removeLinkedClub(guildId, clubId) {
    const existing =
        await findLinkedClub(guildId, clubId);
    const value =
        String(existing?.club_id || "").trim();

    if (!existing) {
        return {
            removed: false,
            nextDefault: null
        };
    }

    await db.run(
        `
        DELETE FROM guild_clubs
        WHERE guild_id = ?
        AND club_id = ?
        `,
        [
            guildId,
            value
        ]
    );

    if (!Number(existing.is_default)) {
        return {
            removed: true,
            nextDefault: await getDefaultClub(guildId)
        };
    }

    const next =
        await db.get(
            `
            SELECT *
            FROM guild_clubs
            WHERE guild_id = ?
            ORDER BY linked_at ASC
            LIMIT 1
            `,
            [guildId]
        );

    if (!next) {
        await db.run(
            `DELETE FROM clubs WHERE guild_id = ?`,
            [guildId]
        );

        return {
            removed: true,
            nextDefault: null
        };
    }

    return {
        removed: true,
        nextDefault: await setDefaultClub(guildId, next.club_id)
    };
}

async function repairStoredClubIds() {
    const linkedClubs =
        await db.all(
            `SELECT * FROM guild_clubs`
        );
    const guildIds =
        new Set(
            linkedClubs.map(row =>
                String(row.guild_id)
            )
        );
    let normalized = 0;
    let invalidLinkedRemoved = 0;
    let recovered = 0;
    let invalidLegacyRemoved = 0;

    for (const row of linkedClubs) {
        const clubId =
            normalizeClubId(row.club_id);

        if (!clubId || clubId === String(row.club_id)) {
            continue;
        }

        const existing =
            await db.get(
                `
                SELECT *
                FROM guild_clubs
                WHERE guild_id = ?
                AND club_id = ?
                `,
                [
                    row.guild_id,
                    clubId
                ]
            );

        await db.run(
            `
            INSERT OR REPLACE INTO guild_clubs
            (guild_id, club_id, club_name, is_default, stats_started_at, linked_at)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                row.guild_id,
                clubId,
                existing?.club_name || row.club_name,
                Math.max(
                    Number(existing?.is_default || 0),
                    Number(row.is_default || 0)
                ),
                existing?.stats_started_at || row.stats_started_at || now(),
                existing?.linked_at || row.linked_at || now()
            ]
        );
        await db.run(
            `
            DELETE FROM guild_clubs
            WHERE guild_id = ?
            AND club_id = ?
            `,
            [
                row.guild_id,
                row.club_id
            ]
        );
        normalized += 1;
    }

    const legacyClubs =
        await db.all(
            `SELECT * FROM clubs`
        );

    for (const legacy of legacyClubs) {
        guildIds.add(String(legacy.guild_id));
    }

    for (const guildId of guildIds) {
        const storedLinked = await getLinkedClubs(guildId);
        const invalidLinked = storedLinked.filter(row =>
            !isValidClubId(row.club_id)
        );

        for (const invalid of invalidLinked) {
            await db.run(
                `
                DELETE FROM guild_clubs
                WHERE guild_id = ?
                AND club_id = ?
                `,
                [guildId, invalid.club_id]
            );
            invalidLinkedRemoved += 1;
        }

        const validLinked = storedLinked.filter(row =>
            isValidClubId(row.club_id)
        );

        if (validLinked.length) {
            const preferred =
                validLinked.find(row =>
                    Number(row.is_default)
                ) ||
                validLinked[0];

            await setDefaultClub(
                guildId,
                preferred.club_id
            );
            continue;
        }

        const legacy =
            legacyClubs.find(row =>
                String(row.guild_id) === guildId
            );
        const legacyClubId =
            normalizeClubId(legacy?.club_id);
        const historicalIds =
            await db.all(
                `
                SELECT club_id, 1 AS priority, created_at AS used_at
                FROM comp_matches
                WHERE guild_id = ?
                UNION ALL
                SELECT club_id, 2 AS priority, updated_at AS used_at
                FROM xp_seasons
                WHERE guild_id = ?
                UNION ALL
                SELECT last_club_id AS club_id, 3 AS priority, last_activity_at AS used_at
                FROM automode
                WHERE guild_id = ?
                ORDER BY priority ASC, used_at DESC
                `,
                [guildId, guildId, guildId]
            );
        const recoveredClubId =
            legacyClubId ||
            historicalIds
                .map(row => normalizeClubId(row.club_id))
                .find(Boolean);

        if (recoveredClubId) {
            await addLinkedClub(
                guildId,
                recoveredClubId,
                {
                    makeDefault: true,
                    statsStartedAt:
                        legacy?.stats_started_at ||
                        invalidLinked[0]?.stats_started_at,
                    clubName: invalidLinked[0]?.club_name || null
                }
            );
            recovered += 1;
            continue;
        }

        if (legacy?.club_id) {
            await db.run(
                `DELETE FROM clubs WHERE guild_id = ?`,
                [guildId]
            );
            invalidLegacyRemoved += 1;
        }
    }

    if (normalized || invalidLinkedRemoved || recovered || invalidLegacyRemoved) {
        console.log(
            `Repaired stored club IDs: normalized ${normalized}, recovered ${recovered}, removed ${invalidLinkedRemoved} invalid linked club(s) and ${invalidLegacyRemoved} invalid legacy default(s).`
        );
    }

    return {
        normalized,
        invalidLinkedRemoved,
        recovered,
        invalidLegacyRemoved
    };
}

module.exports = {
    addLinkedClub,
    findLinkedClub,
    getDefaultClub,
    getLinkedClubs,
    repairStoredClubIds,
    removeLinkedClub,
    setDefaultClub
};
