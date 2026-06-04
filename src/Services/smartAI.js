const OpenAI = require("openai");

const db = require("../Utils/db");
const {
    answerQuestion,
    detectIntent
} = require("./fakeAI");
const {
    answerClubMatchQuestion,
    matchContextIntent
} = require("./clubMatchQuestions");
const {
    getFootballReply
} = require("./footballBrain");
const {
    answerFootballKnowledge,
    getRelevantFootballKnowledge,
    isFootballKnowledgeQuestion
} = require("./footballKnowledge");
const {
    answerClubKnowledge,
    isClubKnowledgeQuestion
} = require("./clubKnowledge");
const {
    answerSimpleQuestion
} = require("./simpleAnswers");

const AI_MODEL =
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";
const AI_ENABLED =
    Boolean(process.env.OPENAI_API_KEY);
const openai =
    AI_ENABLED
        ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        })
        : null;

const MAX_MEMORY = 8;
const MEMORY_TTL_MS = 60 * 60 * 1000;
const PASSIVE_REPLY_CHANCE = 0;
const FOOTBALL_BANTER_CHANCE = 0;
const AI_BACKOFF_MS =
    Number(process.env.AI_BACKOFF_MS || 30 * 60 * 1000);

let aiDisabledUntil = 0;
let aiBackoffLoggedUntil = 0;

