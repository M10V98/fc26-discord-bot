const {
    LEAGUE_TABLES,
    LEAGUES
} = require("../Services/footballHistoryData");
const {
    GENERATED_FOOTBALL_QUIZ_QUESTIONS
} = require("../Services/generatedFootballQuiz");
const {
    SUPPLIED_FOOTBALL_TRIVIA
} = require("../Services/suppliedFootballTrivia");

const knownBadPatterns = [
    /joined Chelsea from Leicester in 2023/i,
    /transferred from Atlético Madrid to Chelsea in 2017/i,
    /first £50 million defender/i,
    /Which transfer took Gareth Bale from Southampton to Tottenham/i,
    /moved from Ajax to Manchester United in 2022/i,
    /moved from Borussia Dortmund to Barcelona in 2022/i,
    /Who has the most appearances in La Liga history/i,
    /Which club plays at Goodison Park/i,
    /Which stadium is home to Shakhtar Donetsk/i,
    /How many officials are typically on the field during a match/i,
    /Which (?:listed )?club is nicknamed "The Blue Moon"/i
];

function auditQuestions(label, questions) {
    const seen = new Set();

    questions.forEach(([question, answers, correctIndex], index) => {
        if (
            !question ||
            !Array.isArray(answers) ||
            answers.length !== 4 ||
            !Number.isInteger(correctIndex) ||
            correctIndex < 0 ||
            correctIndex > 3
        ) {
            throw new Error(`${label} question ${index + 1} is malformed.`);
        }

        if (new Set(answers.map(answer => String(answer).toLowerCase())).size !== 4) {
            throw new Error(`${label} question ${index + 1} has duplicate answers.`);
        }

        const key =
            question
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .trim();

        if (seen.has(key)) {
            throw new Error(`${label} contains duplicate question: ${question}`);
        }

        if (knownBadPatterns.some(pattern => pattern.test(question))) {
            throw new Error(`${label} contains rejected question: ${question}`);
        }

        seen.add(key);
    });
}

auditQuestions("Supplied trivia", SUPPLIED_FOOTBALL_TRIVIA);
auditQuestions("Generated trivia", GENERATED_FOOTBALL_QUIZ_QUESTIONS);

for (const [league, seasons] of Object.entries(LEAGUE_TABLES || {})) {
    for (const [year, table] of Object.entries(seasons || {})) {
        const winner =
            LEAGUES[league]?.winners?.[year];

        if (winner && table[0] !== winner) {
            throw new Error(
                `${league} ${year} table winner ${table[0]} does not match ${winner}.`
            );
        }
    }
}

console.log(
    `Football trivia audit passed: ${SUPPLIED_FOOTBALL_TRIVIA.length} supplied and ${GENERATED_FOOTBALL_QUIZ_QUESTIONS.length} generated questions.`
);
