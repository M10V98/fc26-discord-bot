const {
    SlashCommandBuilder
} = require("discord.js");

const MAX_QUESTION_LENGTH = 600;
const MAX_REPLY_LENGTH = 1900;

const ASK_AI_INSTRUCTIONS =
    "You are a helpful AI assistant inside a Discord bot for an EA FC Pro Clubs server. " +
    "Answer clearly and directly. Keep replies useful, friendly, and concise. " +
    "If the question is about football, Pro Clubs, tactics, player builds, or team culture, " +
    "lean into practical football advice. Do not invent private server data you were not given.";

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask the bot AI a question")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("What do you want to ask?")
                .setRequired(true)
                .setMaxLength(MAX_QUESTION_LENGTH)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            if (!process.env.OPENAI_API_KEY) {
                return interaction.editReply(
                    "AI is not configured yet. Add OPENAI_API_KEY in Railway."
                );
            }

            const question =
                interaction.options.getString("question");

            const model =
                process.env.OPENAI_MODEL ||
                "gpt-5.4-nano";

            const response = await fetch(
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
                        max_output_tokens: 450,
                        instructions: ASK_AI_INSTRUCTIONS,
                        input:
                            `${interaction.user.username} asked: ` +
                            `"${question}"`
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

            const answer =
                extractResponseText(data);

            await interaction.editReply(
                answer
                    ? answer.slice(0, MAX_REPLY_LENGTH)
                    : "I could not generate an answer for that."
            );

        } catch (err) {
            console.error("ask command error:", err);

            await interaction.editReply(
                "AI request failed. Check the bot logs for details."
            );
        }
    }
};
