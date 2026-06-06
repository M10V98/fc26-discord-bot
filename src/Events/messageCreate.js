const {
    answerSmartMessage
} = require("../Services/smartAI");
const {
    conflictDeescalationResponse
} = require("../Services/conflictDeescalation");

const cooldowns = new Map();

const COOLDOWN_MS = 5000;
const MAX_INPUT_LENGTH = 500;
module.exports = async message => {

    if (
        message.author.bot ||
        !message.guild
    ) {
        return;
    }

    try {
        const deescalation =
            await conflictDeescalationResponse(message);

        if (deescalation) {
            cooldowns.set(
                message.guild.id,
                Date.now()
            );

            return await message.reply({
                content: deescalation,
                allowedMentions: {
                    parse: []
                }
            });
        }
    } catch (err) {
        console.error(
            "conflict de-escalation error:",
            err
        );
    }

    const guildId = message.guild.id;

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

    if (!content) {
        return;
    }

    if (message.mentions?.everyone || /@(everyone|here)\b/i.test(message.content || "")) {
        return;
    }

    try {

        const aiResponse =
            await answerSmartMessage(message);

        if (aiResponse) {

            cooldowns.set(
                guildId,
                Date.now()
            );

            return await message.reply({
                content: aiResponse,
                allowedMentions: {
                    parse: []
                }
            });
        }
    } catch (err) {

        console.error(
            "messageCreate error:",
            err
        );

    }
};