function normalize(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function isAiBackoffActive() {
    return Date.now() < aiDisabledUntil;
}

function isQuotaError(err) {
    const message =
        String(err?.message || "").toLowerCase();

    return err?.status === 429 ||
        err?.code === "insufficient_quota" ||
        message.includes("quota") ||
        message.includes("429");
}

function handleOpenAIError(err, label) {
    if (isQuotaError(err)) {
        aiDisabledUntil =
            Math.max(
                aiDisabledUntil,
                Date.now() + AI_BACKOFF_MS
            );

        if (Date.now() >= aiBackoffLoggedUntil) {
            console.warn(
                `${label}: AI quota/rate limit hit. AI calls paused for ${Math.round(AI_BACKOFF_MS / 60000)} minutes.`
            );
            aiBackoffLoggedUntil = aiDisabledUntil;
        }

        return;
    }

    console.error(`${label}:`, err.message);
}

function hasQuestion(text) {
    return /\?|\b(who|what|when|where|why|how|which|can you|could you|should we|do we|are we|is there)\b/i
        .test(text);
}

function isDirectBotAddress(message) {
    const ownId =
        message.client?.user?.id;
    const text =
        normalize(message.content).toLowerCase();

    const mentioned =
        Boolean(
        ownId &&
        message.mentions?.users?.has(ownId)
    );

    if (mentioned) {
        return true;
    }

    return (
        /^(yo|hi|hello|hey|alright)\s+(bella\s+ciao\s+bot|bella\s+bot|bot|ourproclub)\b/.test(text) ||
        /^(bella\s+ciao\s+bot|bella\s+bot|bot|ourproclub)\b/.test(text)
    );
}

function hasBotCue(message) {
    const ownId =
        message.client?.user?.id;

    return Boolean(
        ownId &&
        message.mentions?.users?.has(ownId)
    ) ||
    /\b(bella\s+ciao\s+bot|bella\s+bot|ourproclub|assistant|bot)\b/i
        .test(message.content || "");
}

function isBotAddressedByLanguage(text) {
    const lower =
        normalize(text).toLowerCase();
    const botName =
        "(?:bella\\s+ciao\\s+bot|bella\\s+bot|ourproclub|assistant|bot)";
    const afterBotRequest =
        "(?:can you|could you|would you|will you|do you|are you|did you|have you|how|what|why|when|where|who|which|tell me|show me|check|find|explain|answer|reply|help|say)";
    const beforeBotRequest =
        "(?:can you|could you|would you|will you|do you|are you|did you|have you|tell me|show me)";

    return (
        new RegExp(`\\b${botName}\\b.{0,80}\\b${afterBotRequest}\\b`, "i").test(lower) ||
        new RegExp(`\\b${beforeBotRequest}\\b.{0,80}\\b${botName}\\b`, "i").test(lower)
    );
}

function isBotMetaChat(text) {
    return /\b(this bot|the bot|that bot|it should|it shouldn't|it shouldnt|doesn't understand|doesnt understand|random timer|spam replies|stupid responses|auto response|auto-response|speaking to the bot|talking to the bot)\b/i
        .test(text);
}

function isBotGreeting(text) {
    return /\b(hello|hi|hey|yo|alright|how are you|how you doing|you good)\b/i
        .test(text);
}

function hasSlashCommandCue(text) {
    return /\/(help|claim|player|stats|ratings|top|quiz|poll|mod|schedule|syncstats|resetstats|linkclub|unlink)\b/i
        .test(text);
}

function isPlanningOrAdminChat(text) {
    const lower =
        text.toLowerCase();
    const planningPhrases = [
        "sounds good",
        "best time",
        "new season starts",
        "reset all the stats",
        "start at the same time",
        "take tonight",
        "tomorrow to think",
        "changes or removals",
        "when we should",
        "if we want to",
        "i want to reset",
        "we need to discuss",
        "before we do anything",
        "let everyone know",
        "announcement",
        "server update",
        "admin decision",
        "adding all these",
        "still adding",
        "new ideas",
        "quiz questions",
        "updating the bot",
        "introduce the bot",
        "xp system",
        "for the sake of",
        "i'll be home",
        "i will be home",
        "about an hour",
        "today is start",
        "start of new in game season",
        "new in game season"
    ];

    return planningPhrases.some(phrase =>
        lower.includes(phrase)
    );
}

function topicSignals(text) {
    const lower =
        text.toLowerCase();
    const signals = {
        clubStats:
            /\b(top scorer|goals|assists|rating|leaderboard|stats|form|matches|win rate|clean sheet|motm|last game|latest match|recent match|best player)\b/i.test(lower),
        botHelp:
            /\b(command|commands|how do i|help|claim|link|start quiz|quiz leaderboard|poll command|compare command|chemistry command)\b/i.test(lower) ||
            hasSlashCommandCue(text),
        clubLore:
            isClubKnowledgeQuestion(text),
        tactical:
            /\b(formation|press|low block|counter|cutback|through ball|build up|transition|winger|striker|cdm|cam|defend|attack|world cup|euros|euro|champions league|ballon|golden boot|golden ball|european cup|history|record|trophy|winner)\b/i.test(lower),
        matchBanter:
            /\b(goal|save|assist|tackle|won|lost|battered|bottled|heads gone|matchday|clubs|divs)\b/i.test(lower),
        moderation:
            /\b(warn|ban|timeout|infraction|moderation|mod command)\b/i.test(lower),
        scheduling:
            /\b(schedule|session|fixture|when are we playing|what time|available|can play)\b/i.test(lower)
    };

    return {
        ...signals,
        count:
            Object.values(signals)
                .filter(Boolean)
                .length
    };
}

function classifyRuleBased(message, memory = []) {
    const text =
        normalize(message.content);
    const directAddress =
        isDirectBotAddress(message) ||
        isBotAddressedByLanguage(text);
    const botCue =
        hasBotCue(message);
    const direct =
        directAddress ||
        hasSlashCommandCue(text);
    const signals =
        topicSignals(text);
    const intent =
        detectIntent(text);
    const planning =
        isPlanningOrAdminChat(text);
    const longStatement =
        text.length > 120 &&
        !hasQuestion(text) &&
        !directAddress;
    const recentBotReply =
        memory.some(row =>
            Number(row.should_reply || 0) === 1 &&
            Date.now() - Number(row.created_at || 0) < 60_000
        );
    const situation = {
        direct,
        planning,
        longStatement,
        recentBotReply,
        intent,
        signals,
        botCue,
        directAddress,
        usefulness:
            direct
                ? 0.8
                : signals.clubStats || signals.botHelp
                    ? 0.55
                    : signals.tactical
                        ? 0.35
                        : signals.matchBanter
                            ? 0.22
                            : 0.05,
        interruptionRisk:
            planning || longStatement
                ? 0.95
                : recentBotReply
                    ? 0.65
                    : direct
                        ? 0.1
                        : 0.35
    };

    if (planning) {
        return {
            shouldReply: false,
            mode: "silent",
            intent: "planning_admin_chat",
            confidence: 0.95,
            reason: "Planning/admin conversation, bot reply would interrupt.",
            situation
        };
    }

    if (
        isBotMetaChat(text) &&
        !directAddress
    ) {
        return {
            shouldReply: false,
            mode: "silent",
            intent: "bot_meta_chat",
            confidence: 0.95,
            reason: "People are discussing the bot, not asking it to reply.",
            situation
        };
    }

    if (
        directAddress &&
        isBotGreeting(text)
    ) {
        return {
            shouldReply: true,
            mode: "helpful",
            intent: "bot_greeting",
            confidence: 0.9,
            reason: "Direct greeting to the bot.",
            situation
        };
    }

    if (
        longStatement &&
        !signals.clubStats &&
        !signals.clubLore
    ) {
        return {
            shouldReply: false,
            mode: "silent",
            intent: "long_human_statement",
            confidence: 0.85,
            reason: "Long non-question human message.",
            situation
        };
    }

    if (intent !== "unknown" && direct) {
        return {
            shouldReply: true,
            mode: "helpful",
            intent,
            confidence: 0.9,
            reason: "Direct bot/stat/help question.",
            situation
        };
    }

    if (signals.clubLore && direct) {
        return {
            shouldReply: true,
            mode: "helpful",
            intent: "club_lore",
            confidence: 0.9,
            reason: "Direct club lore question.",
            situation
        };
    }

    if (
        intent !== "unknown" &&
        !signals.botHelp &&
        Math.random() < PASSIVE_REPLY_CHANCE
    ) {
        return {
            shouldReply: true,
            mode: "helpful",
            intent,
            confidence: 0.65,
            reason: "Useful passive stat/help response.",
            situation
        };
    }

    if (
        signals.matchBanter &&
        Math.random() < FOOTBALL_BANTER_CHANCE
    ) {
        return {
            shouldReply: true,
            mode: "banter",
            intent: "football_banter",
            confidence: 0.55,
            reason: "Low-risk football banter.",
            situation
        };
    }

    return {
        shouldReply: false,
        mode: "silent",
        intent:
            intent !== "unknown"
                ? intent
                : "not_useful_enough",
        confidence: 0.7,
        reason: "No direct need to reply.",
        situation
    };
}

async function getMemory(guildId, channelId) {
    await db.run(
        `
        DELETE FROM ai_message_memory
        WHERE created_at < ?
        `,
        [Date.now() - MEMORY_TTL_MS]
    );

    return db.all(
        `
        SELECT *
        FROM ai_message_memory
        WHERE guild_id = ?
        AND channel_id = ?
        AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
        [
            guildId,
            channelId,
            Date.now() - MEMORY_TTL_MS,
            MAX_MEMORY
        ]
    );
}

async function remember(message, decision, content) {
    await db.run(
        `
        INSERT INTO ai_message_memory
        (guild_id, channel_id, author_id, author_name, content, intent, should_reply, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            message.guild.id,
            message.channel.id,
            message.author.id,
            message.author.username,
            content.slice(0, 500),
            decision.intent,
            decision.shouldReply ? 1 : 0,
            Date.now()
        ]
    );

    await db.run(
        `
        DELETE FROM ai_message_memory
        WHERE created_at < ?
        OR (
            guild_id = ?
            AND channel_id = ?
            AND id NOT IN (
                SELECT id
                FROM ai_message_memory
                WHERE guild_id = ?
                AND channel_id = ?
                ORDER BY created_at DESC
                LIMIT 40
            )
        )
        `,
        [
            Date.now() - MEMORY_TTL_MS,
            message.guild.id,
            message.channel.id,
            message.guild.id,
            message.channel.id
        ]
    );
}

async function classifyWithOpenAI(message, memory, ruleDecision) {
    if (!openai || isAiBackoffActive()) {
        return ruleDecision;
    }

    if (
        !ruleDecision.situation?.direct &&
        !ruleDecision.situation?.botCue
    ) {
        return ruleDecision;
    }

    try {
        const response =
            await openai.chat.completions.create({
                model: AI_MODEL,
                temperature: 0.1,
                response_format: {
                    type: "json_object"
                },
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a Discord bot reply gate for an FC Clubs server. Decide if the bot should reply. Be conservative. Prefer silence unless the message is a direct question, direct bot mention, command/help request, club stat question, or clearly useful football/tactical prompt. Never interrupt planning/admin messages, long human updates, or ordinary conversation. Return JSON only with shouldReply boolean, mode one of silent/helpful/analysis/banter, intent string, confidence 0-1, reason string."
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            message: message.content,
                            author: message.author.username,
                            ruleDecision,
                            recentMessages:
                                memory
                                    .slice()
                                    .reverse()
                                    .map(row => ({
                                        author: row.author_name,
                                        content: row.content,
                                        intent: row.intent,
                                        botReplied: Boolean(row.should_reply)
                                    }))
                        })
                    }
                ]
            });
        const parsed =
            JSON.parse(
                response.choices?.[0]?.message?.content || "{}"
            );

        if (typeof parsed.shouldReply !== "boolean") {
            return ruleDecision;
        }

        if (
            [
                "planning_admin_chat",
                "bot_meta_chat",
                "long_human_statement"
            ].includes(ruleDecision.intent) &&
            parsed.shouldReply
        ) {
            return ruleDecision;
        }

        return {
            ...ruleDecision,
            shouldReply: parsed.shouldReply,
            mode: parsed.mode || ruleDecision.mode,
            intent: parsed.intent || ruleDecision.intent,
            confidence:
                Number(parsed.confidence || ruleDecision.confidence),
            reason: parsed.reason || ruleDecision.reason
        };
    } catch (err) {
        handleOpenAIError(err, "AI classifier error");
        return ruleDecision;
    }
}

