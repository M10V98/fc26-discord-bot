const fs = require("fs");
const path = require("path");

const SOURCE_DIR =
    path.join(__dirname, "../data/suppliedFootballTrivia");
const OUTPUT =
    path.join(__dirname, "../Services/suppliedFootballTrivia.js");

const ANSWER_LETTERS = ["A", "B", "C", "D"];
const QUESTION_CORRECTIONS = {
    "Which club does Borussia Dortmund play in?":
        "Which country does Borussia Dortmund play in?",
    "Which club does Harry Kane represent internationally?":
        "Which country does Harry Kane represent internationally?",
    "Which player transferred from Southampton to Liverpool in 2014 for around £75 million?":
        "Which player transferred from Southampton to Liverpool for around £75 million?",
    "Which player moved from Borussia Dortmund to Barcelona in 2022?":
        "Which listed player moved from Borussia Dortmund to Barcelona in 2022?",
    "Which player transferred from Ajax to Arsenal in 2022?":
        "Which listed player transferred from Ajax to Arsenal in 2023?",
    "Which player joined Chelsea from Leicester in 2023 for around Â£115 million?":
        "Which player joined Chelsea from Brighton in 2023 for a reported fee of around Â£115 million?",
    "Who was transferred from AtlÃ©tico Madrid to Chelsea in 2017 for around Â£60 million?":
        "Who transferred from Real Madrid to Chelsea in 2017 for a reported fee of around Â£60 million?",
    "Which club plays at the San Siro?":
        "Which listed club plays at the San Siro?",
    "Which stadium hosts the home matches of Argentina?":
        "Which stadium is most closely associated with Argentina's home matches?",
    "Which stadium is home to Dynamo Kyiv?":
        "Which stadium is traditionally associated with Dynamo Kyiv?",
    "Which stadium is home to Shakhtar Donetsk?":
        "Which stadium was Shakhtar Donetsk's home before the club left Donetsk?",
    "Who has the most appearances in La Liga history?":
        "Which listed player shares the record for the most La Liga appearances?",
    "Which club plays at Goodison Park?":
        "Which club played at Goodison Park until 2025?"
};
const ANSWER_CORRECTIONS = {
    "How many officials are typically on the field during a match?":
        "3",
    "Which club is nicknamed \"The Clarets\"?":
        "Burnley",
    "Who holds the record for most Champions League appearances?":
        "Cristiano Ronaldo",
    "Which player transferred from Southampton to Liverpool in 2014 for around £75 million?":
        "Virgil van Dijk",
    "Which player moved from Borussia Dortmund to Barcelona in 2022?":
        "None of the above",
    "Which player transferred from Ajax to Arsenal in 2022?":
        "Jurriën Timber"
};
const EXCLUDED_QUESTIONS = new Set([
    "Which stadium is nicknamed \"The Cathedral of Football\"?",
    "Which club is nicknamed \"The Black and Whites\"?",
    "Which club is nicknamed \"The Red Bulls\"?",
    "Which club is nicknamed \"The Saints\"?",
    "Which club is nicknamed \"The Bees\"?",
    "Which player holds the record for the most appearances in Champions League finals?"
    ,"Which defender became the first Â£50 million defender when moving from Benfica to Manchester City?"
    ,"Which transfer took Gareth Bale from Southampton to Tottenham?"
    ,"Which player moved from Ajax to Manchester United in 2022?"
    ,"Which player moved from Borussia Dortmund to Barcelona in 2022?"
]);
const EXTRA_QUESTIONS = [
    ["Which English club is known as \"The Red Devils\"?", ["Manchester United", "Liverpool", "Arsenal", "Chelsea"], 0],
    ["Which country hosted the 2022 FIFA World Cup?", ["Qatar", "Russia", "Brazil", "South Africa"], 0],
    ["What is the governing body of world football?", ["FIFA", "UEFA", "IFAB", "IOC"], 0],
    ["Who scored the first goal in Premier League history?", ["Brian Deane", "Alan Shearer", "Eric Cantona", "Teddy Sheringham"], 0],
    ["Which club won the inaugural Premier League season?", ["Manchester United", "Arsenal", "Blackburn Rovers", "Liverpool"], 0],
    ["Which club won the Premier League in 2015-16?", ["Leicester City", "Chelsea", "Arsenal", "Manchester City"], 0],
    ["Which goalkeeper has the most Premier League clean sheets?", ["Petr Cech", "David James", "Mark Schwarzer", "David Seaman"], 0],
    ["Which club has won the most Premier League titles?", ["Manchester United", "Manchester City", "Chelsea", "Arsenal"], 0],
    ["Who scored Manchester United's winning goal in the 1999 Champions League final?", ["Ole Gunnar Solskjaer", "Teddy Sheringham", "David Beckham", "Ryan Giggs"], 0],
    ["Which stadium hosted the 2013 Champions League final?", ["Wembley Stadium", "Allianz Arena", "Luzhniki Stadium", "Olympiastadion Berlin"], 0],
    ["Which German club won the Champions League in 2020?", ["Bayern Munich", "Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen"], 0],
    ["Who won the Golden Ball at the 2014 FIFA World Cup?", ["Lionel Messi", "Thomas Muller", "James Rodriguez", "Manuel Neuer"], 0],
    ["Which country hosted the 1994 FIFA World Cup?", ["United States", "Mexico", "Italy", "France"], 0],
    ["Who scored Italy's winning penalty in the 2006 World Cup final shootout?", ["Fabio Grosso", "Andrea Pirlo", "Francesco Totti", "Alessandro Del Piero"], 0],
    ["Which club did Eric Cantona join from Leeds United?", ["Manchester United", "Arsenal", "Liverpool", "Chelsea"], 0],
    ["Who scored both goals in the 2010 Champions League final?", ["Diego Milito", "Samuel Eto'o", "Wesley Sneijder", "Arjen Robben"], 0],
    ["Who scored the winning goal in the 2010 Champions League final?", ["Diego Milito", "Samuel Eto'o", "Wesley Sneijder", "Arjen Robben"], 0],
    ["Which country reached the 2018 World Cup final alongside France?", ["Croatia", "Belgium", "England", "Argentina"], 0],
    ["What is FIFA?", ["The governing body of world football", "A European club competition", "A football stadium", "A domestic league"], 0],
    ["Which club did Zinedine Zidane leave before joining Real Madrid?", ["Juventus", "Bordeaux", "Cannes", "AC Milan"], 0],
    ["Who scored the famous volley in the 2002 Champions League final?", ["Zinedine Zidane", "Raul", "Luis Figo", "Roberto Carlos"], 0],
    ["Which club did Ronaldo Nazario join after leaving Barcelona in 1997?", ["Inter Milan", "Real Madrid", "AC Milan", "PSV Eindhoven"], 0]
];

