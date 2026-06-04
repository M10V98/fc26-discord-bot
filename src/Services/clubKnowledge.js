const CLUB_LORE_QUIZ_QUESTIONS = [
    ["Who wore the number 7 in the 23/24 season?", ["Bean Alejandro", "Ice wizard", "Randy Cabbage", "Shane Syrett"], 0],
    ["Who was nicknamed \"the flying dutchman\"?", ["Shane Syrett", "Bean Alejandro", "Gollum", "Lucas Gough"], 0],
    ["When were both Johny and Kanye our holding midfielders?", ["2023", "1980", "2024", "2025"], 0],
    ["Who are Bella Ciao's rivals?", ["Boys FC", "LOTG FC", "Sainsbury's FC", "VFL Newcastle"], 0],
    ["Si Senor gives the ball to __ and he will score.", ["Bean", "The mighty COG", "Schnitzler", "Fyzo"], 0],
    ["What does CPL stand for?", ["Competitive Pro League", "Nothing", "Competitive Premier League", "Cup Professionally Rigged league"], 0],
    ["Who manages Boys FC?", ["penguin", "Roy Keane", "Pigeon", "Gazz bryant"], 0],
    ["Who \"hates this stadium\"?", ["H411ison", "AOG", "FYZO", "NICOLE"], 0],
    ["Who is the club director of Bella Ciao FC?", ["OlaPola", "Olats", "King", "Gary"], 0]
];

const CLUB_LORE_FACTS = [
    {
        patterns: [
            /\b(number|shirt|kit)\s*7\b/,
            /\b7\b.*\b(23\/24|2023\/24|season)\b/,
            /\b(23\/24|2023\/24)\b.*\b(number|shirt|kit)\s*7\b/,
            /\bwho wore\b.*\b(number|shirt|kit)\b.*\b(23\/24|2023\/24)\b/,
            /\b(23\/24|2023\/24)\b.*\bwho wore\b.*\b(number|shirt|kit)\b/
        ],
        keywords: [
            ["number", "shirt", "kit", "jersey"],
            ["7", "seven"],
            ["23/24", "2023/24", "season"]
        ],
        answer: "Bean Alejandro wore the number 7 in the 23/24 season."
    },
    {
        patterns: [
            /\bflying dutchman\b/,
            /\bnicknamed\b.*\bdutchman\b/
        ],
        keywords: [
            ["flying dutchman", "dutchman"],
            ["nickname", "nicknamed", "called", "known"]
        ],
        answer: "Shane Syrett was nicknamed \"the flying dutchman\"."
    },
    {
        patterns: [
            /\bjohny\b.*\bkanye\b.*\bholding midfielders?\b/,
            /\bholding midfielders?\b.*\bjohny\b.*\bkanye\b/
        ],
        keywords: [
            ["johny"],
            ["kanye"],
            ["holding midfielder", "holding midfielders", "cdm", "midfield"]
        ],
        answer: "Johny and Kanye were both our holding midfielders in 2023."
    },
    {
        patterns: [
            /\bbella ciao'?s?\b.*\brivals?\b/,
            /\brivals?\b.*\bbella ciao\b/
        ],
        keywords: [
            ["rival", "rivals", "rivalry"],
            ["bella ciao", "bella"]
        ],
        answer: "Bella Ciao's rivals are Boys FC."
    },
    {
        patterns: [
            /\bsi senor\b/,
            /\bgives the ball to\b.*\bwill score\b/
        ],
        keywords: [
            ["si senor", "senor"],
            ["ball", "pass", "gives"],
            ["score", "scores"]
        ],
        answer: "Si Senor gives the ball to Bean and he will score."
    },
    {
        patterns: [
            /\bwhat does cpl stand for\b/,
            /\bcpl\b.*\bstand for\b/,
            /\bmeaning of cpl\b/
        ],
        keywords: [
            ["cpl"],
            ["stand for", "stands for", "meaning", "mean", "full name"]
        ],
        answer: "CPL stands for Competitive Pro League."
    },
    {
        patterns: [
            /\bwho manages boys fc\b/,
            /\bboys fc\b.*\bmanager\b/,
            /\bmanager\b.*\bboys fc\b/
        ],
        keywords: [
            ["boys fc", "boys"],
            ["manager", "manages", "managed", "coach", "runs", "owner"]
        ],
        answer: "Penguin manages Boys FC."
    },
    {
        patterns: [
            /\bhates this stadium\b/,
            /\bwho hates\b.*\bstadium\b/
        ],
        keywords: [
            ["hates this stadium", "hate this stadium", "stadium"],
            ["hates", "hate", "said"]
        ],
        answer: "H411ison \"hates this stadium\"."
    },
    {
        patterns: [
            /\bclub director\b.*\bbella ciao\b/,
            /\bbella ciao\b.*\bclub director\b/
        ],
        keywords: [
            ["club director", "director"],
            ["bella ciao", "bella"]
        ],
        answer: "OlaPola is the club director of Bella Ciao FC."
    }
];

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function hasAlias(text, aliases) {
    return aliases.some(alias => {
        const normalized =
            normalize(alias);

        return normalized.length === 1
            ? text.split(" ").includes(normalized)
            : text.includes(normalized);
    });
}

function keywordScore(text, groups) {
    return groups.reduce(
        (score, aliases) =>
            hasAlias(text, aliases)
                ? score + 1
                : score,
        0
    );
}

function answerClubKnowledge(question) {
    const text =
        normalize(question);
    const exactFact =
        CLUB_LORE_FACTS.find(row =>
            row.patterns.some(pattern =>
                pattern.test(text)
            )
        );

    if (exactFact) {
        return exactFact.answer;
    }

    const ranked =
        CLUB_LORE_FACTS
            .map(row => ({
                row,
                score:
                    keywordScore(text, row.keywords || [])
            }))
            .filter(candidate =>
                candidate.score >= Math.min(
                    2,
                    candidate.row.keywords?.length || 2
                )
            )
            .sort((a, b) => b.score - a.score);

    if (
        ranked.length &&
        (
            ranked.length === 1 ||
            ranked[0].score > ranked[1].score
        )
    ) {
        return ranked[0].row.answer;
    }

    return null;
}

function isClubKnowledgeQuestion(question) {
    return Boolean(answerClubKnowledge(question));
}

module.exports = {
    CLUB_LORE_QUIZ_QUESTIONS,
    answerClubKnowledge,
    isClubKnowledgeQuestion
};
