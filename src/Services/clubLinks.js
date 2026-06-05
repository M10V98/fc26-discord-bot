const db = require("../Utils/db");
const eaApi = require("./eaApi");

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
    const club =
        await db.get(
            `
            SELECT *
            FROM guild_clubs
            WHERE guild_id = ?
            AND is_default = 1
            LIMIT 1
            `,
            [guildId]
        );

    if (club) {
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

    if (!legacy?.club_id) {
        return null;
    }

    await addLinkedClub(
        guildId,
        legacy.club_id,
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
        String(clubId || "").trim();

    if (!value) {
        throw new Error("club_id_required");
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

    if (!club) {
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

module.exports = {
    addLinkedClub,
    findLinkedClub,
    getDefaultClub,
    getLinkedClubs,
    removeLinkedClub,
    setDefaultClub
};
