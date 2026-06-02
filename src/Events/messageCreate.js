const {
    answerAutoMessage
} = require("../Services/fakeAI");

const {
    getFootballReply
} = require("../Services/footballBrain");

console.log("messageCreate.js loaded");

const cooldowns = new Map();

const COOLDOWN_MS = 15000;
const MAX_INPUT_LENGTH = 500;
const FOOTBALL_REPLY_CHANCE = 1.0; // force replies while testing

module.exports = async message => {

    console.log(
        "MESSAGE:",
        message.content
    );

    if (
        message.author.bot ||
        !message.guild
    ) {
        return;
    }

    const guildId =
        message.guild.id;

    const lastReply =
        cooldowns.get(guildId) || 0;

    if (
        Date.now() - lastReply <
        COOLDOWN_MS
    ) {
        return;
    }

    const content =
        String(message.content || "")
            .replace(/<@!?\d+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, MAX_INPUT_LENGTH);

    try {

        const aiResponse =
            await answerAutoMessage(
                guildId,
                content
            );

        console.log(
            "AI RESPONSE:",
            aiResponse
        );

        if (aiResponse) {

            cooldowns.set(
                guildId,
                Date.now()
            );

            return message.reply(
                aiResponse
            );
        }

        const footballReply =
            getFootballReply(content);

        console.log(
            "FOOTBALL RESPONSE:",
            footballReply
        );

        if (footballReply) {

            cooldowns.set(
                guildId,
                Date.now()
            );

            return message.reply(
                footballReply
            );
        }

    } catch (err) {

        console.error(
            "MESSAGECREATE ERROR:",
            err
        );

    }
};