function normalizeQuestion(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function clarifyQuestion(question) {
    const clarified =
        question
        .replace(
            /^Which club is (known as|nicknamed) /,
            "Which listed club is $1 "
        )
        .replace(
            /^Which club's nickname is /,
            "Which listed club's nickname is "
        );

    if (/joined Chelsea from Leicester in 2023/i.test(clarified)) {
        return "Which player joined Chelsea from Brighton in 2023 for a reported fee of around £115 million?";
    }

    if (/transferred from Atlético Madrid to Chelsea in 2017/i.test(clarified)) {
        return "Who transferred from Real Madrid to Chelsea in 2017 for a reported fee of around £60 million?";
    }

    return clarified;
}

function isExcludedQuestion(question) {
    return EXCLUDED_QUESTIONS.has(question) ||
        /first £50 million defender/i.test(question) ||
        /Which transfer took Gareth Bale from Southampton to Tottenham/i.test(question) ||
        /moved from Ajax to Manchester United in 2022/i.test(question) ||
        /moved from Borussia Dortmund to Barcelona in 2022/i.test(question) ||
        /How many officials are typically on the field during a match/i.test(question) ||
        /Which club is nicknamed "The Blue Moon"/i.test(question);
}

function parseFile(file) {
    const text =
        fs.readFileSync(file, "utf8")
            .replace(/\r/g, "");
    const blocks =
        text.split(/\n(?=\d+\n)/);
    const questions = [];

    for (const block of blocks) {
        const lines =
            block.split("\n")
                .map(line => line.trim())
                .filter(Boolean);
        const answerLine =
            lines.find(line => /^Answer:\s*[A-D]$/i.test(line));
        const choices =
            lines.filter(line => /^[A-D]\)\s+/.test(line));

        if (!answerLine || choices.length !== 4) {
            continue;
        }

        const firstChoice =
            lines.findIndex(line => /^[A-D]\)\s+/.test(line));
        const question =
            normalizeQuestion(
                lines
                    .slice(1, firstChoice)
                    .join(" ")
            );

        if (!question || isExcludedQuestion(question)) {
            continue;
        }

        const answers =
            choices.map(line =>
                line.replace(/^[A-D]\)\s+/, "")
            );
        const suppliedCorrect =
            answers[
                ANSWER_LETTERS.indexOf(
                    answerLine.slice(-1).toUpperCase()
                )
            ];
        const correct =
            ANSWER_CORRECTIONS[question] || suppliedCorrect;
        const correctedQuestion =
            clarifyQuestion(
                QUESTION_CORRECTIONS[question] || question
            );
        const correctIndex =
            answers.indexOf(correct);

        if (correctIndex === -1) {
            throw new Error(
                `Correct answer "${correct}" is not an option for "${question}"`
            );
        }

        questions.push([
            correctedQuestion,
            answers,
            correctIndex
        ]);
    }

    return questions;
}