async function clubContext(guildId) {
    const [topScorer, topAssister, topRated, mostMatches] =
        await Promise.all([
            db.get(
                `SELECT player_name, goals FROM players WHERE guild_id = ? ORDER BY goals DESC LIMIT 1`,
                [guildId]
            ),
            db.get(
                `SELECT player_name, assists FROM players WHERE guild_id = ? ORDER BY assists DESC LIMIT 1`,
                [guildId]
            ),
            db.get(
                `SELECT player_name, total_rating, matches FROM players WHERE guild_id = ? AND matches > 0 ORDER BY (total_rating * 1.0 / matches) DESC LIMIT 1`,
                [guildId]
            ),
            db.get(
                `SELECT player_name, matches FROM players WHERE guild_id = ? ORDER BY matches DESC LIMIT 1`,
                [guildId]
            )
        ]);

    return {
        topScorer,
        topAssister,
        topRated:
            topRated
                ? {
                    player_name: topRated.player_name,
                    rating:
                        (
                            Number(topRated.total_rating || 0) /
                            Math.max(Number(topRated.matches || 0), 1)
                        ).toFixed(2)
                }
                : null,
        mostMatches
    };
}

async function generateWithOpenAI(message, decision, memory) {
    if (!openai || isAiBackoffActive()) {
        return null;
    }

    try {
        const context =
            await clubContext(message.guild.id);
        const footballKnowledge =
            getRelevantFootballKnowledge(message.content, 8);
        const response =
            await openai.chat.completions.create({
                model: AI_MODEL,
                temperature:
                    decision.mode === "banter"
                        ? 0.75
                        : 0.35,
                max_tokens: 120,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are Bella Ciao FC Bot, a sharp but restrained FC Clubs assistant. Reply only because a separate gate has approved it. Be concise, useful, and natural. Mention relevant slash commands where helpful. Use supplied footballKnowledge facts as trusted context when relevant. Do not overdo banter. Avoid replying like a motivational quote unless the user clearly asks for that energy."
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            message: message.content,
                            mode: decision.mode,
                            intent: decision.intent,
                            reason: decision.reason,
                            clubContext: context,
                            footballKnowledge,
                            recentMessages:
                                memory
                                    .slice()
                                    .reverse()
                                    .map(row => ({
                                        author: row.author_name,
                                        content: row.content
                                    }))
                        })
                    }
                ]
            });

        return normalize(
            response.choices?.[0]?.message?.content
        ).slice(0, 1800);
    } catch (err) {
        handleOpenAIError(err, "AI generation error");
        return null;
    }
}

