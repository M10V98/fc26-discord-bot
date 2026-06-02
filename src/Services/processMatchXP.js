const db = require("../Utils/db");
const eaApi = require("./eaApi");

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

function normalizeMatchType(match, ourClub) {
    return String(
        match.matchType ||
        match.matchtype ||
        ourClub?.matchType ||
        ourClub?.matchtype ||
        ""
    )
        .toLowerCase()
        .replace(/[\s_-]/g, "");
}

function getOverallStatsRow(overallStats, clubId) {
    if (Array.isArray(overallStats)) {
        return overallStats.find(row =>
            String(row.clubId) === String(clubId)
        ) || overallStats[0];
    }

    return overallStats;
}

function getFinishCount(overallStats) {
    return Object.entries(overallStats || {})
        .filter(([key]) =>
            /^finishesInDivision\d+Group\d+$/.test(key)
        )
        .reduce(
            (total, [, value]) => total + Number(value || 0),
            0
        );
}

async function getSeasonStats(clubId, options = {}) {
    if (options.overallStats) {
        return getOverallStatsRow(
            options.overallStats,
            clubId
        );
    }

    const overallStats =
        await eaApi.getOverallStats(
            clubId,
            {
                forceRefresh: Boolean(options.forceRefreshSeasonStats)
            }
        );

    return getOverallStatsRow(
        overallStats,
        clubId
    );
}

async function updateSeasonState(guildId, clubId, match, ourClub, options = {}) {
    const matchType =
        normalizeMatchType(match, ourClub);
    const timestamp =
        Number(match.timestamp || 0);
    const seasonStats =
        await getSeasonStats(clubId, options).catch(err => {
            console.error(
                "season stats fetch failed:",
                err.message
            );
            return null;
        });
    const finishCount =
        getFinishCount(seasonStats);
    const existing =
        await db.get(
            `
            SELECT *
            FROM xp_seasons
            WHERE guild_id = ?
            AND club_id = ?
            `,
            [
                guildId,
                String(clubId)
            ]
        );

    if (
        existing &&
        timestamp &&
        Number(existing.last_match_timestamp || 0) > timestamp
    ) {
        return existing;
    }

    const shouldStartNewSeason =
        existing &&
        finishCount > Number(existing.last_finish_count || 0);
    const seasonNumber =
        Number(existing?.season_number || 1) +
        (shouldStartNewSeason ? 1 : 0);

    if (shouldStartNewSeason) {
        await db.run(
            `
            UPDATE players
            SET season_xp = 0,
                xp = 0
            WHERE guild_id = ?
            `,
            [guildId]
        );
    }

    await db.run(
        `
        INSERT OR REPLACE INTO xp_seasons
        (
            guild_id,
            club_id,
            season_number,
            last_match_type,
            last_match_timestamp,
            last_finish_count,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            guildId,
            String(clubId),
            seasonNumber,
            matchType,
            timestamp,
            Math.max(
                finishCount,
                Number(existing?.last_finish_count || 0)
            ),
            Date.now()
        ]
    );

    return {
        season_number: seasonNumber,
        last_match_type: matchType,
        last_finish_count: finishCount
    };
}

function readPositionCounts(value) {
    try {
        const parsed = JSON.parse(value || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writePositionCounts(existing, position) {
    const counts = readPositionCounts(existing);
    const key = String(position || "Unknown");

    counts[key] = Number(counts[key] || 0) + 1;

    return JSON.stringify(counts);
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

        await updateSeasonState(
            guildId,
            ourClubId,
            match,
            ourClub,
            options
        );

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

            const allTimeXP =
                Number(existing?.all_time_xp || existing?.xp || 0) + xp;
            const seasonXP =
                Number(existing?.season_xp || existing?.xp || 0) + xp;

            const level =
                getLevelFromXP(allTimeXP);
            const positionCounts =
                writePositionCounts(
                    existing?.position_counts,
                    p.pos || "Unknown"
                );

            await db.run(`
            INSERT OR REPLACE INTO players (
                player_id,
                player_name,
                guild_id,
                xp,
                all_time_xp,
                season_xp,
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
                position_counts,
                archetype,
                position
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?,
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
                ?,
                ?
            )
        `,
            [
                playerId,
                p.playername || existing?.player_name || playerId,
                guildId,
                seasonXP,
                allTimeXP,
                seasonXP,
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

                positionCounts,

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
