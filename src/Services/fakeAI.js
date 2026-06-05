const db = require("../Utils/db");
const {
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    isRealPlayerName
} = require("../Utils/embedStyle");
 
function hasAny(text, words) {
    return words.some(word => text.includes(word));
}

function hasStandalone(text, word) {
    return new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`, "i")
        .test(text);
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
        "who has most goals",
        "who bangs them in",
        "who is carrying goals",
        "main goal threat",
        "biggest goal threat",
        "who is our finisher",
        "who scores for us"
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
        "assist king",
        "who creates the most",
        "chance creator",
        "creative leader",
        "who sets up goals",
        "who feeds the striker",
        "who is our playmaker"
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
        "top performer",
        "who is performing",
        "who is playing well",
        "who is carrying",
        "best on the pitch",
        "standout player",
        "who is in form"
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
        "most caps",
        "who plays every game",
        "most active player",
        "who is always on",
        "biggest grinder"
    ])) {
        return "most_matches";
    }
 
    if (hasAny(q, [
        "most goals and assists",
        "goal contributions",
        "goals and assists",
        "most contributions",
        "combined goals",
        "top contributor",
        "g/a",
        "ga leader",
        "who contributes most",
        "who is involved in goals"
    ])) {
        return "goal_contributions";
    }

    if (hasAny(q, [
        "ball knowledge",
        "ball knowledge test",
        "football knowledge",
        "knows ball",
        "know ball",
        "ball iq",
        "football iq",
        "test my ball knowledge",
        "quiz my ball knowledge",
        "do i know ball",
        "does he know ball",
        "does she know ball",
        "who knows ball"
    ])) {
        return "ball_knowledge_help";
    }

    if (hasAny(q, [
        "player form",
        "my form",
        "how is my form",
        "recent form",
        "rating trend",
        "am i improving",
        "last five",
        "last 5",
        "last ten",
        "last 10",
        "form command"
    ])) {
        return "form_help";
    }

    if (hasAny(q, [
        "player compare",
        "compare players",
        "compare me",
        "who is better",
        "head to head",
        "versus stats",
        "vs stats",
        "compare command"
    ])) {
        return "compare_help";
    }

    if (hasAny(q, [
        "chemistry score",
        "chemistry command",
        "who links well",
        "best duo",
        "partnership",
        "strike partnership",
        "how do we play together"
    ])) {
        return "chemistry_command_help";
    }
 
    // Help
 
    if (
        /\b(how do i claim|how to claim|link my account|link account|register)\b/.test(q)
    ) {
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

    if (hasAny(q, [
        "start a poll",
        "make a poll",
        "create poll",
        "vote on",
        "poll command"
    ])) {
        return "poll_help";
    }

    if (hasAny(q, [
        "start quiz",
        "how do i start quiz",
        "how to start quiz",
        "quiz leaderboard",
        "quiz command",
        "football quiz",
        "trivia",
        "xp quiz"
    ])) {
        return "quiz_help";
    }

    if (hasAny(q, [
        "warn someone",
        "infractions",
        "timeout someone",
        "ban someone",
        "moderation commands",
        "mod commands"
    ])) {
        return "moderation_help";
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
 
    if (
        hasStandalone(q, "xg") ||
        hasAny(q, [
            "expected goals",
            "what is xg",
            "how is xg"
        ])
    ) {
        return "xg_help";
    }
 
    if (
        hasStandalone(q, "xa") ||
        hasAny(q, [
            "expected assists",
            "what is xa",
            "how is xa"
        ])
    ) {
        return "xa_help";
    }
 
    if (
        hasStandalone(q, "xt") ||
        hasAny(q, [
            "expected threat",
            "what is xt"
        ])
    ) {
        return "xt_help";
    }
 
    if (hasAny(q, [
        "formation",
        "what formation",
        "best formation",
        "tactical setup",
        "team shape",
        "how should we line up",
        "what shape should we play",
        "best shape for clubs",
        "formation advice",
        "is 4231 good",
        "is 433 good"
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
        "press high",
        "press them",
        "force mistakes",
        "win it high"
    ])) {
        return "high_press";
    }

    if (hasAny(q, [
        "through ball",
        "balls in behind",
        "run in behind",
        "split the defence",
        "killer pass"
    ])) {
        return "through_ball";
    }

    if (hasAny(q, [
        "cutback",
        "pull it back",
        "byline pass",
        "sweaty goal",
        "square it"
    ])) {
        return "cutback";
    }

    if (hasAny(q, [
        "counter attack",
        "counter-attacking",
        "break quickly",
        "transition attack",
        "hit them on the break"
    ])) {
        return "counter_attack";
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
 
    if (/\b(hello|hi bot|hey|hi there|morning|good morning|alright bot)\b/.test(q)) {
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
        /\?|\b(who|what|when|where|why|how|which|whose|whos|can|could|should|would|do|does|did|are|is|was|were|has|have|had|tell me|show me|explain|describe|history of|lore of|story behind|best player|top scorer|most goals|most assists|ball knowledge|knows ball|know ball)\b/i
            .test(text);
    const chance =
    directBotCue
        ? options.directChance ?? 0.75
        : options.passiveChance ?? 0.30;

    return Math.random() < chance;
}

function compact(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a, b) {
    const left =
        String(a || "");
    const right =
        String(b || "");
    const previous =
        Array.from(
            {
                length: right.length + 1
            },
            (_, index) => index
        );

    for (let i = 1; i <= left.length; i++) {
        let lastDiagonal =
            previous[0];

        previous[0] = i;

        for (let j = 1; j <= right.length; j++) {
            const oldDiagonal =
                previous[j];
            const cost =
                left[i - 1] === right[j - 1]
                    ? 0
                    : 1;

            previous[j] =
                Math.min(
                    previous[j] + 1,
                    previous[j - 1] + 1,
                    lastDiagonal + cost
                );
            lastDiagonal = oldDiagonal;
        }
    }

    return previous[right.length];
}

function similarity(a, b) {
    const left =
        compact(a);
    const right =
        compact(b);
    const visualLeft =
        visualCompact(a);
    const visualRight =
        visualCompact(b);

    if (!left || !right) {
        return 0;
    }

    if (left === right) {
        return 1;
    }

    if (left.includes(right) || right.includes(left)) {
        return Math.min(left.length, right.length) / Math.max(left.length, right.length);
    }

    if (
        visualLeft.length >= 3 &&
        visualRight.length >= 3 &&
        (
            visualLeft.startsWith(visualRight) ||
            visualRight.startsWith(visualLeft)
        )
    ) {
        return Math.min(
            0.9,
            0.78 + (Math.min(visualLeft.length, visualRight.length) * 0.03)
        );
    }

    const distance =
        Math.min(
            levenshtein(left, right),
            levenshtein(visualLeft, visualRight)
        );

    return 1 - (distance / Math.max(left.length, right.length));
}

function visualCompact(value) {
    return compact(value)
        .replace(/[o]/g, "0")
        .replace(/[il]/g, "1")
        .replace(/[s]/g, "5");
}

function questionNameHints(question) {
    const normalized =
        String(question || "")
            .toLowerCase()
            .replace(/<@!?\d+>/g, " ")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    const withoutQuestionWords =
        normalized
            .replace(/\b(who|what|when|where|why|how|many|much|does|did|is|was|are|were|has|have|had|tell|me|about|profile|stats|goals?|assists?|rating|matches|games|played|level|xp|clean|sheets?|motm|man|of|the|match|position|archetype|bella|ciao|club|player)\b/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    const words =
        withoutQuestionWords
            .split(/\s+/)
            .filter(word => word.length >= 2);
    const hints =
        new Set();

    for (let start = 0; start < words.length; start++) {
        for (let size = 1; size <= 3; size++) {
            const phrase =
                words.slice(start, start + size).join("");

            if (phrase.length >= 2) {
                hints.add(phrase);
            }
        }
    }

    return [...hints];
}

function aliasScoreForQuestion(question, aliases) {
    const text =
        compact(question);
    const hints =
        questionNameHints(question);
    let best = 0;

    for (const alias of aliases) {
        const value =
            compact(alias);

        if (value.length < 2) {
            continue;
        }

        if (text.includes(value)) {
            best =
                Math.max(
                    best,
                    value.length >= 4 ? 1 : 0.92
                );
            continue;
        }

        for (const hint of hints) {
            best =
                Math.max(
                    best,
                    similarity(hint, value)
                );
        }
    }

    return best;
}

function averageRating(player) {
    const matches =
        Number(player?.matches || 0);

    return matches
        ? (Number(player?.total_rating || 0) / matches).toFixed(2)
        : "0.00";
}

function statIntent(question) {
    const q =
        question.toLowerCase();

    if (/\b(who is|who was|who are|tell me about|what do you know about|profile|about)\b/.test(q)) return "identity";
    if (/\b(goals?|scored|score)\b/.test(q)) return "goals";
    if (/\b(assists?|created|setup|set up)\b/.test(q)) return "assists";
    if (/\b(g\/a|goal contributions?|goals and assists)\b/.test(q)) return "contributions";
    if (/\b(rating|average rating|avg rating|amr)\b/.test(q)) return "rating";
    if (/\b(matches|appearances|games|played)\b/.test(q)) return "matches";
    if (/\b(level)\b/.test(q)) return "level";
    if (/\b(xp|experience)\b/.test(q)) return "xp";
    if (/\b(clean sheets?|cs)\b/.test(q)) return "clean_sheets";
    if (/\b(motm|man of the match)\b/.test(q)) return "motm";
    if (/\b(red cards?|reds)\b/.test(q)) return "red_cards";
    if (/\b(position|pos|role)\b/.test(q)) return "position";
    if (/\b(archetype|build)\b/.test(q)) return "archetype";

    return null;
}

async function findMentionedPlayer(guildId, question, linkedRows) {
    const mention =
        String(question || "").match(/<@!?(\d+)>/);

    if (mention) {
        const linked =
            linkedRows.find(row => row.discord_id === mention[1]);

        if (linked) {
            return db.get(
                `
                SELECT *
                FROM players
                WHERE guild_id = ?
                AND (
                    player_id = ?
                    OR LOWER(player_name) = LOWER(?)
                )
                ORDER BY matches DESC
                LIMIT 1
                `,
                [
                    guildId,
                    linked.player_id,
                    linked.player_name
                ]
            );
        }
    }

    const players =
        await db.all(
            `
            SELECT *
            FROM players
            WHERE guild_id = ?
            AND COALESCE(matches, 0) > 0
            `,
            [guildId]
        );
    const text =
        compact(question);
    const linkedByPlayerId =
        new Map(
            linkedRows
                .filter(row => row.player_id)
                .map(row => [String(row.player_id), row])
        );
    const candidates =
        players
            .map(player => {
                const linked =
                    linkedByPlayerId.get(String(player.player_id));
                const names =
                    [
                        player.player_name,
                        linked?.player_name
                    ]
                        .filter(isRealPlayerName);
                const best =
                    aliasScoreForQuestion(question, names);

                return {
                    player,
                    score: best
                };
            })
            .filter(row => row.score >= 0.74)
            .sort((a, b) => b.score - a.score);

    if (!candidates.length) {
        return null;
    }

    if (
        candidates[0].score < 0.86 &&
        candidates[1] &&
        candidates[0].score - candidates[1].score < 0.12
    ) {
        return null;
    }

    return candidates[0].player;
}

async function answerNamedPlayerQuestion(guildId, question, linkedRows, shown) {
    const stat =
        statIntent(question);

    if (!stat) {
        return null;
    }

    const player =
        await findMentionedPlayer(guildId, question, linkedRows);

    if (!player) {
        return null;
    }

    const name =
        shown(player);

    switch (stat) {
        case "identity":
            return `${name} is a stored Bella Ciao player. Tracked profile: ${player.matches || 0} matches, ${player.goals || 0} goals, ${player.assists || 0} assists, ${averageRating(player)} average rating, level ${player.level || 1}. Latest stored position: ${player.position || "Unknown"}.`;
        case "goals":
            return `${name} has ${player.goals || 0} tracked goals.`;
        case "assists":
            return `${name} has ${player.assists || 0} tracked assists.`;
        case "contributions":
            return `${name} has ${Number(player.goals || 0) + Number(player.assists || 0)} tracked goal contributions (${player.goals || 0} goals, ${player.assists || 0} assists).`;
        case "rating":
            return `${name} has a tracked average rating of ${averageRating(player)}.`;
        case "matches":
            return `${name} has played ${player.matches || 0} tracked matches.`;
        case "level":
            return `${name} is level ${player.level || 1}.`;
        case "xp":
            return `${name} has ${player.xp || 0} season XP and ${player.all_time_xp || player.xp || 0} all-time XP.`;
        case "clean_sheets":
            return `${name} has ${player.clean_sheets || 0} tracked clean sheets.`;
        case "motm":
            return `${name} has ${player.motm || 0} tracked Man of the Match awards.`;
        case "red_cards":
            return `${name} has ${player.red_cards || 0} tracked red cards.`;
        case "position":
            return `${name}'s latest stored position is ${player.position || "Unknown"}.`;
        case "archetype":
            return `${name}'s latest stored archetype is ${player.archetype || "Unknown"}.`;
        default:
            return null;
    }
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
    const linkedRows =
        await getLinkedRows(db, guildId);
    const linkedMaps =
        buildLinkedMaps(linkedRows);
    const shown = player =>
        displayName(
            player?.player_name,
            linkedMaps,
            player?.player_id
        );
    const namedPlayerAnswer =
        await answerNamedPlayerQuestion(
            guildId,
            question,
            linkedRows,
            shown
        );

    if (namedPlayerAnswer) {
        return namedPlayerAnswer;
    }
 
    switch (intent) {
 
        case "top_scorer": {
 
            const player = await db.get(`
                SELECT player_id, player_name, goals
                FROM players
                WHERE guild_id = ?
                ORDER BY goals DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "⚽ No player statistics found.";
 
            return `⚽ ${shown(player)} is the club's top scorer with ${player.goals} goals.`;
        }
 
        case "top_assists": {
 
            const player = await db.get(`
                SELECT player_id, player_name, assists
                FROM players
                WHERE guild_id = ?
                ORDER BY assists DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "👟 No player statistics found.";
 
            return `👟 ${shown(player)} leads the club with ${player.assists} assists.`;
        }
 
        case "highest_rating": {
 
            const player = await db.get(`
                SELECT player_id, player_name, total_rating, matches
                FROM players
                WHERE guild_id = ?
                AND matches > 0
                ORDER BY (total_rating * 1.0 / matches) DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "⭐ No rating data available.";
 
            const rating = (player.total_rating / player.matches).toFixed(2);
 
            return `⭐ ${shown(player)} has the highest average rating (${rating}).`;
        }
 
        case "most_matches": {
 
            const player = await db.get(`
                SELECT player_id, player_name, matches
                FROM players
                WHERE guild_id = ?
                ORDER BY matches DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "🎮 No match data available.";
 
            return `🎮 ${shown(player)} has played the most matches (${player.matches}).`;
        }
 
        case "goal_contributions": {
 
            const player = await db.get(`
                SELECT player_id, player_name, goals, assists, (goals + assists) AS contributions
                FROM players
                WHERE guild_id = ?
                ORDER BY contributions DESC
                LIMIT 1
            `, [guildId]);
 
            if (!player) return "⚽ No contribution data available.";
 
            return `🔥 ${shown(player)} leads the club with ${player.contributions} goal contributions (${player.goals} goals, ${player.assists} assists).`;
        }
 
        case "claim_help":
            return "📌 Use `/claim` to link your Discord account to your player.";
 
        case "ratings_help":
            return "⭐ Ratings are calculated from your performances across recorded matches.";
 
        case "xp_help":
            return "📈 XP is earned through matches and helps increase your level.";
 
        case "commands_help":
            return "🤖 Popular commands: `/profile`, `/stats`, `/leaderboard`, `/ratings`, `/playerstats`, `/schedule`, `/compplayerstats`, `/claim`.";

        case "form_help":
            return "📈 Use `/player form` to see recent W/D/L form, rating trend, and the same core player-stat profile as `/playerstats`. It defaults to your claimed player.";

        case "compare_help":
            return "⚔️ Use `/player compare player1 player2` with two claimed Discord users. It compares goals, assists, average rating, win rate and matches.";

        case "chemistry_command_help":
            return "🧪 Use `/chemistry player1 player2` to measure how two claimed players perform together: matches, win rate, average rating and Chemistry Score.";

        case "poll_help":
            return "🗳️ Use `/poll create` with a question and at least two options. The bot posts buttons and keeps the vote count live.";

        case "quiz_help":
            return "🧠 Use `/quiz start` to begin a server-wide quiz. Each question stays open for 20 seconds, then the bot advances automatically until someone presses Stop.";

        case "ball_knowledge_help":
            return "Ball knowledge means reading the game properly: tactics, roles, decision-making, form, stats, and knowing the club lore. Use `/quiz start` if you want the room tested.";

        case "moderation_help":
            return "⚖️ Staff can use `/mod warn`, `/mod infractions`, `/mod timeout`, and `/mod ban`. Three warns triggers an escalation flag.";
 
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

        case "through_ball":
            return "👟 A through ball is a pass into space behind the defence. It works best when the runner goes early and the passer releases it before the back line can turn.";

        case "cutback":
            return "🎯 A cutback is pulled back from near the byline into a better shooting lane. In Clubs it is deadly because defenders often sprint toward their own goal and lose the late runner.";

        case "counter_attack":
            return "⚡ A counter attack is about winning it, playing forward quickly, and attacking before the opposition rebuilds their shape. First pass matters.";

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
