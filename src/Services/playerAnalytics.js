const db = require("../Utils/db");
const eaApi = require("./eaApi");
const {
    refreshAndGetCompetitiveMatches
} = require("./compStats");
const {
    saves: saveCount
} = require("../Utils/apiStats");

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
                    stats: entry.stats,
                    rating: n(entry.stats.rating),
                    goals: n(entry.stats.goals),
                    assists: n(entry.stats.assists),
                    result: getResult(match, clubId),
                    goalsFor: n(getOurClub(match, clubId)?.goals),
                    goalsAgainst: n(getOpponentClub(match, clubId)?.goals)
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

function aggregateFormStats(rows) {
    const aggregate = {
        gamesPlayed: rows.length,
        manOfTheMatch: 0,
        ratingTotal: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        passesMade: 0,
        passAttempts: 0,
        tacklesMade: 0,
        tackleAttempts: 0,
        saves: 0,
        cleanSheetsDef: 0,
        cleanSheetsGK: 0,
        redCards: 0
    };

    for (const row of rows || []) {
        const stats = row.stats || {};

        aggregate.manOfTheMatch += stats.mom === "1" ? 1 : 0;
        aggregate.ratingTotal += n(stats.rating);
        aggregate.wins += row.result === "W" ? 1 : 0;
        aggregate.losses += row.result === "L" ? 1 : 0;
        aggregate.draws += row.result === "D" ? 1 : 0;
        aggregate.goals += n(stats.goals);
        aggregate.assists += n(stats.assists);
        aggregate.shots += n(stats.shots);
        aggregate.passesMade += n(stats.passesmade);
        aggregate.passAttempts += n(stats.passattempts);
        aggregate.tacklesMade += n(stats.tacklesmade);
        aggregate.tackleAttempts += n(stats.tackleattempts);
        aggregate.saves += saveCount(stats);
        aggregate.cleanSheetsDef += stats.cleansheetsdef === "1" ? 1 : 0;
        aggregate.cleanSheetsGK += stats.cleansheetsgk === "1" ? 1 : 0;
        aggregate.redCards += stats.redcards === "1" ? 1 : 0;
    }

    return {
        ...aggregate,
        ratingAve:
            aggregate.gamesPlayed
                ? aggregate.ratingTotal / aggregate.gamesPlayed
                : 0,
        winRate:
            aggregate.gamesPlayed
                ? (aggregate.wins / aggregate.gamesPlayed) * 100
                : 0,
        shotSuccessRate:
            aggregate.shots
                ? (aggregate.goals / aggregate.shots) * 100
                : 0,
        passSuccessRate:
            aggregate.passAttempts
                ? (aggregate.passesMade / aggregate.passAttempts) * 100
                : 0,
        tackleSuccessRate:
            aggregate.tackleAttempts
                ? (aggregate.tacklesMade / aggregate.tackleAttempts) * 100
                : 0
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
            goalContributions:
                n(player?.goals) + n(player?.assists),
            secondAssists: n(player?.second_assists),
            shots: n(player?.shots),
            saves: n(player?.saves),
            passes: n(player?.passes),
            passAttempts: n(player?.pass_attempts),
            tackles: n(player?.tackles),
            tackleAttempts: n(player?.tackle_attempts),
            interceptions: n(player?.interceptions),
            dribbles: n(player?.dribbles),
            cleanSheets: n(player?.clean_sheets),
            motm: n(player?.motm),
            redCards: n(player?.red_cards),
            xp: n(player?.xp),
            level: n(player?.level),
            avgRating,
            winRate:
                matches && wins
                    ? (wins / matches) * 100
                    : 0,
            wins,
            losses: n(player?.losses),
            draws: n(player?.draws),
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

                const goalsFor = n(getOurClub(match, clubId)?.goals);
                const goalsAgainst = n(getOpponentClub(match, clubId)?.goals);
                const goals =
                    n(a.stats.goals) +
                    n(b.stats.goals);
                const assists =
                    n(a.stats.assists) +
                    n(b.stats.assists);

                return {
                    result: getResult(match, clubId),
                    goalsFor,
                    goalsAgainst,
                    rating:
                        (n(a.stats.rating) + n(b.stats.rating)) / 2,
                    goals,
                    assists,
                    goalContrib: goals + assists,
                    motm:
                        a.stats.mom === "1" ||
                        b.stats.mom === "1",
                    cleanSheet:
                        goalsAgainst === 0
                };
            })
            .filter(Boolean);

    const wins =
        together.filter(row => row.result === "W").length;
    const losses =
        together.filter(row => row.result === "L").length;
    const draws =
        together.filter(row => row.result === "D").length;
    const goals =
        together.reduce((sum, row) => sum + row.goals, 0);
    const assists =
        together.reduce((sum, row) => sum + row.assists, 0);
    const goalContrib =
        goals + assists;
    const goalsFor =
        together.reduce((sum, row) => sum + row.goalsFor, 0);
    const goalsAgainst =
        together.reduce((sum, row) => sum + row.goalsAgainst, 0);
    const cleanSheets =
        together.filter(row => row.cleanSheet).length;
    const motm =
        together.filter(row => row.motm).length;
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
            ? goalContrib / together.length
            : 0;
    const cleanSheetRate =
        together.length
            ? (cleanSheets / together.length) * 100
            : 0;
    const score =
        Math.min(
            100,
            Math.round(
                (winRate * 0.38) +
                (avgRating * 5.5) +
                (avgContrib * 8) +
                (cleanSheetRate * 0.12)
            )
        );

    return {
        matches: together.length,
        wins,
        losses,
        draws,
        winRate,
        avgRating,
        goals,
        assists,
        goalContrib,
        avgContrib,
        goalsFor,
        goalsAgainst,
        goalsForPerMatch:
            together.length ? goalsFor / together.length : 0,
        goalsAgainstPerMatch:
            together.length ? goalsAgainst / together.length : 0,
        cleanSheets,
        cleanSheetRate,
        motm,
        bestCombinedRating:
            together.length
                ? Math.max(...together.map(row => row.rating))
                : 0,
        formLine:
            together.slice(0, 10).map(row => row.result || "?").join(" ") || "-",
        score
    };
}

module.exports = {
    findLinkedPlayer,
    getLinkedPlayer,
    getStoredPlayer,
    getModeMatches,
    summarizePlayerForm,
    aggregateFormStats,
    compareStoredPlayers,
    chemistry
};
