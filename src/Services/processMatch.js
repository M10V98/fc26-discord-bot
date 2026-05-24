const db =
    require("../Utils/db");

const archetypes =
    require("../Utils/archetypes");

const {
    calculateXP,
    getLevelFromXP
} = require("../Utils/xpSystem");

async function processMatch(match) {

    try {

        const processed =
            await db.get(
                `
                SELECT *
                FROM processed_matches
                WHERE match_id = ?
                `,
                [match.id]
            );

        if (processed) {
            return;
        }

        const playerData =
            match.player_data || {};

        const clubs =
            match.match_data?.clubs || {};

        const teams =
            Object.values(clubs);

        if (teams.length < 2) {
            return;
        }

        const home =
            teams[0];

        const away =
            teams[1];

        let ourClub;
        let opponent;

        if (
            String(match.club_id) ===
            String(Object.keys(clubs)[0])
        ) {

            ourClub = home;
            opponent = away;

        } else {

            ourClub = away;
            opponent = home;
        }

        const gf =
            Number(ourClub.goals);

        const ga =
            Number(opponent.goals);

        const won =
            gf > ga;

        // =========================
        // PLAYERS
        // =========================

        for (const [name, stats] of Object.entries(playerData)) {

            const goals =
                Number(stats.goals || 0);

            const assists =
                Number(stats.assists || 0);

            const rating =
                Number(stats.rating || 0);

            const passes =
                Number(stats.passesmade || 0);

            const passAttempts =
                Number(stats.passattempts || 0);

            const tackles =
                Number(stats.tacklesmade || 0);

            const tackleAttempts =
                Number(stats.tackleattempts || 0);

            const interceptions =
                Number(stats.interceptions || 0);

            const dribbles =
                Number(stats.dribbles || 0);

            const saves =
                Number(stats.saves || 0);

            const shots =
                Number(stats.shots || 0);

            const redCards =
                Number(stats.redcards || 0);

            const motm =
                Number(stats.mom || 0);

            const cleanSheet =
                stats.cleansheetsdef === "1" ||
                stats.cleansheetsgk === "1";

            // =========================
            // XP
            // =========================

            const xp =
                calculateXP({

                    goals,
                    assists,
                    tackles,
                    saves,
                    cleanSheet,
                    win: won,
                    rating,
                    passes,
                    interceptions,
                    dribbles
                });

            // =========================
            // UPSERT PLAYER
            // =========================

            await db.run(
                `
                INSERT INTO players (

                    player_name,
                    matches,
                    goals,
                    assists,
                    shots,
                    passes,
                    pass_attempts,
                    tackles,
                    tackle_attempts,
                    interceptions,
                    dribbles,
                    saves,
                    clean_sheets,
                    red_cards,
                    motm,
                    total_rating,
                    xp,
                    level,
                    archetype

                )

                VALUES (
                    ?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                )

                ON CONFLICT(player_name)
                DO UPDATE SET

                    matches = matches + 1,
                    goals = goals + excluded.goals,
                    assists = assists + excluded.assists,
                    shots = shots + excluded.shots,
                    passes = passes + excluded.passes,
                    pass_attempts = pass_attempts + excluded.pass_attempts,
                    tackles = tackles + excluded.tackles,
                    tackle_attempts = tackle_attempts + excluded.tackle_attempts,
                    interceptions = interceptions + excluded.interceptions,
                    dribbles = dribbles + excluded.dribbles,
                    saves = saves + excluded.saves,
                    clean_sheets = clean_sheets + excluded.clean_sheets,
                    red_cards = red_cards + excluded.red_cards,
                    motm = motm + excluded.motm,
                    total_rating = total_rating + excluded.total_rating,
                    xp = xp + excluded.xp
                `,
                [

                    name,
                    goals,
                    assists,
                    shots,
                    passes,
                    passAttempts,
                    tackles,
                    tackleAttempts,
                    interceptions,
                    dribbles,
                    saves,
                    cleanSheet ? 1 : 0,
                    redCards,
                    motm,
                    rating,
                    xp,
                    1,
                    archetypes[
                        stats.archetypeid
                    ] || "Unknown"
                ]
            );

            // =========================
            // UPDATE LEVEL
            // =========================

            const updated =
                await db.get(
                    `
                    SELECT xp
                    FROM players
                    WHERE player_name = ?
                    `,
                    [name]
                );

            const level =
                getLevelFromXP(updated.xp);

            await db.run(
                `
                UPDATE players
                SET level = ?
                WHERE player_name = ?
                `,
                [level, name]
            );
        }

        // =========================
        // STORE MATCH
        // =========================

        await db.run(
            `
            INSERT INTO processed_matches
            (match_id)
            VALUES (?)
            `,
            [match.id]
        );

        console.log(
            `✅ Processed match ${match.id}`
        );

    } catch (err) {

        console.error(
            "❌ processMatch error:",
            err
        );
    }
}

module.exports = {
    processMatch
};
