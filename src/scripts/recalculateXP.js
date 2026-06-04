const db = require("../Utils/db");
const {
    calculateXPBreakdown,
    getLevelFromXP
} = require("../Utils/xpSystem");

function n(value) {
    return Number(value || 0);
}

async function quizXpForPlayer(player) {
    const row =
        await db.get(
            `
            SELECT COALESCE(SUM(q.xp_awarded), 0) AS xp
            FROM quiz_scores q
            JOIN linked_players l
              ON l.guild_id = q.guild_id
             AND l.discord_id = q.user_id
            WHERE l.guild_id = ?
            AND (
                l.player_id = ?
                OR LOWER(l.player_name) = LOWER(?)
            )
            `,
            [
                player.guild_id,
                player.player_id,
                player.player_name
            ]
        );

    return n(row?.xp);
}

async function main() {
    await db.init();

    const players =
        await db.all(
            `
            SELECT *
            FROM players
            ORDER BY guild_id, player_name
            `
        );

    let updated = 0;
    let beforeTotal = 0;
    let afterTotal = 0;

    for (const player of players) {
        const matchXp =
            calculateXPBreakdown(player).total;
        const quizXp =
            await quizXpForPlayer(player);
        const totalXp =
            Math.max(
                0,
                Math.floor(matchXp + quizXp)
            );
        const before =
            n(player.xp);
        const level =
            getLevelFromXP(totalXp);

        beforeTotal += before;
        afterTotal += totalXp;

        await db.run(
            `
            UPDATE players
            SET xp = ?,
                season_xp = ?,
                all_time_xp = ?,
                level = ?
            WHERE guild_id = ?
            AND player_id = ?
            `,
            [
                totalXp,
                totalXp,
                totalXp,
                level,
                player.guild_id,
                player.player_id
            ]
        );

        updated += 1;

        console.log(
            `${player.guild_id} ${player.player_name || player.player_id}: ${before} -> ${totalXp} XP (${matchXp} match + ${quizXp} quiz), level ${level}`
        );
    }

    console.log(
        `Recalculated ${updated} players. Total XP ${beforeTotal} -> ${afterTotal}.`
    );

    await db.close();
}

main().catch(async err => {
    console.error("XP recalculation failed:", err);
    await db.close().catch(() => null);
    process.exit(1);
});
