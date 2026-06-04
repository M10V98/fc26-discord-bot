const eaApi = require("./eaApi");
const db = require("../Utils/db");

const {
    processMatchXP
} = require("./processMatchXP");

const {
    syncCompetitiveMatches
} = require("./compStats");

const DEFAULT_LIMIT = 25;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

let interval = null;
let isSyncing = false;

function normalizeMatchType(match) {
    const club =
        Object.values(match?.clubs || {})[0];

    return String(
        match?.matchType ||
        match?.matchtype ||
        club?.matchType ||
        club?.matchtype ||
        ""
    )
        .toLowerCase()
        .replace(/[\s_-]/g, "");
}

function isLeagueOrPlayoff(match) {
    const type =
        normalizeMatchType(match);

    return type === "leaguematch" ||
        type === "playoffmatch";
}

function isAfterStart(match, startedAt = 0) {
    const start =
        Number(startedAt || 0);

    if (!start) {
        return true;
    }

    return Number(match?.timestamp || 0) * 1000 >= start;
}

async function getStatsStartedAt(guildId) {
    const row =
        await db.get(
            `
            SELECT stats_started_at
            FROM clubs
            WHERE guild_id = ?
            `,
            [guildId]
        );

    return Number(row?.stats_started_at || 0);
}

async function syncGuildStats(guildId, clubId, options = {}) {

    const limit =
        options.limit ||
        DEFAULT_LIMIT;
    const statsStartedAt =
        Number(options.statsStartedAt || 0) ||
        await getStatsStartedAt(guildId);

    const matches =
        (await eaApi.getRecentMatches(
            clubId,
            {
                forceRefresh: Boolean(options.forceRefresh),
                limit: Math.max(limit, 100),
                maxResultCount: Math.max(limit, 100)
            }
        ))
            .filter(match =>
                isLeagueOrPlayoff(match) &&
                isAfterStart(match, statsStartedAt)
            )
            .slice(0, limit);

    const overallStats =
        await eaApi.getOverallStats(
            clubId,
            {
                forceRefresh: Boolean(options.forceRefresh)
            }
        ).catch(err => {
            console.error(
                `overall stats sync failed for guild ${guildId}:`,
                err
            );
            return null;
        });

    if (!matches?.length) {
        await syncCompetitiveMatches(
            guildId,
            clubId,
            {
                forceRefresh: Boolean(options.forceRefresh),
                statsStartedAt
            }
        ).catch(err => {
            console.error(
                `competitive sync failed for guild ${guildId}:`,
                err
            );
        });

        return {
            checked: 0,
            processed: 0
        };
    }

    let processed = 0;

    await backfillLinkedPlayerIds(
        guildId,
        clubId,
        matches
    );

    await syncCompetitiveMatches(
        guildId,
        clubId,
        {
            forceRefresh: Boolean(options.forceRefresh),
            statsStartedAt
        }
    ).catch(err => {
        console.error(
            `competitive sync failed for guild ${guildId}:`,
            err
        );
    });

    // Replay oldest -> newest so XP accumulates in the right order.
    const ordered = matches.slice().reverse();

    for (const match of ordered) {
        const didProcess =
            await processMatchXP(
                match,
                guildId,
                {
                    clubId,
                    overallStats,
                    force: Boolean(options.force)
                }
            );

        if (didProcess) {
            processed += 1;
        }
    }

    return {
        checked: ordered.length,
        processed
    };
}

async function backfillLinkedPlayerIds(guildId, clubId, matches) {

    const legacyLinks =
        await db.all(
            `
            SELECT *
            FROM linked_players
            WHERE guild_id = ?
            AND (player_id IS NULL OR player_id = '')
            AND player_name IS NOT NULL
            `,
            [guildId]
        );

    if (!legacyLinks.length) {
        return;
    }

    const idByName = new Map();
    const ourClubId = String(clubId);

    for (const match of matches) {
        const players =
            match.players?.[ourClubId] || {};

        for (const [playerId, player] of Object.entries(players)) {
            if (player.playername && !idByName.has(player.playername)) {
                idByName.set(player.playername, playerId);
            }
        }
    }

    for (const link of legacyLinks) {
        const playerId =
            idByName.get(link.player_name);

        if (!playerId) {
            continue;
        }

        await db.run(
            `
            UPDATE linked_players
            SET player_id = ?
            WHERE guild_id = ?
            AND discord_id = ?
            `,
            [
                playerId,
                guildId,
                link.discord_id
            ]
        );
    }
}

async function syncAllLinkedClubs(options = {}) {

    if (isSyncing) {
        return {
            skipped: true
        };
    }

    isSyncing = true;

    try {
        const clubs =
            await db.all(
                `SELECT guild_id, club_id
                 FROM clubs`
            );

        let checked = 0;
        let processed = 0;

        for (const club of clubs) {
            try {
                const result =
                    await syncGuildStats(
                        club.guild_id,
                        club.club_id,
                        options
                    );

                checked += result.checked;
                processed += result.processed;

            } catch (err) {
                console.error(
                    `auto stats sync failed for guild ${club.guild_id}:`,
                    err
                );
            }
        }

        console.log(
            `Auto stats sync checked ${checked} matches and processed ${processed}.`
        );

        return {
            checked,
            processed
        };

    } finally {
        isSyncing = false;
    }
}

function startAutoStatsSync() {

    if (interval) {
        clearInterval(interval);
    }

    syncAllLinkedClubs({
        forceRefresh: true
    });

    interval =
        setInterval(
            () => {
                syncAllLinkedClubs({
                    forceRefresh: true
                });
            },
            SYNC_INTERVAL_MS
        );

    return interval;
}

module.exports = {
    startAutoStatsSync,
    syncAllLinkedClubs,
    syncGuildStats
};
