const {
    AWARDS,
    COMPETITIONS,
    LEAGUE_AWARDS,
    LEAGUE_TABLES,
    LEAGUES
} = require("./footballHistoryData");

function ordinalSuffix(value) {
    const number =
        Number(value);
    const mod100 =
        number % 100;

    if (mod100 >= 11 && mod100 <= 13) {
        return "th";
    }

    return {
        1: "st",
        2: "nd",
        3: "rd"
    }[number % 10] || "th";
}

function ordinal(value) {
    return `${value}${ordinalSuffix(value)}`;
}

function uniqueAnswers(correct, candidates) {
    const seen =
        new Set([String(correct).toLowerCase()]);
    const answers =
        [correct];

    for (const candidate of candidates) {
        const value =
            String(candidate || "").trim();
        const key =
            value.toLowerCase();

        if (!value || seen.has(key)) {
            continue;
        }

        seen.add(key);
        answers.push(value);

        if (answers.length === 4) {
            return answers;
        }
    }

    return null;
}

function rotate(values, offset) {
    if (!values.length) {
        return [];
    }

    const start =
        offset % values.length;

    return [
        ...values.slice(start),
        ...values.slice(0, start)
    ];
}

function awardAnswer(award) {
    return award.winners
        .map(winner => {
            const club =
                award.clubs?.[winner];

            return club
                ? `${winner} (${club})`
                : winner;
        })
        .join(" and ");
}

function leagueLabel(leagueKey, year) {
    if (leagueKey === "england") {
        return Number(year) < 1993
            ? "Football League First Division"
            : "Premier League";
    }

    return LEAGUES[leagueKey]?.label || leagueKey;
}

function tableQuestions() {
    const questions = [];

    for (const [leagueKey, seasons] of Object.entries(LEAGUE_TABLES)) {
        const label =
            year => leagueLabel(leagueKey, year);

        for (const [year, table] of Object.entries(seasons || {})) {
            const seasonLabel =
                label(year);
            table.forEach((team, index) => {
                const answers =
                    uniqueAnswers(
                        team,
                        rotate(
                            table.filter(value => value !== team),
                            index
                        )
                    );

                if (!answers) {
                    return;
                }

                const factKey =
                    `table:${leagueKey}:${year}:${index + 1}`;

                questions.push([
                    `Who finished ${ordinal(index + 1)} in the ${seasonLabel} in ${year}?`,
                    answers,
                    0,
                    factKey
                ]);
                questions.push([
                    `What position did ${team} finish in the ${seasonLabel} in ${year}?`,
                    uniqueAnswers(
                        ordinal(index + 1),
                        rotate(
                            table
                                .map((_, placeIndex) => ordinal(placeIndex + 1))
                                .filter(value => value !== ordinal(index + 1)),
                            index
                        )
                    ),
                    0,
                    `team-position:${leagueKey}:${year}:${team}`
                ]);
            });

            for (let first = 0; first < table.length; first++) {
                for (let second = first + 1; second < table.length; second++) {
                    const higher =
                        table[first];
                    const lower =
                        table[second];
                    const pair =
                        [higher, lower];
                    const neitherOptions = [
                        "They finished level",
                        "Neither club played in the league"
                    ];

                    questions.push([
                        `Which club finished higher in the ${seasonLabel} in ${year}: ${higher} or ${lower}?`,
                        [
                            higher,
                            lower,
                            ...neitherOptions
                        ],
                        0,
                        `higher:${leagueKey}:${year}:${higher}:${lower}`
                    ]);
                    questions.push([
                        `Which club finished lower in the ${seasonLabel} in ${year}: ${pair.join(" or ")}?`,
                        [
                            lower,
                            higher,
                            ...neitherOptions
                        ],
                        0,
                        `lower:${leagueKey}:${year}:${higher}:${lower}`
                    ]);
                }
            }
        }
    }

    return questions;
}

function winnerQuestions() {
    const pools = [
        ...Object.entries(AWARDS).map(([key, pool]) => [`award:${key}`, pool]),
        ...Object.entries(COMPETITIONS).map(([key, pool]) => [`competition:${key}`, pool]),
        ...Object.entries(LEAGUES).map(([key, pool]) => [`league:${key}`, pool])
    ];
    const questions = [];

    for (const [poolKey, pool] of pools) {
        const winners =
            Object.values(pool.winners || {});

        for (const [year, winner] of Object.entries(pool.winners || {})) {
            const answers =
                uniqueAnswers(
                    winner,
                    rotate(
                        winners.filter(value => value !== winner),
                        Number(year)
                    )
                );

            if (!answers) {
                continue;
            }

            const factKey =
                `winner:${poolKey}:${year}`;

            questions.push([
                `Who won the ${pool.label} in ${year}?`,
                answers,
                0,
                factKey
            ]);
        }
    }

    return questions;
}

function topScorerQuestions() {
    const entries =
        Object.entries(LEAGUE_AWARDS)
            .flatMap(([leagueKey, awards]) =>
                Object.values(awards || {})
                    .flatMap(seasons =>
                        Object.entries(seasons || {})
                            .map(([year, award]) => ({
                                leagueKey,
                                year,
                                award
                            }))
                    )
            );
    const answerPool =
        entries.map(row => awardAnswer(row.award));
    const questions = [];

    entries.forEach((row, index) => {
        const correct =
            awardAnswer(row.award);
        const answers =
            uniqueAnswers(
                correct,
                rotate(
                    answerPool.filter(value => value !== correct),
                    index
                )
            );

        if (!answers) {
            return;
        }

        const factKey =
            `top-scorer:${row.leagueKey}:${row.year}`;

        questions.push([
            `Who won the ${row.award.label} in ${row.year}?`,
            answers,
            0,
            factKey
        ]);
    });

    return questions;
}

const GENERATED_FOOTBALL_QUIZ_QUESTIONS = [
    ...tableQuestions(),
    ...winnerQuestions(),
    ...topScorerQuestions()
];

module.exports = {
    GENERATED_FOOTBALL_QUIZ_QUESTIONS
};
