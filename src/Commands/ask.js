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
const {
    answerSmallTalk
} = require("../Services/smallTalk");
const {
    answerNewsQuestion
} = require("../Services/newsService");

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

        const news =
            await answerNewsQuestion(question);
        const smallTalk =
            !news
                ? answerSmallTalk(question)
                : null;
        const clubKnowledge =
            !news &&
            !smallTalk
                ? answerClubKnowledge(question)
                : null;
        const simple =
            !news &&
            !smallTalk &&
            !clubKnowledge
                ? answerSimpleQuestion(question)
                : null;
        const clubMatch =
            !news &&
            !smallTalk &&
            !simple &&
            !clubKnowledge
                ? await answerClubMatchQuestion(
                    interaction.guild.id,
                    question
                )
                : null;
        const knowledge =
            !news &&
            !smallTalk &&
            !clubKnowledge &&
            !clubMatch
                ? answerFootballKnowledge(question)
                : null;
        const legacy =
            !news &&
            !smallTalk &&
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
            news ||
            smallTalk ||
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
