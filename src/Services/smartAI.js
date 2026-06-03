const OpenAI = require("openai");

const db = require("../Utils/db");
const {
    answerQuestion,
    detectIntent
} = require("./fakeAI");
const {
    getFootballReply
} = require("./footballBrain");
const {
    answerFootballKnowledge,
    getRelevantFootballKnowledge
} = require("./footballKnowledge");
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
const PASSIVE_REPLY_CHANCE = 0.12;
const FOOTBALL_BANTER_CHANCE = 0.10;

function normalize(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function hasQuestion(text) {
    return /\?|\b(who|what|when|where|why|how|which|can you|could you|should we|do we|are we|is there)\b/i
        .test(text);
}

function mentionsBot(message) {
    const ownId =
        message.client?.user?.id;

    return Boolean(
        ownId &&
        message.mentions?.users?.has(ownId)
    ) ||
    /\b(bot|bella|assistant|ourproclub)\b/i.test(message.content || "");
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
        "admin decision"
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
            /\b(top scorer|goals|assists|rating|leaderboard|stats|form|matches|win rate|clean sheet|motm)\b/i.test(lower),
        botHelp:
            /\b(command|commands|how do i|help|claim|link|quiz|poll|compare|chemistry)\b/i.test(lower) ||
            hasSlashCommandCue(text),
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
    const direct =
        mentionsBot(message) ||
        hasQuestion(text) ||
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
        !mentionsBot(message);
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
        longStatement &&
        !signals.clubStats &&
        !signals.botHelp
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

    if (
        intent !== "unknown" &&
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
    if (!openai) {
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
            ruleDecision.intent === "planning_admin_chat" &&
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
        console.error("AI classifier error:", err.message);
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
    if (!openai) {
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
        console.error("AI generation error:", err.message);
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

    if (decision.mode === "helpful" || decision.mode === "analysis") {
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

    if (decision.mode === "banter") {
        return getFootballReply(content);
    }

    return answerQuestion(
        message.guild.id,
        content
    );
}

module.exports = {
    answerSmartMessage,
    classifyRuleBased,
    isPlanningOrAdminChat,
    topicSignals
};
