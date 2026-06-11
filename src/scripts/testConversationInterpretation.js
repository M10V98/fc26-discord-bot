const assert = require("node:assert/strict");

const {
    AUDIENCES,
    EMOTIONS,
    INTENTS,
    RESPONSE_STYLES,
    SOCIAL_CONTEXTS,
    SPEECH_ACTS,
    TONES,
    applyInterpretationGate,
    sanitizeInterpretation
} = require("../Services/conversationInterpretation");
const {
    classifyRuleBased
} = require("../Services/smartAI");

function rule(intent = "not_useful_enough", overrides = {}) {
    return {
        shouldReply: false,
        mode: "silent",
        intent,
        confidence: 0.7,
        reason: "rule",
        situation: {
            direct: false,
            planning: false,
            longStatement: false,
            ...overrides
        }
    };
}

function interpretation(overrides = {}) {
    return sanitizeInterpretation(
        {
            audience: "bot",
            speechAct: "question",
            primaryIntent: "ask_for_fact",
            emotions: ["curious"],
            tone: "friendly",
            socialContext: "direct_bot_help",
            responseStyle: "direct_answer",
            sarcasm: 0,
            hostility: 0,
            urgency: 0,
            certainty: 0.9,
            needsEmpathy: false,
            needsDeescalation: false,
            confidence: 0.95,
            shouldReply: true,
            mode: "helpful",
            impliedMeaning: "Wants a factual answer.",
            reason: "Direct question to the bot.",
            ...overrides
        },
        rule()
    );
}

const combinations =
    AUDIENCES.length *
    SPEECH_ACTS.length *
    INTENTS.length *
    EMOTIONS.length *
    TONES.length *
    SOCIAL_CONTEXTS.length *
    RESPONSE_STYLES.length;

assert.ok(
    combinations > 10_000,
    "Interpretation taxonomy should support thousands of combinations."
);

assert.equal(
    applyInterpretationGate(
        rule(),
        interpretation()
    ).shouldReply,
    true,
    "A confident direct bot question should receive a reply."
);

assert.equal(
    applyInterpretationGate(
        rule(),
        interpretation({
            audience: "specific_human"
        })
    ).shouldReply,
    false,
    "Human-to-human conversation should remain silent."
);

assert.equal(
    applyInterpretationGate(
        rule(),
        interpretation({
            audience: "channel",
            confidence: 0.89
        })
    ).shouldReply,
    false,
    "Passive questions below the high confidence threshold should remain silent."
);

assert.equal(
    applyInterpretationGate(
        rule("bot_meta_chat"),
        interpretation()
    ).shouldReply,
    false,
    "Hard silence rules must override the AI classifier."
);

assert.equal(
    applyInterpretationGate(
        {
            ...rule(),
            shouldReply: true,
            mode: "banter",
            intent: "football_banter"
        },
        interpretation({
            audience: "group",
            speechAct: "joke",
            primaryIntent: "football_banter",
            socialContext: "friendly_banter",
            responseStyle: "playful_banter",
            mode: "banter",
            confidence: 0.9
        })
    ).shouldReply,
    true,
    "Safe ambient football banter selected by the occasional reply rule should be allowed."
);

assert.equal(
    applyInterpretationGate(
        {
            ...rule(),
            shouldReply: true,
            mode: "banter",
            intent: "football_banter"
        },
        interpretation({
            audience: "group",
            speechAct: "teasing",
            primaryIntent: "football_banter",
            hostility: 0.8,
            confidence: 0.95
        })
    ).shouldReply,
    false,
    "Hostile ambient conversation should remain silent."
);

assert.equal(
    applyInterpretationGate(
        rule("news_lookup"),
        interpretation()
    ).intent,
    "news_lookup",
    "Operational intents must be preserved."
);

function discordMessage(content, overrides = {}) {
    return {
        content,
        guild: {
            id: "guild"
        },
        channel: {
            id: "channel"
        },
        author: {
            id: "human",
            username: "Human"
        },
        client: {
            user: {
                id: "bot",
                username: "Bella Ciao FC Bot"
            }
        },
        mentions: {
            everyone: false,
            repliedUser: null,
            users: new Map(),
            ...overrides.mentions
        },
        ...overrides
    };
}

for (const content of [
    "Alright bro",
    "As in World Cup",
    "true true, his passing isnt great for how we build up tho compared to iced",
    "Same Gehad haha. First of all, I should have levelled it up higher than 56"
]) {
    assert.equal(
        classifyRuleBased(discordMessage(content), []).shouldReply,
        false,
        `Normal team chat must stay silent: ${content}`
    );
}

assert.equal(
    classifyRuleBased(
        discordMessage("What is the maximum number of yellow cards before a player is sent off?"),
        []
    ).shouldReply,
    false,
    "An unaddressed general-football question must not bypass the high-confidence AI classifier."
);

assert.equal(
    classifyRuleBased(
        discordMessage("Alright bot, can you explain xG?"),
        []
    ).shouldReply,
    true,
    "A direct bot request should receive a reply."
);

console.log(
    `Conversation interpretation checks passed (${combinations.toLocaleString()} possible taxonomy combinations).`
);
