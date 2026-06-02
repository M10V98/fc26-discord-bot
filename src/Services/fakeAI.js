const db = require("../Utils/db");
 
function hasAny(text, words) {
    return words.some(word => text.includes(word));
}
 
function detectIntent(question) {
 
    const q = question.toLowerCase();
 
    // Stats
 
    if (hasAny(q, [
        "top scorer",
        "leading scorer",
        "most goals",
        "goal leader",
        "best scorer",
        "who scores the most",
        "highest goals",
        "top goalscorer",
        "best goalscorer",
        "who has most goals"
    ])) {
        return "top_scorer";
    }
 
    if (hasAny(q, [
        "top assists",
        "most assists",
        "assist leader",
        "most assisted",
        "who has most assists",
        "best assist",
        "highest assists",
        "assist king"
    ])) {
        return "top_assists";
    }
 
    if (hasAny(q, [
        "highest rating",
        "best rating",
        "best player",
        "top rated",
        "highest rated",
        "best average rating",
        "who has best rating",
        "top performer"
    ])) {
        return "highest_rating";
    }
 
    if (hasAny(q, [
        "most matches",
        "most appearances",
        "most games",
        "who played most",
        "most games played",
        "highest appearances",
        "most caps"
    ])) {
        return "most_matches";
    }
 
    if (hasAny(q, [
        "most goals and assists",
        "goal contributions",
        "goals and assists",
        "most contributions",
        "combined goals",
        "top contributor"
    ])) {
        return "goal_contributions";
    }
 
    // Help
 
    if (hasAny(q, [
        "claim",
        "link my account",
        "link account",
        "how do i claim",
        "register",
        "how to claim"
    ])) {
        return "claim_help";
    }
 
    if (hasAny(q, [
        "rating",
        "how are ratings",
        "how is rating",
        "what is rating",
        "rating system",
        "how ratings work"
    ])) {
        return "ratings_help";
    }
 
    if (hasAny(q, [
        "xp",
        "level",
        "experience",
        "how do i level",
        "level up",
        "how to get xp"
    ])) {
        return "xp_help";
    }
 
    if (hasAny(q, [
        "commands",
        "what can you do",
        "list commands",
        "available commands",
        "help commands",
        "what commands"
    ])) {
        return "commands_help";
    }
 
    // Football Knowledge
 
    if (hasAny(q, [
        "offside",
        "offside rule",
        "what is offside",
        "how does offside work"
    ])) {
        return "offside_help";
    }
 
    if (hasAny(q, [
        "var",
        "video assistant",
        "video review",
        "what is var",
        "how does var work"
    ])) {
        return "var_help";
    }
 
    if (hasAny(q, [
        "xg",
        "expected goals",
        "what is xg",
        "how is xg"
    ])) {
        return "xg_help";
    }
 
    if (hasAny(q, [
        "xa",
        "expected assists",
        "what is xa",
        "how is xa"
    ])) {
        return "xa_help";
    }
 
    if (hasAny(q, [
        "xt",
        "expected threat",
        "what is xt"
    ])) {
        return "xt_help";
    }
 
    if (hasAny(q, [
        "formation",
        "what formation",
        "best formation",
        "tactical setup",
        "team shape"
    ])) {
        return "formation_help";
    }
 
    if (hasAny(q, [
        "gegenpress",
        "gegenpressing",
        "counter press",
        "what is gegenpress"
    ])) {
        return "gegenpress_help";
    }
 
    if (hasAny(q, [
        "false 9",
        "false nine",
        "what is a false 9",
        "false9"
    ])) {
        return "false9_help";
    }
 
    if (hasAny(q, [
        "clean sheet",
        "shutout",
        "kept a clean sheet",
        "what is a clean sheet",
        "no goals conceded"
    ])) {
        return "clean_sheet_help";
    }
 
    if (hasAny(q, [
        "tiki taka",
        "tiki-taka",
        "tikitaka",
        "what is tiki taka",
        "possession football"
    ])) {
        return "tiki_taka";
    }
 
    if (hasAny(q, [
        "low block",
        "what is a low block",
        "sit deep",
        "defensive block",
        "parking the bus"
    ])) {
        return "low_block";
    }
 
    if (hasAny(q, [
        "high press",
        "pressing high",
        "what is high press",
        "press high"
    ])) {
        return "high_press";
    }
 
    if (hasAny(q, [
        "captain",
        "club captain",
        "who is the captain",
        "armband"
    ])) {
        return "captain";
    }
 
    if (hasAny(q, [
        "winger",
        "what is a winger",
        "wide player",
        "wide forward"
    ])) {
        return "winger";
    }
 
    if (hasAny(q, [
        "striker",
        "what is a striker",
        "centre forward",
        "number 9",
        "no 9"
    ])) {
        return "striker";
    }
 
    if (hasAny(q, [
        "goalkeeper",
        "what does a goalkeeper do",
        "gk",
        "keeper"
    ])) {
        return "goalkeeper";
    }
 
    if (hasAny(q, [
        "playmaker",
        "what is a playmaker",
        "number 10",
        "no 10",
        "creative midfielder"
    ])) {
        return "playmaker";
    }
 
    if (hasAny(q, [
        "ball winning midfielder",
        "ball-winning",
        "defensive midfielder",
        "what is a ball winning",
        "cdm",
        "holding midfielder"
    ])) {
        return "ball_winning_midfielder";
    }
 
    if (hasAny(q, [
        "box to box",
        "box-to-box",
        "what is box to box",
        "complete midfielder"
    ])) {
        return "box_to_box";
    }
 
    if (hasAny(q, [
        "sweeper keeper",
        "sweeper-keeper",
        "what is a sweeper keeper",
        "libero keeper"
    ])) {
        return "sweeper_keeper";
    }
 
    if (hasAny(q, [
        "champions league",
        "ucl",
        "what is the champions league",
        "european cup"
    ])) {
        return "champions_league";
    }
 
    if (hasAny(q, [
        "premier league",
        "epl",
        "what is the premier league",
        "english top flight"
    ])) {
        return "premier_league";
    }
 
    if (hasAny(q, [
        "world cup",
        "fifa world cup",
        "what is the world cup"
    ])) {
        return "world_cup";
    }
 
    if (hasAny(q, [
        "euros",
        "european championship",
        "euro 2024",
        "what are the euros"
    ])) {
        return "euros";
    }
 
    if (hasAny(q, [
        "fc26 clubs",
        "fc 26 clubs",
        "pro clubs",
        "clubs mode",
        "what is clubs"
    ])) {
        return "fc26_clubs";
    }
 
    if (hasAny(q, [
        "ultimate team",
        "fut",
        "what is ultimate team",
        "what is fut"
    ])) {
        return "ultimate_team";
    }
 
    if (hasAny(q, [
        "playstyles",
        "play styles",
        "what are playstyles",
        "fc26 playstyles",
        "playstyle+"
    ])) {
        return "playstyles";
    }
 
    if (hasAny(q, [
        "chemistry",
        "what is chemistry",
        "squad chemistry",
        "how does chemistry work"
    ])) {
        return "chemistry";
    }
 
    if (hasAny(q, [
        "evolutions",
        "what are evolutions",
        "evolve player",
        "player evolution"
    ])) {
        return "evolutions";
    }
 
    if (hasAny(q, [
        "packs",
        "what are packs",
        "open packs",
        "pack luck"
    ])) {
        return "packs";
    }
 
    if (hasAny(q, [
        "transfer market",
        "transfer window",
        "buy players",
        "sell players",
        "player market"
    ])) {
        return "transfer_market";
    }
 
    // Club
 
    if (hasAny(q, [
        "next match",
        "upcoming match",
        "next game",
        "when do we play",
        "next fixture",
        "upcoming fixture"
    ])) {
        return "next_match";
    }
 
    if (hasAny(q, [
        "who are you",
        "what are you",
        "what can you do",
        "about you"
    ])) {
        return "who_are_you";
    }
 
    if (hasAny(q, [
        "hello",
        "hi bot",
        "hey",
        "hi there",
        "morning",
        "good morning",
        "alright bot"
    ])) {
        return "hello";
    }
 
    return "unknown";
}

