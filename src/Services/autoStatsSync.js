const eaApi = require("./eaApi");
const db = require("../Utils/db");

const {
    processMatchXP
} = require("./processMatchXP");

const {
    syncCompetitiveMatches
} = require("./compStats");

const DEFAULT_LIMIT = 100;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const MATCH_TYPES = [
    "leagueMatch",
    "playoffMatch",
    "friendlyMatch"
];

let interval = null;
let isSyncing = false;

async function syncGuildStats(guildId, clubId, options = {}) {

    const limit =
        options.limit ||
        DEFAULT_LIMIT;
    const statsStartedAt =
        Object.prototype.hasOwnProperty.call(options, "statsStartedAt")
            ? Number(options.statsStartedAt || 0)
            : 0;

    const matches =
        (
            await Promise.all(
                MATCH_TYPES.map(type =>
                    eaApi.getMatches(
                        clubId,
                        type,
                        {
                            forceRefresh: Boolean(options.forceRefresh),
                            maxResultCount: limit
                        }
                    ).catch(err => {
                        console.error(
                            `${type} auto sync fetch failed for guild ${guildId}:`,
                            err
                        );
                        return [];
                    })
                )
            )
        )
            .flat()
            .filter(match => match?.matchId)
            .sort((a, b) =>
                Number(a.timestamp || 0) -
                Number(b.timestamp || 0)
            );

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
                maxResultCount: limit,
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
            maxResultCount: limit,
            statsStartedAt
        }
    ).catch(err => {
        console.error(
            `competitive sync failed for guild ${guildId}:`,
            err
        );
    });

    // Replay oldest -> newest so XP accumulates in the right order.
    for (const match of matches) {
        const didProcess =
            await processMatchXP(
                match,
                guildId,
                {
                    clubId,
                    overallStats,
                    force: Boolean(options.force),
                    includeFriendlyStats: true
                }
            );

        if (didProcess) {
            processed += 1;
        }
    }

    return {
        checked: matches.length,
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
        forceRefresh: true,
        statsStartedAt: 0
    });

    interval =
        setInterval(
            () => {
                syncAllLinkedClubs({
                    forceRefresh: true,
                    statsStartedAt: 0
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
