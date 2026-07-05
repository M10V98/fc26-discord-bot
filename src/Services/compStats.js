const eaApi = require("./eaApi");
const db = require("../Utils/db");
const {
    saves: saveCount
} = require("../Utils/apiStats");

function n(value) {
    return Number(value || 0);
}

function isAfterStart(match, startedAt = 0) {
    const start =
        Number(startedAt || 0);

    if (!start) {
        return true;
    }

    const timestampMs =
        Number(match?.timestamp || 0) * 1000;

    return timestampMs >= start;
}

async function getStatsStartedAt(guildId, clubId = null) {
    const row =
        await db.get(
            `
            SELECT stats_started_at
            FROM guild_clubs
            WHERE guild_id = ?
            AND club_id = ?
            UNION
            SELECT stats_started_at
            FROM clubs
            WHERE guild_id = ?
            AND club_id = ?
            LIMIT 1
            `,
            [
                guildId,
                String(clubId || ""),
                guildId,
                String(clubId || "")
            ]
        );

    if (row) {
        return Number(row.stats_started_at || 0);
    }

    const fallback =
        await db.get(
            `
            SELECT stats_started_at
            FROM clubs
            WHERE guild_id = ?
            `,
            [guildId]
        );

    return Number(fallback?.stats_started_at || 0);
}

async function syncCompetitiveMatches(guildId, clubId, options = {}) {
    const maxResultCount =
        options.maxResultCount || 100;
    const statsStartedAt =
        Object.prototype.hasOwnProperty.call(options, "statsStartedAt")
            ? Number(options.statsStartedAt || 0)
            : await getStatsStartedAt(guildId, clubId);

    const matches =
        await eaApi.getMatches(
            clubId,
            "friendlyMatch",
            {
                forceRefresh: Boolean(options.forceRefresh),
                maxResultCount
            }
        );

    let inserted = 0;

    for (const match of matches || []) {
        if (!match?.matchId) continue;
        if (!isAfterStart(match, statsStartedAt)) continue;

        const result =
            await db.run(
                `
                INSERT OR IGNORE INTO comp_matches
                (guild_id, club_id, match_id, timestamp, match_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    guildId,
                    String(clubId),
                    String(match.matchId),
                    Number(match.timestamp || 0),
                    JSON.stringify(match),
                    Date.now()
                ]
            );

        if (result.changes > 0) {
            inserted += 1;
        }
    }

    return {
        checked: matches?.length || 0,
        inserted
    };
}

async function getStoredCompetitiveMatches(guildId, clubId, options = {}) {
    const limit =
        options.limit || 500;
    const statsStartedAt =
        Object.prototype.hasOwnProperty.call(options, "statsStartedAt")
            ? Number(options.statsStartedAt || 0)
            : await getStatsStartedAt(guildId, clubId);

    const rows =
        await db.all(
            `
            SELECT *
            FROM comp_matches
            WHERE guild_id = ?
            AND club_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            `,
            [
                guildId,
                String(clubId),
                limit
            ]
        );

    return rows
        .map(row => {
            try {
                return JSON.parse(row.match_json);
            } catch {
                return null;
            }
        })
        .filter(match =>
            match &&
            isAfterStart(match, statsStartedAt)
        );
}

async function refreshAndGetCompetitiveMatches(guildId, clubId, options = {}) {
    await syncCompetitiveMatches(
        guildId,
        clubId,
        {
            forceRefresh: Boolean(options.forceRefresh),
            maxResultCount: options.maxResultCount || 100
        }
    );

    return getStoredCompetitiveMatches(
        guildId,
        clubId,
        { limit: options.limit || 500 }
    );
}

function addPlayer(aggregate, playerId, rawPlayer) {
    const player =
        rawPlayer || {};
    const current =
        aggregate.get(String(playerId)) || {
            playerId: String(playerId),
            name: player.playername || String(playerId),
            appearances: 0,
            goals: 0,
            assists: 0,
            ratingTotal: 0,
            passes: 0,
            passAttempts: 0,
            tackles: 0,
            tackleAttempts: 0,
            saves: 0,
            shots: 0,
            motm: 0,
            cleanSheets: 0,
            redCards: 0
        };

    current.name = player.playername || current.name;
    current.appearances += 1;
    current.goals += n(player.goals);
    current.assists += n(player.assists);
    current.ratingTotal += n(player.rating);
    current.passes += n(player.passesmade);
    current.passAttempts += n(player.passattempts);
    current.tackles += n(player.tacklesmade);
    current.tackleAttempts += n(player.tackleattempts);
    current.saves += saveCount(player);
    current.shots += n(player.shots);
    current.motm += player.mom === "1" ? 1 : 0;
    current.cleanSheets +=
        player.cleansheetsdef === "1" ||
        player.cleansheetsgk === "1"
            ? 1
            : 0;
    current.redCards += player.redcards === "1" ? 1 : 0;

    aggregate.set(String(playerId), current);
}

function finalisePlayer(player) {
    return {
        ...player,
        avgRating:
            player.appearances > 0
                ? player.ratingTotal / player.appearances
                : 0,
        passPercent:
            player.passAttempts > 0
                ? (player.passes / player.passAttempts) * 100
                : 0,
        tacklePercent:
            player.tackleAttempts > 0
                ? (player.tackles / player.tackleAttempts) * 100
                : 0,
        shotPercent:
            player.shots > 0
                ? (player.goals / player.shots) * 100
                : 0
    };
}

function aggregateCompetitivePlayers(matches, clubId) {
    const aggregate = new Map();
    const ourClubId = String(clubId);

    for (const match of matches || []) {
        const players =
            match.players?.[ourClubId] || {};

        for (const [playerId, player] of Object.entries(players)) {
            addPlayer(aggregate, playerId, player);
        }
    }

    return [...aggregate.values()]
        .map(finalisePlayer);
}

module.exports = {
    syncCompetitiveMatches,
    getStoredCompetitiveMatches,
    refreshAndGetCompetitiveMatches,
    aggregateCompetitivePlayers
};