async function answerSmartMessage(message) {
    const content =
        normalize(message.content)
            .replace(/<@!?\d+>/g, " ")
            .slice(0, 500);

    if (!content) {
        return null;
    }

    const memory =
        await getMemory(
            message.guild.id,
            message.channel.id
        );
    const ruleDecision =
        classifyRuleBased(message, memory);
    const decision =
        await classifyWithOpenAI(
            message,
            memory,
            ruleDecision
        );

    await remember(message, decision, content);

    if (!decision.shouldReply) {
        return null;
    }

    if (decision.intent === "bot_greeting") {
        return "I'm good. Keeping an eye on the club stats.";
    }

    if (decision.mode === "helpful" || decision.mode === "analysis") {
        const clubKnowledge =
            answerClubKnowledge(content);

        if (clubKnowledge) {
            return clubKnowledge;
        }

        const clubMatch =
            matchContextIntent(content)
                ? await answerClubMatchQuestion(
                    message.guild.id,
                    content
                )
                : null;

        if (clubMatch) {
            return clubMatch;
        }

        const legacy =
            await answerQuestion(
                message.guild.id,
                content
            );

        if (
            legacy &&
            !legacy.includes("I don't know that yet")
        ) {
            return legacy;
        }
    }

    const generated =
        await generateWithOpenAI(
            message,
            decision,
            memory
        );

    if (generated) {
        return generated;
    }

    const simple =
        answerSimpleQuestion(content);

    if (simple) {
        return simple;
    }

    const knowledge =
        answerFootballKnowledge(content);

    if (knowledge) {
        return knowledge;
    }

    if (isFootballKnowledgeQuestion(content)) {
        return "I do not have that football history fact stored yet.";
    }

    if (decision.mode === "banter") {
        return getFootballReply(content);
    }

    if (detectIntent(content) !== "unknown") {
        return answerQuestion(
            message.guild.id,
            content
        );
    }

    return null;
}

module.exports = {
    answerSmartMessage,
    classifyRuleBased,
    isPlanningOrAdminChat,
    topicSignals
};
