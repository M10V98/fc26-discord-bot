const db = require("../Utils/db");
const {
    snapshotLegacyClubStats,
    snapshotLegacyPlayerStats
} = require("./legacyStats");

const CUTOVER_KEY = "fc27_cutover_v1";

async function startFc27Season() {
    const complete = await db.get(
        `SELECT value FROM schema_meta WHERE key = ?`,
        [CUTOVER_KEY]
    );

    if (complete) {
        return false;
    }

    await snapshotLegacyPlayerStats();
    await snapshotLegacyClubStats();

    // These rows all describe FC 26's live state. Historical player and
    // friendly-match totals have been retained in the legacy tables above.
    for (const table of [
        "guild_clubs",
        "clubs",
        "automode",
        "xp_seasons",
        "processed_matches",
        "comp_matches",
        "matches"
    ]) {
        await db.run(`DELETE FROM ${table}`);
    }

    await db.run(
        `
        UPDATE players
        SET
            xp = 0,
            all_time_xp = 0,
            season_xp = 0,
            level = 1,
            matches = 0,
            goals = 0,
            assists = 0,
            second_assists = 0,
            shots = 0,
            saves = 0,
            passes = 0,
            pass_attempts = 0,
            tackles = 0,
            tackle_attempts = 0,
            interceptions = 0,
            dribbles = 0,
            clean_sheets = 0,
            motm = 0,
            red_cards = 0,
            total_rating = 0,
            position_counts = '{}'
        `
    );

    await db.run(
        `INSERT INTO schema_meta (key, value) VALUES (?, ?)`,
        [CUTOVER_KEY, String(Date.now())]
    );

    console.log(
        "FC 27 cutover complete: archived legacy stats and removed all FC 26 live club links."
    );

    return true;
}

module.exports = { startFc27Season };
