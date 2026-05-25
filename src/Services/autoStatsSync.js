const eaApi = require("./eaApi");
const db = require("../Utils/db");

const {
    processMatchXP
} = require("./processMatchXP");

const DEFAULT_LIMIT = 25;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

let interval = null;
let isSyncing = false;

async function syncGuildStats(guildId, clubId, options = {}) {

    const limit =
        options.limit ||
        DEFAULT_LIMIT;

    const matches =
        await eaApi.getMatches(
            clubId,
            { forceRefresh: Boolean(options.forceRefresh) }
        );

    if (!matches?.length) {
        return {
            checked: 0,
            processed: 0
        };
    }

    let processed = 0;
    const recentMatches =
        matches
            .slice(0, limit)
            .reverse();

    for (const match of recentMatches) {
        const didProcess =
            await processMatchXP(
                {
                    ...match,
                    club_id: clubId
                },
                guildId,
                {
                    force: Boolean(options.force)
                }
            );

        if (didProcess) {
            processed += 1;
        }
    }

    return {
        checked: recentMatches.length,
        processed
    };
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
