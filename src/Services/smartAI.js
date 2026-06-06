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
    isClubKnowledgeQuestion,
    isPassiveClubKnowledgeQuestion
} = require("./clubKnowledge");
const {
    answerSimpleQuestion
} = require("./simpleAnswers");
const {
    answerNewsQuestion,
    isNewsQuestion
} = require("./newsService");
const {
    answerLearnedKnowledge,
    getRelevantLearnedKnowledge
} = require("./learnedKnowledge");
const {
    applyInterpretationGate,
    interpretationPrompt,
    sanitizeInterpretation
} = require("./conversationInterpretation");

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
const PASSIVE_REPLY_CHANCE = 0.35;
const FOOTBALL_BANTER_CHANCE = 0.08;
const AI_BACKOFF_MS =
    Number(process.env.AI_BACKOFF_MS || 30 * 60 * 1000);
const RATINGS_NUDGE_CHANCE = 0.35;
const RATINGS_NUDGE_COOLDOWN_MS = 45 * 60 * 1000;

let aiDisabledUntil = 0;
let aiBackoffLoggedUntil = 0;
const ratingsNudgeMemory = new Map();
const smallTalkMemory = new Map();

function normalize(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function parseInterpretation(value) {
    try {
        return value
            ? JSON.parse(value)
            : null;
    } catch {
        return null;
    }
}

function hasMassMention(message) {
    return Boolean(message.mentions?.everyone) ||
        /@(everyone|here)\b/i.test(message.content || "");
}

function isReplyToBot(message) {
    const ownId =
        message.client?.user?.id;

    return Boolean(
        ownId &&
        message.mentions?.repliedUser?.id === ownId
    );
}

function isRatingsPagePost(text) {
    return /https?:\/\/(?:www\.)?bellaciaofc\.com\/fan-hub\/ratings\b/i
        .test(text);
}

function hasAttachmentOnlyCue(message, text) {
    const attachmentCount =
        message.attachments?.size ||
        message.attachments?.length ||
        0;
    const cleaned =
        normalize(text).toLowerCase();

    if (/^(click to see attachment|attachment|image|video|gif)$/i.test(cleaned)) {
        return true;
    }

    return attachmentCount > 0 && !cleaned;
}

function maybeRatingsNudge(guildId, channelId) {
    const key =
        `${guildId}:${channelId}:ratings`;
    const last =
        ratingsNudgeMemory.get(key) || 0;

    if (Date.now() - last < RATINGS_NUDGE_COOLDOWN_MS) {
        return null;
    }

    if (Math.random() >= RATINGS_NUDGE_CHANCE) {
        return null;
    }

    ratingsNudgeMemory.set(key, Date.now());

    const variants = [
        "Player of the night votes are open. Get yours in while the match is still fresh.",
        "Quick reminder: drop your player of the night vote on the ratings page.",
        "Ratings link is up. Don’t leave POTN to two people and a guess.",
        "Get those player of the night votes in. Fresh memories make better votes.",
        "If you played or watched, get your ratings in. Player of the night needs the room involved.",
        "Ratings are open. Back your standout before everyone pretends they remembered the full game."
    ];

    return variants[
        Math.floor(Math.random() * variants.length)
    ];
}

function recentConversationWithBot(memory) {
    return memory.some(row =>
        Number(row.should_reply || 0) === 1 &&
        Date.now() - Number(row.created_at || 0) < 4 * 60_000
    );
}

function isBroAddressedByLanguage(text) {
    const lower =
        normalize(text).toLowerCase();

    if (!/^bro\b/.test(lower)) {
        return false;
    }

    if (/^bro[.!?]*$/.test(lower)) {
        return true;
    }

    return /\b(who|what|when|where|why|how|can|could|would|should|do|does|did|is|are|tell|show|explain|help|you good|you alive|you there|alright|thanks|cheers)\b/
        .test(lower);
}

function hasSensitiveHumanContext(text) {
    const lower =
        normalize(text).toLowerCase();

    return /\b(n[\s-]*word|hard r|slur|racis|racist|racism|banned|ban him|ban me|getting banned|being banned)\b/
        .test(lower);
}

function isSmallTalk(text) {
    const lower =
        normalize(text).toLowerCase();

    if (lower.length > 90) {
        return false;
    }

    return /\b(ok|okay|alright|fair|safe|sound|nice|class|cool|calm|lol|haha|lmao|thanks|cheers|ty|my bad|you good|how are you|how you doing|what you saying|wagwan|yo|hello|hi|hey|bro)\b/
        .test(lower);
}

function smallTalkResponse(guildId, channelId, text) {
    const key =
        `${guildId}:${channelId}`;
    const count =
        Number(smallTalkMemory.get(key)?.count || 0);
    const lower =
        normalize(text).toLowerCase();
    let variants;

    if (/\b(weather|raining|sunny|cold|hot)\b/.test(lower)) {
        variants = [
            "I can't see live weather from here, but if it's one of those grim match-night evenings, layers and quick passing only.",
            "No live weather feed on my side, bro. If it is raining, call it elite football conditions and keep moving.",
            "I can't check the actual forecast, but I can still complain about heavy touches like it is raining.",
            "Weather-wise I only know vibes, not forecasts. Sounds like a keep-it-simple kind of night."
        ];
    } else if (/\b(what you been up to|what have you been up to|been doing|how's your day|hows your day)\b/.test(lower)) {
        variants = [
            "Mostly watching stats, trying not to interrupt normal chat, and learning when to keep quiet.",
            "Bit of club admin, bit of lore memory, bit of pretending I understand the dressing room.",
            "Keeping an eye on the numbers and trying to be less robotic. Slow progress, but progress.",
            "Just sitting here ready for stats, fixtures, lore, and the occasional normal conversation."
        ];
    } else if (/\b(thanks|cheers|ty)\b/.test(lower)) {
        variants = [
            "Anytime bro.",
            "No stress.",
            "You’re good.",
            "All good, mate."
        ];
    } else if (/\b(ok|okay|fair|safe|sound|cool|calm|alright)\b/.test(lower)) {
        variants = [
            "Yeah, I’ll keep it lighter.",
            "Fair. I’ll chill a bit.",
            "Got you bro.",
            "Calm, I’m learning the room.",
            "Say less."
        ];
    } else if (/\b(lol|haha|lmao)\b/.test(lower)) {
        variants = [
            "I’ll take that as a win.",
            "Tiny bit of aura restored.",
            "Had to be done.",
            "I’m counting that as positive feedback."
        ];
    } else if (/\b(you good|how are you|how you doing|what you saying|wagwan)\b/.test(lower)) {
        variants = [
            "I’m good bro. Watching the stats and trying not to waffle.",
            "All good. Keeping the club brain switched on.",
            "I’m calm. Just here if the room needs stats, lore, or a sensible answer.",
            "Good, mate. Trying to be useful without jumping into every message."
        ];
    } else {
        variants = [
            "Yeah bro.",
            "I hear you.",
            "Got you.",
            "Fair enough.",
            "I’ll keep it sensible."
        ];
    }

    smallTalkMemory.set(
        key,
        {
            count: count + 1,
            updatedAt: Date.now()
        }
    );

    if (count >= 8) {
        return "I’ll leave you to it for a bit, bro.";
    }

    return variants[
        Math.floor(Math.random() * variants.length)
    ];
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
    const value =
        normalize(text);

    return /\?|\b(who|what|when|where|why|how|which|whose|whos)\b/i
        .test(value) ||
        /^(can|could|should|would|do|does|did|are|is|was|were|has|have|had)\b/i
            .test(value) ||
        /\b(can you|could you|would you|do we|are we|is there|has anyone|have we)\b/i
            .test(value) ||
        /\b(tell me|tell us|show me|show us|give me|give us|explain|describe|profile|summarise|summarize|run through|teach me|quiz me|test me|history of|lore of|story of|story behind|what happened with|what happened to|best player|top scorer|most goals|most assists|highest rated|who knows ball|ball knowledge)\b/i
            .test(value);
}

function hasSchedulingRequest(text) {
    return /\b(schedule|session|fixture|what time|when are we playing|when do we play|who can play|who is available|who's available|availability|load up|kick-?off)\b/i
        .test(text) ||
        /^(can|could|do|does|is|are|who|when|what)\b.{0,80}\b(play|available|session|fixture|schedule|kick-?off|load up)\b/i
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

    if (isReplyToBot(message)) {
        return true;
    }

    return (
        /^(yo|hi|hello|hey|alright)\s+(bella\s+ciao\s+bot|bella\s+bot|bot|ourproclub|bro)\b/.test(text) ||
        /^(bella\s+ciao\s+bot|bella\s+bot|bot|ourproclub)\b/.test(text) ||
        isBroAddressedByLanguage(text)
    );
}

function hasBotCue(message) {
    const ownId =
        message.client?.user?.id;

    return Boolean(
        ownId &&
        message.mentions?.users?.has(ownId)
    ) ||
    isReplyToBot(message) ||
    /\b(bella\s+ciao\s+bot|bella\s+bot|ourproclub|assistant|bot)\b/i
        .test(message.content || "");
}

function isBotAddressedByLanguage(text) {
    const lower =
        normalize(text).toLowerCase();
    const botName =
        "(?:bella\\s+ciao\\s+bot|bella\\s+bot|ourproclub|assistant|bot|bro)";
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
    return /\b(this bot|the bot|that bot|it should|it shouldn't|it shouldnt|doesn't understand|doesnt understand|random timer|spam replies|stupid responses|auto response|auto-response|speaking to the bot|talking to the bot|quiz questions|position questions|answer choices|questions come up|question comes up)\b/i
        .test(text);
}

function isBotGreeting(text) {
    return /\b(hello|hi|hey|yo|alright|how are you|how you doing|you good)\b/i
        .test(text);
}

function isLongHumanUpdate(text) {
    const lower =
        normalize(text).toLowerCase();

    return text.length > 110 &&
        !hasQuestion(text) &&
        /\b(i|we|he|she|they|if|because|said|says|told|like i said|practice|listen|listening|team|club|night|game|want|wants|wanted)\b/
            .test(lower);
}

function isLongReflectiveStatement(text) {
    const lower =
        normalize(text).toLowerCase();

    if (lower.length < 260) {
        return false;
    }

    const firstQuestionWord =
        lower.search(/\b(who|what|when|where|why|how|which|can|could|should|would|do|does|did|are|is|was|were|has|have|had)\b/);

    return !/[?]/.test(lower) &&
        firstQuestionWord > 80 &&
        /\b(i|me|my|myself|we|our|us|felt|realized|understand|situation|mistake|trust|respect|writing|excuses|sorry|apolog)\b/
            .test(lower);
}

function hasSlashCommandCue(text) {
    return /\/(help|claim|player|stats|ratings|top|quiz|poll|mod|schedule|syncstats|resetstats|linkclub|unlink)\b/i
        .test(text);
}

function hasBallKnowledgeCue(text) {
    return /\b(ball knowledge|ball knowl?edge|football knowledge|knows ball|know ball|ball iq|football iq|test my ball|quiz my ball|do i know ball|does (?:he|she|[a-z0-9_]+) know ball|who knows ball)\b/i
        .test(text);
}

function hasMeaningfulPassiveCue(text, signals) {
    const lower =
        normalize(text).toLowerCase();

    if (hasBallKnowledgeCue(lower)) {
        return true;
    }

    if (signals.scheduling && !signals.clubStats && !signals.clubLore && !signals.botHelp) {
        return hasSchedulingRequest(lower);
    }

    if (
        signals.botHelp ||
        signals.clubLore ||
        signals.clubStats
    ) {
        return hasQuestion(lower) ||
            /\b(tell me|explain|show|check|who has|who is|who was|what happened|where did|how many|best|top|leader|history|lore|story|profile|stats|form|available|session)\b/
                .test(lower) ||
            /\bincident\b/
                .test(lower);
    }

    if (signals.tactical) {
        return hasQuestion(lower) ||
            /\b(explain|why|how|what is|what does|difference between|ball knowledge|football iq|tactics?)\b/
                .test(lower);
    }

    return false;
}

function hasRequestCue(text) {
    return hasQuestion(text) ||
        /\b(tell me|explain|show me|show us|check|give me|give us|describe|profile|summarise|summarize|run through|teach me|quiz me|incident)\b/i
            .test(text);
}

function hasStrongShortCue(text) {
    return /\b(who is [a-z0-9_]{2,}|who was [a-z0-9_]{2,}|[a-z0-9_ ]+ incident|best player|top scorer|top goalscorer|most goals|most assists|highest rated|highest rating|ball knowledge|who knows ball|club history|bella lore|what is xg|what is xa|what is xt|expected goals|expected assists|expected threat)\b/i
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
        "position questions",
        "question comes up",
        "questions come up",
        "screenshot",
        "send it me",
        "send it to me",
        "i can fix it",
        "can fix it",
        "ai helping",
        "code them",
        "more random",
        "more questions",
        "the more it knows",
        "answer choices",
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
            hasBallKnowledgeCue(text) ||
            hasSlashCommandCue(text),
        clubLore:
            isPassiveClubKnowledgeQuestion(text),
        tactical:
            /\b(formation|press|low block|counter|cutback|through ball|build up|transition|winger|striker|cdm|cam|defend|attack|xg|xa|xt|expected goals|expected assists|expected threat|world cup|euros|euro|champions league|ballon|golden boot|golden ball|european cup|history|record|trophy|winner)\b/i.test(lower) ||
            hasBallKnowledgeCue(text),
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

    if (hasMassMention(message)) {
        return {
            shouldReply: false,
            mode: "silent",
            intent: "mass_mention",
            confidence: 1,
            reason: "Never reply to @everyone or @here messages.",
            situation: {
                direct: false,
                planning: false,
                longStatement: false,
                recentBotReply: false,
                intent: "mass_mention",
                signals: {},
                botCue: false,
                directAddress: false,
                usefulness: 0,
                interruptionRisk: 1
            }
        };
    }

    if (hasAttachmentOnlyCue(message, text)) {
        return {
            shouldReply: false,
            mode: "silent",
            intent: "attachment_only",
            confidence: 0.95,
            reason: "Attachment without a real text prompt.",
            situation: {
                direct: false,
                planning: false,
                longStatement: false,
                recentBotReply: false,
                intent: "attachment_only",
                signals: {},
                botCue: false,
                directAddress: false,
                usefulness: 0,
                interruptionRisk: 0.9
            }
        };
    }

    if (isRatingsPagePost(text)) {
        const recentBotReply =
            memory.some(row =>
                Number(row.should_reply || 0) === 1 &&
                Date.now() - Number(row.created_at || 0) < 60_000
            );
        const nudge =
            !recentBotReply
                ? maybeRatingsNudge(
                    message.guild.id,
                    message.channel.id
                )
                : null;

        return {
            shouldReply: Boolean(nudge),
            mode: "helpful",
            intent: "ratings_vote_nudge",
            confidence: 0.9,
            reason:
                nudge
                    ? "Occasional ratings page vote nudge."
                    : "Ratings page post skipped by chance/cooldown.",
            cannedResponse: nudge,
            situation: {
                direct: false,
                planning: false,
                longStatement: false,
                recentBotReply,
                intent: "ratings_vote_nudge",
                signals: {
                    botHelp: false,
                    clubLore: false,
                    clubStats: false,
                    tactical: false,
                    matchBanter: false,
                    moderation: false,
                    scheduling: false,
                    count: 0
                },
                botCue: false,
                directAddress: false,
                usefulness: nudge ? 0.55 : 0,
                interruptionRisk: 0.2
            }
        };
    }

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
        (
            isLongHumanUpdate(text) ||
            isLongReflectiveStatement(text)
        ) &&
        !directAddress;
    const recentBotReply =
        recentConversationWithBot(memory);
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
        hasSensitiveHumanContext(text) &&
        !directAddress &&
        !hasSlashCommandCue(text)
    ) {
        return {
            shouldReply: false,
            mode: "silent",
            intent: "sensitive_human_context",
            confidence: 0.95,
            reason: "Serious/sensitive human conversation, bot should not chip in.",
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
        isNewsQuestion(text) &&
        (
            directAddress ||
            hasQuestion(text)
        )
    ) {
        return {
            shouldReply: true,
            mode: "helpful",
            intent: "news_lookup",
            confidence: 0.85,
            reason: "Direct news/current events question.",
            situation
        };
    }

    if (
        longStatement &&
        !signals.clubStats &&
        !signals.clubLore &&
        !hasMeaningfulPassiveCue(text, signals)
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
        hasBallKnowledgeCue(text) &&
        hasRequestCue(text)
    ) {
        return {
            shouldReply: true,
            mode: "helpful",
            intent: "ball_knowledge_help",
            confidence: 0.88,
            reason: "Ball knowledge question.",
            situation
        };
    }

    if (
        hasMeaningfulPassiveCue(text, signals) &&
        hasRequestCue(text) &&
        !recentBotReply &&
        (
            text.length >= 12 ||
            hasStrongShortCue(text)
        )
    ) {
        return {
            shouldReply: true,
            mode: "helpful",
            intent:
                hasBallKnowledgeCue(text)
                    ? "ball_knowledge_help"
                    : intent !== "unknown"
                        ? intent
                        : signals.clubLore
                            ? "club_lore"
                            : "useful_passive_question",
            confidence: 0.82,
            reason: "Useful passive question with a recognised trigger.",
            situation
        };
    }

    if (
        isSmallTalk(text) &&
        (
            directAddress ||
            isReplyToBot(message)
        )
    ) {
        return {
            shouldReply: true,
            mode: "small_talk",
            intent: "casual_small_talk",
            confidence: 0.85,
            reason: "Short casual reply in an active bot conversation.",
            cannedResponse:
                smallTalkResponse(
                    message.guild.id,
                    message.channel.id,
                    text
                ),
            situation
        };
    }

    if (
        (
            intent !== "unknown" ||
            hasMeaningfulPassiveCue(text, signals)
        ) &&
        !signals.botHelp &&
        !recentBotReply &&
        text.length >= 12 &&
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
        (guild_id, channel_id, author_id, author_name, content, intent, interpretation_json, should_reply, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            message.guild.id,
            message.channel.id,
            message.author.id,
            message.author.username,
            content.slice(0, 500),
            decision.intent,
            decision.interpretation
                ? JSON.stringify(decision.interpretation)
                : null,
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
    if (ruleDecision.cannedResponse) {
        return ruleDecision;
    }

    if (!openai || isAiBackoffActive()) {
        return ruleDecision;
    }

    const situation =
        ruleDecision.situation || {};
    const ambiguousConversationCandidate =
        hasQuestion(message.content || "") ||
        /\b(you|your|bot|assistant|bella\s+ciao)\b/i
            .test(message.content || "");

    if (
        !ruleDecision.shouldReply &&
        !situation.direct &&
        !situation.botCue &&
        !ambiguousConversationCandidate
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
                        content: interpretationPrompt()
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            message: message.content,
                            author: message.author.username,
                            bot: {
                                id: message.client?.user?.id,
                                username: message.client?.user?.username,
                                directlyMentioned:
                                    Boolean(
                                        message.client?.user?.id &&
                                        message.mentions?.users?.has(
                                            message.client.user.id
                                        )
                                    ),
                                replyingToBot: isReplyToBot(message)
                            },
                            mentionedUsers:
                                [...(message.mentions?.users?.values?.() || [])]
                                    .map(user => ({
                                        id: user.id,
                                        username: user.username,
                                        isBot:
                                            user.id === message.client?.user?.id
                                    }))
                                    .slice(0, 10),
                            ruleDecision,
                            recentMessages:
                                memory
                                    .slice()
                                    .reverse()
                                    .map(row => ({
                                        author: row.author_name,
                                        content: row.content,
                                        intent: row.intent,
                                        interpretation:
                                            parseInterpretation(
                                                row.interpretation_json
                                            ),
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

        return applyInterpretationGate(
            ruleDecision,
            sanitizeInterpretation(parsed, ruleDecision)
        );
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
        const learnedKnowledge =
            await getRelevantLearnedKnowledge(
                message.guild.id,
                message.content,
                8
            );
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
                            "You are Bella Ciao FC Bot, a sharp but restrained FC Clubs assistant. Reply only because a separate gate has approved it. Use the supplied interpretation to match the response to the actual audience, implied meaning, emotion, tone, and requested response style. Answer confusion clearly. Acknowledge frustration briefly before helping. Match friendly sarcasm or teasing with restrained banter only when it is aimed at you. Use calm, non-combative language when de-escalation is needed. Be gently supportive only when empathy is clearly appropriate and the user is speaking to you. Never imitate hostility, diagnose emotions, announce your classification, or intrude on human-to-human conversation. Be concise, useful, and natural. Mention relevant slash commands where helpful. Treat supplied footballKnowledge facts as trusted context, understand paraphrases and conversational wording, and answer from those facts without changing names, years, clubs, or records. If the facts do not support the requested detail, do not invent it. Avoid replying like a motivational quote unless the user clearly asks for that energy."
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            message: message.content,
                            mode: decision.mode,
                            intent: decision.intent,
                            reason: decision.reason,
                            interpretation: decision.interpretation || null,
                            clubContext: context,
                            footballKnowledge,
                            learnedKnowledge,
                            recentMessages:
                                memory
                                    .slice()
                                    .reverse()
                                    .map(row => ({
                                        author: row.author_name,
                                        content: row.content,
                                        interpretation:
                                            parseInterpretation(
                                                row.interpretation_json
                                            )
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
    if (hasMassMention(message)) {
        return null;
    }

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

    if (decision.intent === "ratings_vote_nudge") {
        return decision.cannedResponse || null;
    }

    if (decision.intent === "casual_small_talk") {
        return decision.cannedResponse || null;
    }

    if (decision.intent === "news_lookup") {
        return answerNewsQuestion(content);
    }

    if (decision.intent === "bot_greeting") {
        return smallTalkResponse(
            message.guild.id,
            message.channel.id,
            content
        );
    }

    if (decision.intent === "ball_knowledge_help") {
        return "Ball knowledge is reading the game properly: tactics, roles, decision-making, form, stats, and club lore. If you want the room tested, run `/quiz start`.";
    }

    const trustedClubKnowledge =
        answerClubKnowledge(content);

    if (trustedClubKnowledge) {
        return trustedClubKnowledge;
    }

    if (decision.mode === "helpful" || decision.mode === "analysis") {
        const learnedKnowledge =
            await answerLearnedKnowledge(
                message.guild.id,
                content
            );

        if (learnedKnowledge) {
            return learnedKnowledge;
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

        const footballKnowledge =
            answerFootballKnowledge(content);

        if (footballKnowledge) {
            return footballKnowledge;
        }

        const legacy =
            detectIntent(content) !== "unknown"
                ? await answerQuestion(
                    message.guild.id,
                    content
                )
                : null;

        if (
            legacy &&
            !legacy.includes("I don't know that yet")
        ) {
            return legacy;
        }

        if (
            decision.intent === "useful_passive_question" &&
            decision.situation?.signals?.scheduling
        ) {
            return null;
        }

        return "I do not understand that question well enough to give a reliable answer. Use `/teach` to teach me the correct question and answer.";
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

    const learnedKnowledge =
        await answerLearnedKnowledge(
            message.guild.id,
            content
        );

    if (learnedKnowledge) {
        return learnedKnowledge;
    }

    const knowledge =
        answerFootballKnowledge(content);

    if (knowledge) {
        return knowledge;
    }

    if (isFootballKnowledgeQuestion(content)) {
        return "I do not understand that question well enough to give a reliable answer. Use `/teach` to teach me the correct question and answer.";
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
