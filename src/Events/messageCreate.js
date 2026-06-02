const {
    answerAutoMessage
} = require("../Services/fakeAI");

let cooldown = 0;

const COOLDOWN_MS = 45000;
const MAX_INPUT_LENGTH = 500;

module.exports = async message => {
    if (message.author.bot || !message.guild) {
        return;
    }

    if (Date.now() - cooldown < COOLDOWN_MS) {
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

    const response =
        await answerAutoMessage(
            message.guild.id,
            content
        );

    if (!response) {
        return;
    }

    cooldown = Date.now();

    await message.reply(response);
};
