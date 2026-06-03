const {
    SlashCommandBuilder
} = require("discord.js");

const {
    answerQuestion
} = require("../Services/fakeAI");
const {
    answerFootballKnowledge
} = require("../Services/footballKnowledge");
const {
    answerSimpleQuestion
} = require("../Services/simpleAnswers");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask the club assistant")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Your question")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply();

        const question =
            interaction.options.getString(
                "question"
            );

        const response =
            answerSimpleQuestion(question) ||
            answerFootballKnowledge(question) ||
            await answerQuestion(
                interaction.guild.id,
                question
            );

        await interaction.editReply(
            response
        );
    }
};
