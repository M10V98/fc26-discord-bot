const {
    footballReplies,
    footballTriggers
} = require("../Services/footballBrain");

const triggers = footballTriggers;

let cooldown = 0;

module.exports = async message => {

    if (message.author.bot) {
        return;
    }

    const text = message.content.toLowerCase();

    if (Date.now() - cooldown < 20000) {
        return;
    }

    for (const category of Object.keys(triggers)) {

        const words = triggers[category];

        if (words.some(word => text.includes(word))) {

            cooldown = Date.now();

            const responses = footballReplies[category];

            const reply =
                responses[
                    Math.floor(
                        Math.random() * responses.length
                    )
                ];

            await message.reply(reply);
            return;
        }
    }

    if (Math.random() < 0.005) {

        cooldown = Date.now();

        const randomThoughts = [
            "⚫⚪ Massive club.",
            "🏆 Another trophy incoming.",
            "📈 Standards remain high.",
            "🔥 Trust the process.",
            "⚽ Football heritage."
        ];

        await message.reply(
            randomThoughts[
                Math.floor(
                    Math.random() *
                    randomThoughts.length
                )
            ]
        );
    }
};