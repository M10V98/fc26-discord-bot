const AUDIENCES = [
    "bot",
    "specific_human",
    "group",
    "channel",
    "self",
    "unclear"
];

const SPEECH_ACTS = [
    "question",
    "request",
    "command",
    "greeting",
    "thanks",
    "apology",
    "complaint",
    "criticism",
    "correction",
    "agreement",
    "disagreement",
    "joke",
    "teasing",
    "boast",
    "celebration",
    "encouragement",
    "reassurance",
    "sympathy",
    "warning",
    "threat",
    "planning",
    "suggestion",
    "offer",
    "promise",
    "information",
    "story",
    "opinion",
    "rhetorical_question",
    "reaction",
    "other"
];

const INTENTS = [
    "ask_for_fact",
    "ask_for_explanation",
    "ask_for_help",
    "ask_for_action",
    "ask_for_opinion",
    "ask_for_confirmation",
    "continue_bot_conversation",
    "greet_bot",
    "thank_bot",
    "correct_bot",
    "criticise_bot",
    "discuss_bot",
    "club_stats",
    "club_lore",
    "football_knowledge",
    "football_banter",
    "social_banter",
    "share_information",
    "coordinate_people",
    "express_emotion",
    "vent",
    "joke",
    "provoke",
    "moderation",
    "unclear"
];

const EMOTIONS = [
    "neutral",
    "amused",
    "happy",
    "excited",
    "proud",
    "grateful",
    "hopeful",
    "curious",
    "confused",
    "surprised",
    "disappointed",
    "frustrated",
    "annoyed",
    "angry",
    "sad",
    "worried",
    "embarrassed",
    "apologetic",
    "skeptical",
    "sarcastic",
    "playful",
    "supportive",
    "hostile",
    "dismissive",
    "unclear"
];

const MODES = [
    "silent",
    "helpful",
    "analysis",
    "banter",
    "small_talk"
];

const TONES = [
    "neutral",
    "casual",
    "friendly",
    "playful",
    "deadpan",
    "sarcastic",
    "excited",
    "confused",
    "frustrated",
    "angry",
    "sad",
    "worried",
    "serious",
    "formal",
    "dismissive",
    "confrontational",
    "supportive",
    "apologetic",
    "celebratory",
    "unclear"
];

const SOCIAL_CONTEXTS = [
    "direct_bot_help",
    "active_bot_conversation",
    "human_to_human",
    "group_discussion",
    "friendly_banter",
    "competitive_banter",
    "conflict",
    "emotional_support",
    "planning",
    "moderation",
    "public_announcement",
    "unclear"
];

const RESPONSE_STYLES = [
    "no_reply",
    "direct_answer",
    "brief_explanation",
    "detailed_explanation",
    "clarifying_question",
    "friendly_acknowledgement",
    "playful_banter",
    "gentle_correction",
    "empathetic_support",
    "calm_deescalation"
];

const HARD_SILENCE_INTENTS = new Set([
    "mass_mention",
    "attachment_only",
    "planning_admin_chat",
    "bot_meta_chat",
    "sensitive_human_context",
    "long_human_statement"
]);

function enumValue(value, allowed, fallback) {
    return allowed.includes(value)
        ? value
        : fallback;
}

function probability(value, fallback = 0) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? Math.max(0, Math.min(1, number))
        : fallback;
}

function compactText(value, limit) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit);
}

function interpretationPrompt() {
    return [
        "Interpret the social meaning of one Discord message using its context.",
        "Work out who is being spoken to, including whether 'you', 'bot', or a reply refers to the bot or another person.",
        "Distinguish direct speech from people merely discussing the bot.",
        "Detect implied meaning, jokes, teasing, rhetorical questions, sarcasm, mixed emotions, and complex requests.",
        "Do not treat the word 'bot' alone as proof that the bot is addressed.",
        "Be conservative: ordinary human conversation, emotional conversations between people, planning, and unclear messages should stay silent.",
        "A direct bot question or request may receive a reply. A useful unaddressed football fact question may receive a reply only with very high confidence.",
        "Return JSON only.",
        `audience must be one of: ${AUDIENCES.join(", ")}`,
        `speechAct must be one of: ${SPEECH_ACTS.join(", ")}`,
        `primaryIntent must be one of: ${INTENTS.join(", ")}`,
        `emotions must contain up to 3 of: ${EMOTIONS.join(", ")}`,
        `tone must be one of: ${TONES.join(", ")}`,
        `socialContext must be one of: ${SOCIAL_CONTEXTS.join(", ")}`,
        `responseStyle must be one of: ${RESPONSE_STYLES.join(", ")}`,
        `mode must be one of: ${MODES.join(", ")}`,
        "Required shape: {audience, speechAct, primaryIntent, emotions, tone, socialContext, responseStyle, sarcasm, hostility, urgency, certainty, needsEmpathy, needsDeescalation, confidence, shouldReply, mode, impliedMeaning, reason}.",
        "sarcasm, hostility, urgency, certainty, and confidence are numbers from 0 to 1. shouldReply, needsEmpathy, and needsDeescalation are boolean."
    ].join("\n");
}

