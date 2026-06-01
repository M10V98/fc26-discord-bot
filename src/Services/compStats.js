const eaApi = require("./eaApi");
const db = require("../Utils/db");

function n(value) {
    return Number(value || 0);
}

async function syncCompetitiveMatches(guildId, clubId, options = {}) {
    const maxResultCount =
        options.maxResultCount || 100;

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
        .filter(Boolean);
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

function addPlayer(aggregate, playerId, player) {
    const current =
        aggregate.get(String(playerId)) || {
            playerId: String(playerId),
            name: player.playername || String(playerId),
            appearances: 0,
            goals: 0,
            assists: 0,
            secondAssists: 0,
            ratingTotal: 0,
            passes: 0,
            passAttempts: 0,
            tackles: 0,
            tackleAttempts: 0,
            dribbles: 0,
            interceptions: 0,
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
    current.secondAssists += n(player.secondassists || player.secondAssists);
    current.ratingTotal += n(player.rating);
    current.passes += n(player.passesmade);
    current.passAttempts += n(player.passattempts);
    current.tackles += n(player.tacklesmade);
    current.tackleAttempts += n(player.tackleattempts);
    current.dribbles += n(player.dribbles);
    current.interceptions += n(player.interceptions);
    current.saves += n(player.saves);
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
