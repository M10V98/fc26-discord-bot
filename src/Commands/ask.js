const {
    SlashCommandBuilder
} = require("discord.js");

const {
    answerQuestion,
    detectIntent
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
const {
    answerLearnedKnowledge
} = require("../Services/learnedKnowledge");

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
        const learned =
            !news &&
            !smallTalk
                ? await answerLearnedKnowledge(
                    interaction.guild.id,
                    question
                )
                : null;
        const clubKnowledge =
            !news &&
            !smallTalk &&
            !learned
                ? answerClubKnowledge(question)
                : null;
        const simple =
            !news &&
            !smallTalk &&
            !learned &&
            !clubKnowledge
                ? answerSimpleQuestion(question)
                : null;
        const clubMatch =
            !news &&
            !smallTalk &&
            !learned &&
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
            !learned &&
            !simple &&
            !clubKnowledge &&
            !clubMatch
                ? answerFootballKnowledge(question)
                : null;
        const legacy =
            !news &&
            !smallTalk &&
            !learned &&
            !simple &&
            !clubKnowledge &&
            !clubMatch &&
            !knowledge &&
            !isFootballKnowledgeQuestion(question) &&
            detectIntent(question) !== "unknown"
                ? await answerQuestion(
                interaction.guild.id,
                question
            )
                : null;
        const response =
            news ||
            smallTalk ||
            learned ||
            simple ||
            clubKnowledge ||
            clubMatch ||
            knowledge ||
            legacy ||
            "I do not understand that question well enough to give a reliable answer. Use `/teach` to teach me the correct question and answer.";

        await interaction.editReply(
            response
        );
    }
};