function sanitizeInterpretation(parsed, ruleDecision) {
    const emotions =
        Array.isArray(parsed?.emotions)
            ? parsed.emotions
                .filter(value => EMOTIONS.includes(value))
                .slice(0, 3)
            : [];

    return {
        audience:
            enumValue(parsed?.audience, AUDIENCES, "unclear"),
        speechAct:
            enumValue(parsed?.speechAct, SPEECH_ACTS, "other"),
        primaryIntent:
            enumValue(parsed?.primaryIntent, INTENTS, "unclear"),
        emotions:
            emotions.length
                ? emotions
                : ["unclear"],
        tone:
            enumValue(parsed?.tone, TONES, "unclear"),
        socialContext:
            enumValue(
                parsed?.socialContext,
                SOCIAL_CONTEXTS,
                "unclear"
            ),
        responseStyle:
            enumValue(
                parsed?.responseStyle,
                RESPONSE_STYLES,
                "no_reply"
            ),
        sarcasm:
            probability(parsed?.sarcasm),
        hostility:
            probability(parsed?.hostility),
        urgency:
            probability(parsed?.urgency),
        certainty:
            probability(parsed?.certainty),
        needsEmpathy:
            parsed?.needsEmpathy === true,
        needsDeescalation:
            parsed?.needsDeescalation === true,
        confidence:
            probability(parsed?.confidence, ruleDecision.confidence),
        shouldReply:
            parsed?.shouldReply === true,
        mode:
            enumValue(parsed?.mode, MODES, ruleDecision.mode),
        impliedMeaning:
            compactText(parsed?.impliedMeaning, 240),
        reason:
            compactText(parsed?.reason, 240)
    };
}

function applyInterpretationGate(ruleDecision, interpretation) {
    if (HARD_SILENCE_INTENTS.has(ruleDecision.intent)) {
        return {
            ...ruleDecision,
            interpretation
        };
    }

    const situation =
        ruleDecision.situation || {};
    const directToBot =
        interpretation.audience === "bot";
    const audienceAllowsPassiveReply =
        [
            "group",
            "channel",
            "unclear"
        ].includes(interpretation.audience);
    const usefulPassiveQuestion =
        audienceAllowsPassiveReply &&
        interpretation.speechAct === "question" &&
        [
            "ask_for_fact",
            "ask_for_explanation",
            "club_stats",
            "club_lore",
            "football_knowledge"
        ].includes(interpretation.primaryIntent) &&
        !situation.planning &&
        !situation.longStatement;
    const threshold =
        directToBot
            ? 0.68
            : usefulPassiveQuestion
                ? 0.9
                : 1;
    const shouldReply =
        interpretation.shouldReply &&
        interpretation.confidence >= threshold &&
        (
            directToBot ||
            usefulPassiveQuestion
        );
    const replaceableRuleIntents =
        new Set([
            "unknown",
            "not_useful_enough",
            "useful_passive_question",
            "football_banter"
        ]);

    return {
        ...ruleDecision,
        shouldReply,
        mode:
            shouldReply
                ? interpretation.mode
                : "silent",
        intent:
            shouldReply &&
            replaceableRuleIntents.has(ruleDecision.intent) &&
            interpretation.primaryIntent !== "unclear"
                ? interpretation.primaryIntent
                : ruleDecision.intent,
        confidence:
            interpretation.confidence,
        reason:
            interpretation.reason ||
            ruleDecision.reason,
        interpretation,
        situation: {
            ...situation,
            interpretation
        }
    };
}

module.exports = {
    AUDIENCES,
    EMOTIONS,
    INTENTS,
    MODES,
    RESPONSE_STYLES,
    SOCIAL_CONTEXTS,
    SPEECH_ACTS,
    TONES,
    applyInterpretationGate,
    interpretationPrompt,
    sanitizeInterpretation
};
