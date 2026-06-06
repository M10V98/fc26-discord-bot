const conversationByChannel = new Map();
const pairCooldowns = new Map();

const CONVERSATION_WINDOW_MS = 8 * 60 * 1000;
const PAIR_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_CHANNEL_EVENTS = 40;

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/<@!?\d+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function conflictScore(content) {
    const text =
        normalize(content);
    let score = 0;

    if (
        /\b(shut up|stfu|idiot|moron|stupid|dumb|liar|lying|clown|pathetic|delusional|fuck you|fucking idiot|hate you)\b/
            .test(text)
    ) {
        score += 2;
    }

    if (
        /\b(not true|you(?:'re| are) wrong|stop lying|what are you on about|that's bullshit|that is bullshit|prove it|you always|you never)\b/
            .test(text)
    ) {
        score += 1;
    }

    if (
        /^(?:no|nah|wrong|how|why|what)\??$/.test(text) ||
        /^you(?:'re| are)\b/.test(text)
    ) {
        score += 0.5;
    }

    if (/[!?]{3,}/.test(text) || /[A-Z]{8,}/.test(String(content || ""))) {
        score += 0.5;
    }

    return score;
}

function pairKey(firstId, secondId) {
    return [String(firstId), String(secondId)]
        .sort()
        .join(":");
}

async function repliedUserId(message) {
    const referenceId =
        message.reference?.messageId;

    if (!referenceId) {
        return null;
    }

    const referenced =
        await message.channel.messages
            .fetch(referenceId)
            .catch(() => null);

    return referenced?.author?.bot
        ? null
        : referenced?.author?.id || null;
}

async function targetUserId(message) {
    const replyTarget =
        await repliedUserId(message);

    if (replyTarget && replyTarget !== message.author.id) {
        return replyTarget;
    }

    const mentioned =
        message.mentions?.users
            ?.find(user =>
                !user.bot &&
                user.id !== message.author.id
            );

    return mentioned?.id || null;
}

function shouldIntervene(events) {
    if (events.length < 5) {
        return false;
    }

    const authors =
        new Map();
    const hostileAuthors =
        new Set();
    let totalScore = 0;
    let alternations = 0;

    events.forEach((event, index) => {
        authors.set(
            event.authorId,
            (authors.get(event.authorId) || 0) + 1
        );
        totalScore += event.score;

        if (event.score >= 2) {
            hostileAuthors.add(event.authorId);
        }

        if (
            index > 0 &&
            events[index - 1].authorId !== event.authorId
        ) {
            alternations += 1;
        }
    });

    return authors.size === 2 &&
        [...authors.values()].every(count => count >= 2) &&
        hostileAuthors.size === 2 &&
        events.length >= 6 &&
        alternations >= 4 &&
        totalScore >= 7;
}

async function conflictDeescalationResponse(message) {
    const targetId =
        await targetUserId(message);

    if (!targetId) {
        return null;
    }

    const now =
        Date.now();
    const key =
        pairKey(message.author.id, targetId);
    const cooldownKey =
        `${message.guild.id}:${key}`;

    if (
        now - Number(pairCooldowns.get(cooldownKey) || 0) <
        PAIR_COOLDOWN_MS
    ) {
        return null;
    }

    const channelKey =
        `${message.guild.id}:${message.channel.id}`;
    const recent =
        (conversationByChannel.get(channelKey) || [])
            .filter(event =>
                now - event.createdAt <= CONVERSATION_WINDOW_MS
            );

    recent.push({
        authorId: String(message.author.id),
        targetId: String(targetId),
        pair: key,
        score: conflictScore(message.content),
        createdAt: now
    });

    conversationByChannel.set(
        channelKey,
        recent.slice(-MAX_CHANNEL_EVENTS)
    );

    const pairEvents =
        recent.filter(event => event.pair === key);

    if (!shouldIntervene(pairEvents)) {
        return null;
    }

    pairCooldowns.set(cooldownKey, now);

    return "Alright, leave it there now. You have both made your point - take five and move on.";
}

module.exports = {
    conflictDeescalationResponse,
    conflictScore,
    shouldIntervene
};