function key(question) {
    return question
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function reverseStadiumQuestions(questions) {
    const stadiums =
        questions
            .map(([question]) =>
                question.match(
                    /^Which club (?:plays(?: its home matches)? at|has its home ground at) (.+)\?$/
                )?.[1]
            )
            .filter(Boolean);

    return questions
        .map(([question, answers, correctIndex], index) => {
            const stadium =
                question.match(
                    /^Which club (?:plays(?: its home matches)? at|has its home ground at) (.+)\?$/
                )?.[1];

            if (!stadium) {
                return null;
            }

            const club =
                answers[correctIndex];
            const distractors =
                stadiums
                    .filter(value => value !== stadium)
                    .slice(index % Math.max(stadiums.length, 1))
                    .concat(stadiums)
                    .filter(value => value !== stadium)
                    .slice(0, 3);

            if (distractors.length < 3) {
                return null;
            }

            return [
                `Which stadium does ${club} play at?`,
                [stadium, ...distractors],
                0
            ];
        })
        .filter(Boolean);
}

function main() {
    const files =
        fs.readdirSync(SOURCE_DIR)
            .filter(file => file.endsWith(".txt"))
            .map(file => path.join(SOURCE_DIR, file));
    const unique = new Map();

    const imported = [
        ...files.flatMap(parseFile),
        ...EXTRA_QUESTIONS
    ];

    for (const question of [
        ...imported,
        ...reverseStadiumQuestions(imported)
    ]) {
        unique.set(key(question[0]), question);
    }

    const questions =
        [...unique.values()];
    const facts =
        questions.map(([question, answers, correctIndex]) =>
            `${question} ${answers[correctIndex]}`
        );
    const output = [
        "// Generated from football trivia supplied by the bot owner.",
        "",
        `const SUPPLIED_FOOTBALL_TRIVIA = ${JSON.stringify(questions, null, 4)};`,
        "",
        `const SUPPLIED_FOOTBALL_FACTS = ${JSON.stringify(facts, null, 4)};`,
        "",
        "module.exports = {",
        "    SUPPLIED_FOOTBALL_FACTS,",
        "    SUPPLIED_FOOTBALL_TRIVIA",
        "};",
        ""
    ].join("\n");

    fs.writeFileSync(OUTPUT, output, "utf8");
    console.log(`Wrote ${questions.length} unique supplied trivia questions.`);
}

main();
