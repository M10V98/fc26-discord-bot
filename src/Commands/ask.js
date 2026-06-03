const {
    SlashCommandBuilder
} = require("discord.js");

const {
    answerQuestion
} = require("../Services/fakeAI");
const {
    answerFootballKnowledge,
    isFootballKnowledgeQuestion
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

        const simple =
            answerSimpleQuestion(question);
        const knowledge =
            answerFootballKnowledge(question);
        const legacy =
            !simple &&
            !knowledge &&
            !isFootballKnowledgeQuestion(question)
                ? await answerQuestion(
                interaction.guild.id,
                question
            )
                : null;
        const response =
            simple ||
            knowledge ||
            legacy ||
            "I do not have that football history fact stored yet.";

        await interaction.editReply(
            response
        );
    }
};
