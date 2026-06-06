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
        rule("news_lookup"),
        interpretation()
    ).intent,
    "news_lookup",
    "Operational intents must be preserved."
);

console.log(
    `Conversation interpretation checks passed (${combinations.toLocaleString()} possible taxonomy combinations).`
);
