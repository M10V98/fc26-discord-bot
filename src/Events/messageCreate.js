const {
answerAutoMessage
} = require("../Services/fakeAI");

const {
getFootballReply
} = require("../Services/footballBrain");

const cooldowns = new Map();

const COOLDOWN_MS = 5000;
const MAX_INPUT_LENGTH = 500;
const FOOTBALL_REPLY_CHANCE = 0.25;

module.exports = async message => {

```
if (
    message.author.bot ||
    !message.guild
) {
    return;
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

try {

    const aiResponse =
        await answerAutoMessage(
            guildId,
            content
        );

    if (aiResponse) {

        cooldowns.set(
            guildId,
            Date.now()
        );

        return await message.reply(
            aiResponse
        );
    }

    const footballReply =
        getFootballReply(content);

    if (
        footballReply &&
        Math.random() <
            FOOTBALL_REPLY_CHANCE
    ) {

        cooldowns.set(
            guildId,
            Date.now()
        );

        return await message.reply(
            footballReply
        );
    }

} catch (err) {

    console.error(
        "messageCreate error:",
        err
    );

}
```

};
