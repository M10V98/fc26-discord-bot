const db = require("../Utils/db");

const archetypes = require("../Utils/archetypes");

const {
    calculateXP,
    getLevelFromXP
} = require("../Utils/xpSystem");

const processingMatches = new Set();

function isFriendlyMatch(match, ourClub) {
    const values = [
        match.matchType,
        match.matchtype,
        ourClub?.matchType,
        ourClub?.matchtype
    ];

    return values.some(value => {
        const normalized =
            String(value || "")
                .toLowerCase()
                .replace(/[\s_-]/g, "");

        return normalized === "friendlymatch" || normalized === "friendly";
    });
}

// =========================
// PROCESS MATCH XP
// =========================
//
// Expects EA Pro Clubs match shape:
//   match.matchId, match.timestamp, match.clubs, match.players
// "ourClubId" must be passed in - it's the guild's linked club id.

async function processMatchXP(match, guildId, options = {}) {

    const matchId = String(match.matchId);

    if (!matchId || matchId === "undefined") {
        return false;
    }

    if (processingMatches.has(matchId)) {
        return false;
    }

    processingMatches.add(matchId);

    try {

        const exists = await db.get(
            `SELECT * FROM processed_matches WHERE match_id = ?`,
            [matchId]
        );

        if (exists && !options.force) return false;

        const ourClubId =
            String(
                options.clubId ||
                match.club_id ||
                ""
            );

        if (!ourClubId) {
            return false;
        }

        const ourClub =
            match.clubs?.[ourClubId];

        const oppClubEntry =
            Object.entries(match.clubs || {})
                .find(([id]) => id !== ourClubId);

        const oppClub = oppClubEntry?.[1];

        const ourGoals = Number(ourClub?.goals || 0);
        const oppGoals = Number(oppClub?.goals || 0);
        const won = ourGoals > oppGoals;

        const ourPlayers =
            match.players?.[ourClubId] || {};

        for (const [playerId, p] of Object.entries(ourPlayers)) {

            const cleanSheet =
                p.cleansheetsdef === "1" ||
                p.cleansheetsgk === "1";

            const baseXp = calculateXP({
                goals: Number(p.goals),
                assists: Number(p.assists),
                secondAssists: 0,
                tackles: Number(p.tacklesmade),
                interceptions: 0,
                saves: Number(p.saves),
                passes: Number(p.passesmade),
                dribbles: 0,
                cleanSheet,
                motm: p.mom === "1",
                rating: Number(p.rating),
                win: won
            });

            const xp =
                isFriendlyMatch(match, ourClub)
                    ? baseXp * 2
                    : baseXp;

            const existing = await db.get(
                `
                SELECT * FROM players
                WHERE guild_id = ?
                AND player_id = ?
                `,
                [
                    guildId,
                    playerId
                ]
            );

            const totalXP =
                (existing?.xp || 0) + xp;

            const level =
                getLevelFromXP(totalXP);

            await db.run(`
            INSERT OR REPLACE INTO players (
                player_id,
                player_name,
                guild_id,
                xp,
                level,
                matches,
                goals,
                assists,
                second_assists,
                shots,
                passes,
                pass_attempts,
                tackles,
                tackle_attempts,
                interceptions,
                dribbles,
                saves,
                clean_sheets,
                motm,
                red_cards,
                total_rating,
                archetype,
                position
            )
            VALUES (
                ?, ?, ?, ?, ?,
                COALESCE(?,0)+1,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                COALESCE(?,0)+?,
                ?,
                ?,
                ?
            )
        `,
            [
                playerId,
                p.playername || existing?.player_name || playerId,
                guildId,
                totalXP,
                level,

                existing?.matches,
                existing?.goals,
                Number(p.goals || 0),

                existing?.assists,
                Number(p.assists || 0),

                existing?.second_assists,
                0,

                existing?.shots,
                Number(p.shots || 0),

                existing?.passes,
                Number(p.passesmade || 0),

                existing?.pass_attempts,
                Number(p.passattempts || 0),

                existing?.tackles,
                Number(p.tacklesmade || 0),

                existing?.tackle_attempts,
                Number(p.tackleattempts || 0),

                existing?.interceptions,
                0,

                existing?.dribbles,
                0,

                existing?.saves,
                Number(p.saves || 0),

                existing?.clean_sheets,
                cleanSheet ? 1 : 0,

                existing?.motm,
                p.mom === "1" ? 1 : 0,

                existing?.red_cards,
                p.redcards === "1" ? 1 : 0,

                (existing?.total_rating || 0) +
                Number(p.rating || 0),

                archetypes[p.archetypeid] || "Unknown",

                p.pos || "Unknown"
            ]);
        }

        await db.run(
            `INSERT OR IGNORE INTO processed_matches (match_id) VALUES (?)`,
            [matchId]
        );

        return true;

    } finally {
        processingMatches.delete(matchId);
    }
}

module.exports = {
    processMatchXP
};
