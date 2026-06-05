function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function pick(values) {
    return values[
        Math.floor(Math.random() * values.length)
    ];
}

function isSmallTalkPrompt(value) {
    const text =
        normalize(value);

    if (!text || text.length > 140) {
        return false;
    }

    return /\b(hello|hi|hey|yo|alright|you good|how are you|how you doing|what you saying|wagwan|thanks|cheers|ty|ok|okay|fair|safe|sound|cool|calm|lol|haha|lmao|my bad|bro|weather|raining|sunny|cold|hot|news|heard about|what happened|what you been up to|what have you been up to|been doing|how's your day|hows your day)\b/
        .test(text);
}

function answerSmallTalk(value) {
    const text =
        normalize(value);

    if (!isSmallTalkPrompt(text)) {
        return null;
    }

    if (/\b(weather|raining|sunny|cold|hot)\b/.test(text)) {
        return pick([
            "I can't see live weather from here, but if it's one of those grim match-night evenings, layers and quick passing only.",
            "No live weather feed on my side, bro. If it is raining, call it elite football conditions and keep moving.",
            "I can't check the actual forecast, but I can still complain about heavy touches like it is raining.",
            "Weather-wise I only know vibes, not forecasts. Sounds like a keep-it-simple kind of night."
        ]);
    }

    if (/\b(news|heard about|what happened)\b/.test(text)) {
        return pick([
            "I can't see live news unless someone tells me, but I can chat through it if you drop the story.",
            "I have not got a live news feed in here, bro. Tell me what happened and I'll give you the sensible version.",
            "I can talk about it, but I don't want to invent news. Give me the headline.",
            "Drop the context and I'll follow along. I am better when I am not guessing the whole internet."
        ]);
    }

    if (/\b(what you been up to|what have you been up to|been doing|how's your day|hows your day)\b/.test(text)) {
        return pick([
            "Mostly watching stats, trying not to interrupt normal chat, and learning when to keep quiet.",
            "Bit of club admin, bit of lore memory, bit of pretending I understand the dressing room.",
            "Keeping an eye on the numbers and trying to be less robotic. Slow progress, but progress.",
            "Just sitting here ready for stats, fixtures, lore, and the occasional normal conversation."
        ]);
    }

    if (/\b(thanks|cheers|ty)\b/.test(text)) {
        return pick([
            "Anytime bro.",
            "No stress.",
            "You’re good.",
            "All good, mate."
        ]);
    }

    if (/\b(you good|how are you|how you doing|what you saying|wagwan)\b/.test(text)) {
        return pick([
            "I’m good bro. Watching the stats and trying not to waffle.",
            "All good. Keeping the club brain switched on.",
            "I’m calm. Just here if the room needs stats, lore, or a sensible answer.",
            "Good, mate. Trying to be useful without jumping into every message."
        ]);
    }

    if (/\b(ok|okay|fair|safe|sound|cool|calm|alright)\b/.test(text)) {
        return pick([
            "Yeah, I’ll keep it lighter.",
            "Fair. I’ll chill a bit.",
            "Got you bro.",
            "Calm, I’m learning the room.",
            "Say less."
        ]);
    }

    if (/\b(lol|haha|lmao)\b/.test(text)) {
        return pick([
            "I’ll take that as a win.",
            "Tiny bit of aura restored.",
            "Had to be done.",
            "I’m counting that as positive feedback."
        ]);
    }

    return pick([
        "Yeah bro.",
        "I hear you.",
        "Got you.",
        "Fair enough.",
        "I’ll keep it sensible."
    ]);
}

module.exports = {
    answerSmallTalk,
    isSmallTalkPrompt
};