function shouldReplyAutomatically(question, options = {}) {
    const text = String(question || "").trim();

    if (text.length < 8) {
        return false;
    }

    const intent =
        detectIntent(text);

    if (intent === "unknown") {
        return false;
    }

    const directBotCue =
        /\b(bot|ourproclub|assistant)\b/i.test(text) ||
        text.includes("?");
    const chance =
    directBotCue
        ? options.directChance ?? 0.75
        : options.passiveChance ?? 0.30;

    return Math.random() < chance;
}

async function answerAutoMessage(guildId, message) {
    const text =
        String(message || "").trim();

    if (!shouldReplyAutomatically(text)) {
        return null;
    }

    const intent =
        detectIntent(text);

    if (intent === "unknown") {
        return null;
    }

    return answerQuestion(guildId, text);
}
 
async function answerQuestion(guildId, question) {
 
    const intent = detectIntent(question);
 
    switch (intent) {
 
        case "top_scorer": {
 
            const player = await db.get(`
                SELECT player_name, goals
                FROM players
                WHERE guild_id = ?
                ORDER BY goals DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "⚽ No player statistics found.";
 
            return `⚽ ${player.player_name} is the club's top scorer with ${player.goals} goals.`;
        }
 
        case "top_assists": {
 
            const player = await db.get(`
                SELECT player_name, assists
                FROM players
                WHERE guild_id = ?
                ORDER BY assists DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "👟 No player statistics found.";
 
            return `👟 ${player.player_name} leads the club with ${player.assists} assists.`;
        }
 
        case "highest_rating": {
 
            const player = await db.get(`
                SELECT player_name, total_rating, matches
                FROM players
                WHERE guild_id = ?
                AND matches > 0
                ORDER BY (total_rating * 1.0 / matches) DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "⭐ No rating data available.";
 
            const rating = (player.total_rating / player.matches).toFixed(2);
 
            return `⭐ ${player.player_name} has the highest average rating (${rating}).`;
        }
 
        case "most_matches": {
 
            const player = await db.get(`
                SELECT player_name, matches
                FROM players
                WHERE guild_id = ?
                ORDER BY matches DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "🎮 No match data available.";
 
            return `🎮 ${player.player_name} has played the most matches (${player.matches}).`;
        }
 
        case "goal_contributions": {
 
            const player = await db.get(`
                SELECT player_name, goals, assists, (goals + assists) AS contributions
                FROM players
                WHERE guild_id = ?
                ORDER BY contributions DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "⚽ No contribution data available.";
 
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
            return "📊 xG (Expected Goals) measures the likelihood of a shot becoming a goal based on factors like distance and angle.";
 
        case "xa_help":
            return "🎯 xA (Expected Assists) measures the likelihood of a pass leading to a goal.";
 
        case "xt_help":
            return "📈 xT (Expected Threat) measures how much a move increases a team's likelihood of scoring.";
 
        case "formation_help":
            return "📋 Common formations include 4-3-3, 4-2-3-1, 4-4-2 and 3-5-2. Each suits different styles of play.";
 
        case "gegenpress_help":
            return "🔥 Gegenpressing is a tactic where a team immediately presses to win the ball back after losing possession. Popularised by Jürgen Klopp.";
 
        case "false9_help":
            return "🎭 A False 9 is a striker who drops deeper into midfield to create space and overload central areas.";
 
        case "clean_sheet_help":
            return "🧤 A clean sheet means the team conceded zero goals during a match.";
 
        case "tiki_taka":
            return "⚽ Tiki-taka is a style of play based on short passing, high possession and constant movement. Associated with Barcelona and Spain.";
 
        case "low_block":
            return "🛡️ A low block keeps players deep and compact to deny the opposition space. Also known as parking the bus.";
 
        case "high_press":
            return "🔥 A high press attempts to win the ball back close to the opponent's goal by applying immediate pressure.";
 
        case "captain":
            return "🏆 The captain leads the team on and off the pitch and typically wears the armband during matches.";
 
        case "winger":
            return "⚡ A winger operates wide on either flank, using pace and skill to beat defenders and deliver crosses or cut inside.";
 
        case "striker":
            return "⚽ A striker is the main forward whose primary job is to score goals. Also referred to as the number 9.";
 
        case "goalkeeper":
            return "🧤 The goalkeeper is the last line of defence and the only player allowed to use their hands (within the penalty area).";
 
        case "playmaker":
            return "🎯 A playmaker controls the tempo of the game, often operating as the number 10, linking midfield and attack with creative passing.";
 
        case "ball_winning_midfielder":
            return "💪 A ball-winning midfielder (CDM) focuses on breaking up opposition play, winning tackles and protecting the back line.";
 
        case "box_to_box":
            return "🔄 A box-to-box midfielder contributes both defensively and offensively, covering the entire length of the pitch.";
 
        case "sweeper_keeper":
            return "🧤 A sweeper keeper acts almost like an extra defender, coming out aggressively to claim balls behind the defensive line.";
 
        case "champions_league":
            return "🏆 The UEFA Champions League is Europe's premier club competition, contested by the top clubs from each nation's league.";
 
        case "premier_league":
            return "⚽ The Premier League is the top tier of English football, featuring 20 clubs competing from August to May.";
 
        case "world_cup":
            return "🌍 The FIFA World Cup is the biggest international football tournament, held every four years and contested by national teams.";
 
        case "euros":
            return "🏆 The UEFA European Championship (Euros) is held every four years and decides the best national team in Europe.";
 
        case "fc26_clubs":
            return "🎮 FC26 Clubs (Pro Clubs) lets you create a Virtual Pro and play with friends in an online club. Progress your player and climb the divisions.";
 
        case "ultimate_team":
            return "🃏 Ultimate Team (FUT) is a mode where you build a squad from player cards earned through packs, matches and the transfer market.";
 
        case "playstyles":
            return "⭐ FC26 PlayStyles give players unique strengths such as Finesse Shot+, Pinged Pass+ and Anticipate+. Plus versions are the elite tier.";
 
        case "chemistry":
            return "🧪 Chemistry improves player performance in Ultimate Team through links between players of the same club, league or nationality.";
 
        case "evolutions":
            return "🔬 Evolutions let you permanently upgrade a player's stats and PlayStyles by completing in-game objectives.";
 
        case "packs":
            return "📦 Packs contain random player cards and consumables. Pack luck varies — some contain top-rated players, others don't.";
 
        case "transfer_market":
            return "💰 The Transfer Market lets you buy and sell player cards using coins. Prices fluctuate based on supply, demand and promotions.";
 
        case "who_are_you":
            return "🤖 I'm your club assistant. Ask me about player stats, football tactics or anything FC26.";
 
        case "hello":
            return "👋 Hello! Ask me about player stats, football tactics or club records.";
 
        default: {
 
            const fallback = [
                "🤖 I don't know that yet.",
                "⚽ Ask me about goals, assists or ratings.",
                "📊 Try asking who the top scorer is.",
                "🏆 I can help with club statistics.",
                "🎮 Ask me about FC26.",
                "📋 Ask me about football tactics.",
                "🧠 Ask me about formations.",
                "⚽ Ask me about xG or xA.",
                "🔥 Ask me about pressing systems.",
                "🏟️ Ask me about the Champions League.",
                "🧤 Ask me about goalkeeping.",
                "🎯 Ask me about playmakers.",
                "🏆 Ask me about club records.",
                "⚫⚪ Massive club.",
                "🎯 Try asking about playstyles or chemistry.",
                "📦 Ask me about packs or the transfer market.",
                "🔬 Ask me about evolutions.",
                "💪 Ask me about ball-winning midfielders.",
                "🔄 Ask me about box-to-box midfielders.",
                "🛡️ Ask me about defensive tactics like the low block."
            ];
 
            return fallback[Math.floor(Math.random() * fallback.length)];
        }
    }
}
 
module.exports = {
    answerAutoMessage,
    answerQuestion,
    detectIntent,
    shouldReplyAutomatically
};
