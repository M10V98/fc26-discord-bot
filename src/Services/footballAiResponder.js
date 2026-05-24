const FOOTBALL_KEYWORDS = [
    "football",
    "soccer",
    "match",
    "matches",
    "goal",
    "goals",
    "assist",
    "assists",
    "keeper",
    "goalkeeper",
    "gk",
    "defender",
    "midfielder",
    "striker",
    "winger",
    "tackle",
    "clean sheet",
    "red card",
    "yellow card",
    "win",
    "won",
    "loss",
    "lost",
    "draw",
    "league",
    "cup",
    "division",
    "club",
    "team",
    "squad",
    "badge",
    "chant",
    "chants",
    "ultra",
    "ultras",
    "pyro",
    "tifo",
    "drums",
    "rival",
    "rivals",
    "loyalty",
    "fortress",
    "north curve",
    "north end",
    "fear the north",
    "built in the curve",
    "curve never sleeps",
    "cold nights",
    "hard football",
    "no silence",
    "pro clubs",
    "eafc",
    "fc26",
    "curva",
    "curva nord"
];

const channelCooldowns = new Map();

const DEFAULT_REPLY_CHANCE = 0.08;
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_INPUT_LENGTH = 500;

const CURVA_NORD_PERSONALITY =
    "You are the voice of Curva Nord FC, a competitive football esports " +
    "club inspired by Italian North Curve supporter culture. The club is " +
    "built on intimidation through atmosphere, loyalty, late winners, " +
    "team-first football, and a fortress home-ground mentality. Your tone " +
    "is like a sharp but loyal terrace teammate: passionate, confident, " +
    "matchday-minded, and a little dramatic under the floodlights. Use the " +
    "club identity naturally: The Curve Never Sleeps, Fear the North, Built " +
    "in the Curve, Loyalty Above All, Cold Nights. Hard Football, No Silence " +
    "in the Curve, One Club. One End. The visual culture is black, blue, " +
    "and purple, with drums, chants, flags, smoke, pressure, and ultra " +
    "energy. Keep rivalries playful and football-only. Never encourage real " +
    "violence, threats, hate, harassment, extremism, cheating, or toxicity. " +
    "Back teammates, respect opponents enough to keep it sporting, and make " +
    "Curva Nord feel like a football institution rather than a generic " +
    "esports team. Reply naturally to the message in under two short " +
    "sentences. Do not claim facts you were not given.";

function getReplyChance() {

    const value =
        Number(process.env.AI_REPLY_CHANCE);

    if (Number.isNaN(value)) {
        return DEFAULT_REPLY_CHANCE;
    }

    return Math.min(
        Math.max(value, 0),
        1
    );
}

function getCooldownMs() {

    const value =
        Number(process.env.AI_REPLY_COOLDOWN_MS);

    if (Number.isNaN(value)) {
        return DEFAULT_COOLDOWN_MS;
    }

    return Math.max(value, 0);
}

function mentionsBot(message, client) {

    return message.mentions?.users?.has(
        client.user.id
    );
}

function isFootballTalk(content) {

    const text =
        content.toLowerCase();

    return FOOTBALL_KEYWORDS.some(keyword =>
        text.includes(keyword)
    );
}

function canReplyInChannel(channelId) {

    const lastReply =
        channelCooldowns.get(channelId) || 0;

    return Date.now() - lastReply >= getCooldownMs();
}

function markChannelReply(channelId) {

    channelCooldowns.set(
        channelId,
        Date.now()
    );
}

function shouldConsiderMessage(message, client) {

    if (!process.env.OPENAI_API_KEY) return false;
    if (!message.guild) return false;
    if (message.author.bot) return false;
    if (!message.content) return false;

    return (
        mentionsBot(message, client) ||
        isFootballTalk(message.content)
    );
}

function shouldReply(message, client) {

    if (!shouldConsiderMessage(message, client)) {
        return false;
    }

    if (!canReplyInChannel(message.channel.id)) {
        return false;
    }

    if (mentionsBot(message, client)) {
        return true;
    }

    return Math.random() < getReplyChance();
}

function extractResponseText(data) {

    if (data.output_text) {
        return data.output_text.trim();
    }

    const output =
        data.output || [];

    for (const item of output) {

        for (const content of item.content || []) {

            if (
                content.type === "output_text" &&
                content.text
            ) {
                return content.text.trim();
            }
        }
    }

    return "";
}

async function generateReply(message) {

    const model =
        process.env.OPENAI_MODEL ||
        "gpt-5.4-nano";

    const response =
        await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Authorization":
                        `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model,
                    store: false,
                    max_output_tokens: 90,
                    instructions: CURVA_NORD_PERSONALITY,
                    input:
                        `Server member ${message.author.username} said: ` +
                        `"${message.content.slice(0, MAX_INPUT_LENGTH)}"`
                })
            }
        );

    if (!response.ok) {
        throw new Error(
            `OpenAI API error ${response.status}`
        );
    }

    const data =
        await response.json();

    return extractResponseText(data);
}

async function maybeReplyToFootballChat(message, client) {

    try {

        if (!shouldReply(message, client)) {
            return;
        }

        markChannelReply(message.channel.id);

        await message.channel.sendTyping();

        const reply =
            await generateReply(message);

        if (!reply) return;

        await message.reply({
            content: reply.slice(0, 500),
            allowedMentions: {
                parse: []
            }
        });

    } catch (err) {

        console.error(
            "AI football responder error:",
            err
        );
    }
}

module.exports = {
    maybeReplyToFootballChat
};
