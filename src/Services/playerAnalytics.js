const db = require("../Utils/db");
const eaApi = require("./eaApi");
const {
    refreshAndGetCompetitiveMatches
} = require("./compStats");

function n(value) {
    return Number(value || 0);
}

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function matchType(match, club) {
    return String(
        match.matchType ||
        match.matchtype ||
        club?.matchType ||
        club?.matchtype ||
        ""
    )
        .toLowerCase()
        .replace(/[\s_-]/g, "");
}

function isFriendly(match, club) {
    const type = matchType(match, club);
    return type === "friendlymatch" || type === "friendly";
}

function getOurClub(match, clubId) {
    return match.clubs?.[String(clubId)];
}

function getOpponentClub(match, clubId) {
    return Object.entries(match.clubs || {})
        .find(([id]) => String(id) !== String(clubId))?.[1];
}

function getResult(match, clubId) {
    const our = getOurClub(match, clubId);
    const opponent = getOpponentClub(match, clubId);

    if (!our || !opponent) return null;

    const goalsFor = n(our.goals);
    const goalsAgainst = n(opponent.goals);

    if (goalsFor > goalsAgainst) return "W";
    if (goalsFor < goalsAgainst) return "L";
    return "D";
}

function playerEntry(match, clubId, player) {
    const wantedId = player?.player_id;
    const wantedName = normalize(player?.player_name);
    const players = match.players?.[String(clubId)] || {};

    for (const [playerId, stats] of Object.entries(players)) {
        if (
            wantedId &&
            String(playerId) === String(wantedId)
        ) {
            return {
                playerId,
                stats
            };
        }

        if (
            wantedName &&
            normalize(stats.playername) === wantedName
        ) {
            return {
                playerId,
                stats
            };
        }
    }

    return null;
}

async function getLinkedPlayer(guildId, discordId) {
    return db.get(
        `
        SELECT *
        FROM linked_players
        WHERE guild_id = ?
        AND discord_id = ?
        `,
        [guildId, discordId]
    );
}

async function findLinkedPlayer(guildId, options = {}) {
    if (options.userId) {
        const linked =
            await getLinkedPlayer(guildId, options.userId);

        if (linked) return linked;
    }

    if (options.playerName) {
        return db.get(
            `
            SELECT *
            FROM linked_players
            WHERE guild_id = ?
            AND LOWER(player_name) = LOWER(?)
            `,
            [guildId, options.playerName]
        );
    }

    return null;
}

async function getStoredPlayer(guildId, player) {
    return db.get(
        `
        SELECT *
        FROM players
        WHERE guild_id = ?
        AND (
            player_id = ?
            OR LOWER(player_name) = LOWER(?)
        )
        `,
        [
            guildId,
            player?.player_id,
            player?.player_name
        ]
    );
}

async function getModeMatches(guildId, clubId, mode, options = {}) {
    if (mode === "competitive") {
        return refreshAndGetCompetitiveMatches(
            guildId,
            clubId,
            {
                forceRefresh: Boolean(options.forceRefresh),
                limit: options.limit || 100
            }
        );
    }

    const [league, playoff] = await Promise.all([
        eaApi.getMatches(
            clubId,
            "leagueMatch",
            {
                forceRefresh: Boolean(options.forceRefresh),
                maxResultCount: options.maxResultCount || 100
            }
        ).catch(() => []),
        eaApi.getMatches(
            clubId,
            "playoffMatch",
            {
                forceRefresh: Boolean(options.forceRefresh),
                maxResultCount: options.maxResultCount || 100
            }
        ).catch(() => [])
    ]);

    return [
        ...league,
        ...playoff
    ]
        .filter(match => {
            const our = getOurClub(match, clubId);
            return match?.matchId && !isFriendly(match, our);
        })
        .sort((a, b) => n(b.timestamp) - n(a.timestamp))
        .slice(0, options.limit || 100);
}

function summarizePlayerForm(matches, clubId, player, limit) {
    const rows =
        matches
            .map(match => {
                const entry = playerEntry(match, clubId, player);
                if (!entry) return null;

                return {
                    match,
                    playerId: entry.playerId,
                    rating: n(entry.stats.rating),
                    goals: n(entry.stats.goals),
                    assists: n(entry.stats.assists),
                    result: getResult(match, clubId)
                };
            })
            .filter(Boolean)
            .slice(0, limit);

    const wins = rows.filter(row => row.result === "W").length;
    const losses = rows.filter(row => row.result === "L").length;
    const draws = rows.filter(row => row.result === "D").length;
    const avgRating =
        rows.length
            ? rows.reduce((sum, row) => sum + row.rating, 0) / rows.length
            : 0;
    const latestAvg =
        rows.slice(0, Math.ceil(rows.length / 2))
            .reduce((sum, row, index, arr) => sum + row.rating / arr.length, 0);
    const olderAvg =
        rows.slice(Math.ceil(rows.length / 2))
            .reduce((sum, row, index, arr) => sum + row.rating / arr.length, 0);
    const trend =
        rows.length < 2 || !olderAvg
            ? "\u27A1\uFE0F"
            : latestAvg > olderAvg + 0.1
                ? "\u2B06\uFE0F"
                : latestAvg < olderAvg - 0.1
                    ? "\u2B07\uFE0F"
                    : "\u27A1\uFE0F";

    return {
        rows,
        wins,
        losses,
        draws,
        avgRating,
        trend,
        formLine:
            rows.map(row => row.result || "?").join(" ") || "-"
    };
}

function compareStoredPlayers(playerA, playerB) {
    const stats = player => {
        const matches = n(player?.matches);
        const wins = n(player?.wins);
        const avgRating =
            matches
                ? n(player?.total_rating) / matches
                : 0;

        return {
            goals: n(player?.goals),
            assists: n(player?.assists),
            avgRating,
            winRate:
                matches && wins
                    ? (wins / matches) * 100
                    : 0,
            matches
        };
    };

    return {
        a: stats(playerA),
        b: stats(playerB)
    };
}

function chemistry(matches, clubId, playerA, playerB) {
    const together =
        matches
            .map(match => {
                const a = playerEntry(match, clubId, playerA);
                const b = playerEntry(match, clubId, playerB);

                if (!a || !b) return null;

                return {
                    result: getResult(match, clubId),
                    rating:
                        (n(a.stats.rating) + n(b.stats.rating)) / 2,
                    goalContrib:
                        n(a.stats.goals) +
                        n(a.stats.assists) +
                        n(b.stats.goals) +
                        n(b.stats.assists)
                };
            })
            .filter(Boolean);

    const wins =
        together.filter(row => row.result === "W").length;
    const avgRating =
        together.length
            ? together.reduce((sum, row) => sum + row.rating, 0) / together.length
            : 0;
    const winRate =
        together.length
            ? (wins / together.length) * 100
            : 0;
    const avgContrib =
        together.length
            ? together.reduce((sum, row) => sum + row.goalContrib, 0) / together.length
            : 0;
    const score =
        Math.min(
            100,
            Math.round(
                (winRate * 0.45) +
                (avgRating * 6) +
                (avgContrib * 8)
            )
        );

    return {
        matches: together.length,
        wins,
        winRate,
        avgRating,
        score
    };
}

module.exports = {
    findLinkedPlayer,
    getLinkedPlayer,
    getStoredPlayer,
    getModeMatches,
    summarizePlayerForm,
    compareStoredPlayers,
    chemistry
};
