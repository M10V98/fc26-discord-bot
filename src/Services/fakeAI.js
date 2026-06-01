const db = require("../Utils/db");

function detectIntent(question) {

    const q =
        question.toLowerCase();

    // Stats

    if (
        q.includes("top scorer") ||
        q.includes("most goals") ||
        q.includes("leading scorer") ||
        q.includes("who scores the most")
    ) {
        return "top_scorer";
    }

    if (
        q.includes("top assists") ||
        q.includes("most assists") ||
        q.includes("assist leader")
    ) {
        return "top_assists";
    }

    if (
        q.includes("highest rating") ||
        q.includes("best rating") ||
        q.includes("best player")
    ) {
        return "highest_rating";
    }

    if (
        q.includes("most matches") ||
        q.includes("most appearances")
    ) {
        return "most_matches";
    }

    if (
        q.includes("most goals and assists")
    ) {
        return "goal_contributions";
    }

    // Help

    if (q.includes("claim")) {
        return "claim_help";
    }

    if (
        q.includes("rating")
    ) {
        return "ratings_help";
    }

    if (
        q.includes("xp") ||
        q.includes("level")
    ) {
        return "xp_help";
    }

    if (
        q.includes("commands")
    ) {
        return "commands_help";
    }

    // Football Knowledge

    if (
        q.includes("offside")
    ) {
        return "offside_help";
    }

    if (
        q.includes("var")
    ) {
        return "var_help";
    }

    if (
        q.includes("xg")
    ) {
        return "xg_help";
    }

    if (
        q.includes("xa")
    ) {
        return "xa_help";
    }

    if (
        q.includes("formation")
    ) {
        return "formation_help";
    }

    if (
        q.includes("gegenpress")
    ) {
        return "gegenpress_help";
    }

    if (
        q.includes("false 9")
    ) {
        return "false9_help";
    }

    if (
        q.includes("clean sheet")
    ) {
        return "clean_sheet_help";
    }

    // Club

    if (
        q.includes("next match") ||
        q.includes("upcoming match")
    ) {
        return "next_match";
    }

    if (
        q.includes("who are you")
    ) {
        return "who_are_you";
    }

    if (
        q.includes("hello") ||
        q.includes("hi bot")
    ) {
        return "hello";
    }

    return "unknown";
}

async function answerQuestion(
    guildId,
    question
) {

    const intent =
        detectIntent(question);

    switch (intent) {

        case "top_scorer": {

            const player =
                await db.get(`
                    SELECT player_name, goals
                    FROM players
                    WHERE guild_id = ?
                    ORDER BY goals DESC
                    LIMIT 1
                `, [guildId]);

            if (!player) {
                return "⚽ No player statistics found.";
            }

            return `⚽ ${player.player_name} is the club's top scorer with ${player.goals} goals.`;
        }

        case "top_assists": {

            const player =
                await db.get(`
                    SELECT player_name, assists
                    FROM players
                    WHERE guild_id = ?
                    ORDER BY assists DESC
                    LIMIT 1
                `, [guildId]);

            if (!player) {
                return "👟 No player statistics found.";
            }

            return `👟 ${player.player_name} leads the club with ${player.assists} assists.`;
        }

        case "highest_rating": {

            const player =
                await db.get(`
                    SELECT player_name,
                    total_rating,
                    matches
                    FROM players
                    WHERE guild_id = ?
                    AND matches > 0
                    ORDER BY
                    (total_rating * 1.0 / matches)
                    DESC
                    LIMIT 1
                `, [guildId]);

            if (!player) {
                return "⭐ No rating data available.";
            }

            const rating =
                (
                    player.total_rating /
                    player.matches
                ).toFixed(2);

            return `⭐ ${player.player_name} has the highest average rating (${rating}).`;
        }

        case "most_matches": {

            const player =
                await db.get(`
                    SELECT player_name,
                    matches
                    FROM players
                    WHERE guild_id = ?
                    ORDER BY matches DESC
                    LIMIT 1
                `, [guildId]);

            if (!player) {
                return "🎮 No match data available.";
            }

            return `🎮 ${player.player_name} has played the most matches (${player.matches}).`;
        }

        case "goal_contributions": {

            const player =
                await db.get(`
                    SELECT
                    player_name,
                    goals,
                    assists,
                    (goals + assists)
                    AS contributions
                    FROM players
                    WHERE guild_id = ?
                    ORDER BY contributions DESC
                    LIMIT 1
                `, [guildId]);

            if (!player) {
                return "⚽ No contribution data available.";
            }

            return `🔥 ${player.player_name} leads the club with ${player.contributions} goal contributions (${player.goals} goals, ${player.assists} assists).`;
        }

        case "claim_help":
            return "📌 Use `/claim` to link your Discord account to your player.";

        case "ratings_help":
            return "⭐ Ratings are calculated from your performances across recorded matches.";

        case "xp_help":
            return "📈 XP is earned through matches and helps increase your level.";

        case "commands_help":
            return "🤖 Popular commands: `/profile`, `/stats`, `/leaderboard`, `/ratings`, `/playerstats`, `/schedule`, `/compplayerstats`, `/claim`.";

        case "next_match":
            return "📅 Use `/schedule` to view upcoming fixtures.";

        case "offside_help":
            return "🚩 A player is offside if they are ahead of the second-last defender when the ball is played to them.";

        case "var_help":
            return "📺 VAR (Video Assistant Referee) helps officials review key decisions such as goals, penalties and red cards.";

        case "xg_help":
            return "📊 xG (Expected Goals) measures the likelihood of a shot becoming a goal.";

        case "xa_help":
            return "🎯 xA (Expected Assists) measures the likelihood of a pass becoming an assist.";

        case "formation_help":
            return "📋 Common formations include 4-3-3, 4-2-3-1, 4-4-2 and 3-5-2.";

        case "gegenpress_help":
            return "🔥 Gegenpressing is a tactic where a team immediately presses to win the ball back after losing possession.";

        case "false9_help":
            return "🎭 A False 9 is a striker who drops deeper into midfield to create space and overload central areas.";

        case "clean_sheet_help":
            return "🧤 A clean sheet means the team conceded zero goals during a match.";

        case "who_are_you":
            return "🤖 I'm your club assistant. I can answer questions about club stats, football concepts and FC26.";

        case "hello":
            return "👋 Hello! Ask me about player stats, football tactics or club records.";

        default: {

            const fallback = [
                "🤖 I don't know that yet.",
                "⚽ Try asking about goals, assists, ratings or football tactics.",
                "📊 Ask me who the top scorer or assist leader is.",
                "🏆 I can help with club statistics and football knowledge."
            ];

            return fallback[
                Math.floor(
                    Math.random() *
                    fallback.length
                )
            ];
        }
    }
}

module.exports = {
    answerQuestion
};