const {
    SlashCommandBuilder
} = require("discord.js");

const {
    answerQuestion
} = require("../Services/fakeAI");
const {
    answerClubMatchQuestion
} = require("../Services/clubMatchQuestions");
const {
    answerFootballKnowledge,
    isFootballKnowledgeQuestion
} = require("../Services/footballKnowledge");
const {
    answerClubKnowledge
} = require("../Services/clubKnowledge");
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

        const clubKnowledge =
            answerClubKnowledge(question);
        const simple =
            !clubKnowledge
                ? answerSimpleQuestion(question)
                : null;
        const clubMatch =
            !simple &&
            !clubKnowledge
                ? await answerClubMatchQuestion(
                    interaction.guild.id,
                    question
                )
                : null;
        const knowledge =
            !clubKnowledge &&
            !clubMatch
                ? answerFootballKnowledge(question)
                : null;
        const legacy =
            !simple &&
            !clubKnowledge &&
            !clubMatch &&
            !knowledge &&
            !isFootballKnowledgeQuestion(question)
                ? await answerQuestion(
                interaction.guild.id,
                question
            )
                : null;
        const response =
            simple ||
            clubKnowledge ||
            clubMatch ||
            knowledge ||
            legacy ||
            "I do not have that football history fact stored yet.";

        await interaction.editReply(
            response
        );
    }
};
