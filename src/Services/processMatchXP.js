const db = require("../Utils/db");

const archetypes = require("../Utils/archetypes");

const {
    calculateXP,
    getLevelFromXP
} = require("../Utils/xpSystem");

const processingMatches = new Set();

async function processMatchXP(match, guildId, options = {}) {

    const matchId = String(match.id);

    if (processingMatches.has(matchId)) {
        return false;
    }

    processingMatches.add(matchId);

    try {

        const exists = await db.get(
            `SELECT * FROM processed_matches WHERE match_id = ?`,
            [match.id]
        );

        if (exists && !options.force) return false;

        const clubs = match.match_data?.clubs || {};
        const entries = Object.entries(clubs);

        const ourClub = entries.find(
            ([id]) => id === String(match.club_id)
        );

        const oppClub = entries.find(
            ([id]) => id !== String(match.club_id)
        );

        const won =
            Number(ourClub?.[1]?.goals || 0) >
            Number(oppClub?.[1]?.goals || 0);

        for (const [name, p] of Object.entries(match.player_data || {})) {

            const cleanSheet =
                p.cleansheetsdef === "1" ||
                p.cleansheetsgk === "1";

            const xp = calculateXP({
                goals: Number(p.goals),
                assists: Number(p.assists),
                secondAssists: Number(p.secondAssists),
                tackles: Number(p.tacklesmade),
                interceptions: Number(p.interceptions),
                saves: Number(p.saves),
                passes: Number(p.passesmade),
                dribbles: Number(p.dribbles),
                cleanSheet,
                motm: p.mom === "1",
                rating: Number(p.rating),
                win: won
            });

            const existing = await db.get(
                `SELECT * FROM players WHERE player_name = ?`,
                [name]
            );

            const totalXP =
                (existing?.xp || 0) + xp;

            const level =
                getLevelFromXP(totalXP);

            await db.run(`
            INSERT OR REPLACE INTO players (
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
                ?, ?, ?, ?,
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
                COALESCE(?,0)+?,
                ?,
                ?
            )
        `,
            [
                name,
                guildId,
                totalXP,
                level,

                existing?.matches,
                existing?.goals,
                Number(p.goals),

                existing?.assists,
                Number(p.assists),

                existing?.second_assists,
                Number(p.secondAssists),

                existing?.shots,
                Number(p.shots),

                existing?.passes,
                Number(p.passesmade),

                existing?.pass_attempts,
                Number(p.passattempts),

                existing?.tackles,
                Number(p.tacklesmade),

                existing?.tackle_attempts,
                Number(p.tackleattempts),

                existing?.interceptions,
                Number(p.interceptions),

                existing?.dribbles,
                Number(p.dribbles),

                existing?.saves,
                Number(p.saves),

                existing?.clean_sheets,
                cleanSheet ? 1 : 0,

                existing?.motm,
                p.mom === "1" ? 1 : 0,

                existing?.red_cards,
                p.redcards === "1" ? 1 : 0,

                (existing?.total_rating || 0) +
                Number(p.rating),

                archetypes[p.archetypeid] || "Unknown",

                p.pos || "Unknown"
            ]);
        }

        await db.run(
            `INSERT OR IGNORE INTO processed_matches (match_id) VALUES (?)`,
            [match.id]
        );

        return true;

    } finally {
        processingMatches.delete(matchId);
    }
}

module.exports = {
    processMatchXP
};
