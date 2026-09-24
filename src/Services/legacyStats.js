const db = require("../Utils/db");

function number(value) {
    return Number(value || 0);
}

function isFriendly(match, club) {
    const type = String(
        match?.matchType ||
        match?.matchtype ||
        club?.matchType ||
        club?.matchtype ||
        ""
    )
        .toLowerCase()
        .replace(/[\s_-]/g, "");

    return type === "friendly" || type === "friendlymatch";
}

function emptyClubStats() {
    return {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goals_for: 0,
        goals_against: 0
    };
}

function addFriendlyMatch(totals, match, clubId) {
    const club = match?.clubs?.[String(clubId)];

    if (!club || !isFriendly(match, club)) {
        return totals;
    }

    const opponent = Object.entries(match.clubs || {})
        .find(([id]) => String(id) !== String(clubId))?.[1];

    if (!opponent) {
        return totals;
    }

    const goalsFor = number(club.goals);
    const goalsAgainst = number(opponent.goals);

    totals.games += 1;
    totals.goals_for += goalsFor;
    totals.goals_against += goalsAgainst;

    if (goalsFor > goalsAgainst) totals.wins += 1;
    else if (goalsFor < goalsAgainst) totals.losses += 1;
    else totals.draws += 1;

    return totals;
}

async function getStoredFriendlyStats(guildId) {
    const rows = await db.all(
        `
        SELECT club_id, match_json
        FROM comp_matches
        WHERE guild_id = ?
        `,
        [guildId]
    );
    const totals = emptyClubStats();

    for (const row of rows) {
        try {
            addFriendlyMatch(
                totals,
                JSON.parse(row.match_json),
                row.club_id
            );
        } catch (err) {
            console.warn("Skipping unreadable stored friendly match:", err.message);
        }
    }

    return totals;
}

async function snapshotLegacyClubStats() {
    const guildRows = await db.all(
        `SELECT DISTINCT guild_id FROM comp_matches`
    );

    for (const { guild_id: guildId } of guildRows) {
        const totals = await getStoredFriendlyStats(guildId);

        await db.run(
            `
            INSERT OR REPLACE INTO legacy_club_stats
            (guild_id, games, wins, losses, draws, goals_for, goals_against)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                guildId,
                totals.games,
                totals.wins,
                totals.losses,
                totals.draws,
                totals.goals_for,
                totals.goals_against
            ]
        );
    }
}

async function snapshotLegacyPlayerStats() {
    await db.run(
        `
        INSERT OR REPLACE INTO legacy_player_stats
        (
            guild_id, player_id, player_name, matches, goals, assists,
            second_assists, shots, saves, passes, tackles, interceptions,
            dribbles, clean_sheets, motm, total_rating, all_time_xp
        )
        SELECT
            guild_id, player_id, player_name, matches, goals, assists,
            second_assists, shots, saves, passes, tackles, interceptions,
            dribbles, clean_sheets, motm, total_rating, all_time_xp
        FROM players
        WHERE
            COALESCE(matches, 0) > 0 OR
            COALESCE(goals, 0) > 0 OR
            COALESCE(assists, 0) > 0
        `
    );
}

async function getAllTimePlayerStats(guildId) {
    return db.all(
        `
        SELECT
            player_id,
            MAX(player_name) AS player_name,
            SUM(matches) AS matches,
            SUM(goals) AS goals,
            SUM(assists) AS assists,
            SUM(second_assists) AS second_assists,
            SUM(shots) AS shots,
            SUM(saves) AS saves,
            SUM(passes) AS passes,
            SUM(tackles) AS tackles,
            SUM(interceptions) AS interceptions,
            SUM(dribbles) AS dribbles,
            SUM(clean_sheets) AS clean_sheets,
            SUM(motm) AS motm,
            SUM(total_rating) AS total_rating,
            SUM(all_time_xp) AS all_time_xp
        FROM (
            SELECT * FROM legacy_player_stats WHERE guild_id = ?
            UNION ALL
            SELECT
                guild_id, player_id, player_name, matches, goals, assists,
                second_assists, shots, saves, passes, tackles, interceptions,
                dribbles, clean_sheets, motm, total_rating, all_time_xp
            FROM players
            WHERE guild_id = ?
        )
        GROUP BY player_id
        `,
        [guildId, guildId]
    );
}

async function getAllTimeFriendlyClubStats(guildId) {
    const [legacy, current] = await Promise.all([
        db.get(
            `SELECT * FROM legacy_club_stats WHERE guild_id = ?`,
            [guildId]
        ),
        getStoredFriendlyStats(guildId)
    ]);
    const totals = emptyClubStats();

    for (const key of Object.keys(totals)) {
        totals[key] = number(legacy?.[key]) + number(current[key]);
    }

    return totals;
}

module.exports = {
    getAllTimeFriendlyClubStats,
    getAllTimePlayerStats,
    snapshotLegacyClubStats,
    snapshotLegacyPlayerStats
};
