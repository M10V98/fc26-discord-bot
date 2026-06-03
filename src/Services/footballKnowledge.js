const {
    AWARDS,
    COMPETITIONS,
    LEAGUES,
    POSITION_FACTS
} = require("./footballHistoryData");

const FOOTBALL_FACTS = [
    "Uruguay won the first men's FIFA World Cup in 1930.",
    "Brazil have won the most men's FIFA World Cups.",
    "Miroslav Klose is the all-time leading scorer in men's FIFA World Cup history.",
    "Brazil's 1970 World Cup team is widely regarded as one of football's greatest sides.",
    "Carlos Alberto captained Brazil during their 1970 World Cup triumph.",
    "West Germany won the 1974 FIFA World Cup.",
    "The Netherlands were strongly associated with Total Football at the 1974 World Cup.",
    "Johan Cruyff was the star Dutch playmaker linked with Total Football.",
    "Argentina won the 1978 FIFA World Cup.",
    "Italy won the 1982 FIFA World Cup.",
    "Paolo Rossi was the standout Italian goalscorer at the 1982 World Cup.",
    "Argentina won the 1986 FIFA World Cup.",
    "Diego Maradona scored the Hand of God goal against England in 1986.",
    "West Germany won the 1990 FIFA World Cup.",
    "Andreas Brehme scored the penalty that decided the 1990 World Cup final.",
    "Brazil won the 1994 FIFA World Cup.",
    "Roberto Baggio missed the decisive penalty in the 1994 World Cup final shootout.",
    "France hosted and won the 1998 FIFA World Cup.",
    "Ronaldo Nazario scored twice for Brazil in the 2002 World Cup final.",
    "Italy won the 2006 FIFA World Cup after beating France.",
    "Zinedine Zidane was sent off in the 2006 World Cup final after a headbutt.",
    "Spain won the 2010 FIFA World Cup.",
    "Andres Iniesta scored Spain's winning goal in the 2010 World Cup final.",
    "Germany won the 2014 FIFA World Cup.",
    "Mario Gotze scored the winning goal in the 2014 World Cup final.",
    "France won the 2018 FIFA World Cup after beating Croatia.",
    "Luka Modric won the Golden Ball at the 2018 World Cup.",
    "Harry Kane won the Golden Boot at the 2018 World Cup.",
    "Argentina beat France in the 2022 World Cup final.",
    "Kylian Mbappe scored a hat-trick in the 2022 World Cup final.",
    "Kylian Mbappe won the Golden Boot at the 2022 World Cup.",
    "Lionel Messi won the Golden Ball at the 2022 World Cup.",
    "Morocco reached the World Cup semi-finals in 2022.",
    "Spain won UEFA EURO 2024 after beating England in the final.",
    "Italy won UEFA EURO 2020, which was played in 2021.",
    "The EURO 2020 final was played at Wembley Stadium.",
    "Portugal won UEFA EURO 2016.",
    "Eder scored Portugal's winning goal in the EURO 2016 final.",
    "Greece won UEFA EURO 2004.",
    "Denmark won UEFA EURO 1992 after entering late as a replacement.",
    "The Soviet Union won the first European Championship in 1960.",
    "Spain won back-to-back European Championships in 2008 and 2012.",
    "Fernando Torres scored Spain's winning goal in the EURO 2008 final.",
    "The Netherlands won UEFA EURO 1988.",
    "Marco van Basten scored the famous volley in the EURO 1988 final.",
    "France won EURO 1984, with Michel Platini as the tournament star.",
    "Germany won EURO 1996.",
    "Oliver Bierhoff scored Germany's golden goal in the EURO 1996 final.",
    "France won EURO 2000.",
    "David Trezeguet scored France's golden goal in the EURO 2000 final.",
    "Real Madrid have won the most European Cups and Champions League titles.",
    "Real Madrid won the first European Cup in 1956.",
    "Real Madrid completed La Decima by winning a tenth European title in 2014.",
    "Liverpool came from 3-0 down to win the 2005 Champions League final in Istanbul.",
    "Chelsea won the Champions League for the first time in 2012.",
    "Didier Drogba scored Chelsea's late equaliser in the 2012 Champions League final.",
    "Manchester United won the 1999 Champions League with two stoppage-time goals.",
    "Sir Alex Ferguson led Manchester United to the 1999 treble.",
    "Manchester City won the Champions League in 2023 as part of a treble.",
    "Pep Guardiola managed Manchester City during their 2023 treble season.",
    "Ajax won three straight European Cups from 1971 to 1973.",
    "Bayern Munich won three straight European Cups from 1974 to 1976.",
    "Nottingham Forest won back-to-back European Cups in 1979 and 1980.",
    "Aston Villa won the 1982 European Cup.",
    "Steaua Bucharest won the 1986 European Cup.",
    "Ajax won the first Champions League-branded final in 1995.",
    "AC Milan beat Barcelona 4-0 in the 1994 Champions League final.",
    "Borussia Dortmund won the 1997 Champions League final against Juventus.",
    "Porto won the 2004 Champions League under Jose Mourinho.",
    "Inter won the 2010 Champions League under Jose Mourinho.",
    "Stanley Matthews won the first Ballon d'Or in 1956.",
    "Lev Yashin is the only goalkeeper to win the Ballon d'Or.",
    "Lionel Messi has won the most men's Ballon d'Or awards.",
    "Michel Platini won three consecutive Ballon d'Or awards from 1983 to 1985.",
    "George Weah became the first African player to win the Ballon d'Or in 1995.",
    "Matthias Sammer won the Ballon d'Or in 1996.",
    "Ronaldo Nazario won the Ballon d'Or in 1997.",
    "Luka Modric won the 2018 Ballon d'Or, ending Messi and Ronaldo's long run.",
    "Rivaldo won the Ballon d'Or in 1999.",
    "Luis Figo won the Ballon d'Or in 2000.",
    "Michael Owen won the Ballon d'Or in 2001.",
    "Ronaldo Nazario won the Ballon d'Or in 2002.",
    "Pavel Nedved won the Ballon d'Or in 2003.",
    "Andriy Shevchenko won the Ballon d'Or in 2004.",
    "Ronaldinho won the Ballon d'Or in 2005.",
    "Fabio Cannavaro won the Ballon d'Or in 2006.",
    "Kaka won the Ballon d'Or in 2007.",
    "Cristiano Ronaldo won the Ballon d'Or in 2008.",
    "Lionel Messi won the Ballon d'Or in 2009.",
    "Lionel Messi won the Ballon d'Or in 2010.",
    "Lionel Messi won the Ballon d'Or in 2011.",
    "Lionel Messi won the Ballon d'Or in 2012.",
    "Cristiano Ronaldo won the Ballon d'Or in 2013.",
    "Cristiano Ronaldo won the Ballon d'Or in 2014.",
    "Lionel Messi won the Ballon d'Or in 2015.",
    "Cristiano Ronaldo won the Ballon d'Or in 2016.",
    "Cristiano Ronaldo won the Ballon d'Or in 2017.",
    "Lionel Messi won the Ballon d'Or in 2019.",
    "The Ballon d'Or was cancelled in 2020.",
    "Lionel Messi won the Ballon d'Or in 2021.",
    "Karim Benzema won the men's Ballon d'Or in 2022.",
    "Lionel Messi won the men's Ballon d'Or in 2023.",
    "Rodri won the men's Ballon d'Or in 2024.",
    "Ousmane Dembele won the men's Ballon d'Or in 2025.",
    "Aitana Bonmati won the women's Ballon d'Or in 2025.",
    "The Yashin Trophy recognises the best goalkeeper at the Ballon d'Or ceremony.",
    "The Kopa Trophy recognises the best young player at the Ballon d'Or ceremony.",
    "A progressive pass meaningfully moves possession closer to goal.",
    "Rest defence is the structure left behind to defend transitions while attacking.",
    "A cutback is a pass pulled back from near the byline into a dangerous area.",
    "A half-space is the channel between the centre of the pitch and the wing.",
    "An inverted full-back moves into central midfield areas in possession.",
    "Gegenpressing means pressing immediately after losing possession.",
    "A sweeper-keeper helps defend space behind the back line and supports build-up.",
    "A tactical foul is usually used to stop a dangerous transition before it develops."
];

const STOPWORDS = new Set([
    "who",
    "what",
    "when",
    "where",
    "why",
    "how",
    "won",
    "win",
    "winner",
    "the",
    "and",
    "for",
    "dor",
    "d'or"
]);

function tokenize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s']/g, " ")
        .split(/\s+/)
        .filter(token =>
            token.length > 2 &&
            !STOPWORDS.has(token)
        );
}

function scoreFact(tokens, fact) {
    const factText =
        fact.toLowerCase();

    return tokens.reduce(
        (score, token) =>
            factText.includes(token)
                ? score + 1
                : score,
        0
    );
}

function extractYears(text) {
    return String(text || "")
        .match(/\b(19|20)\d{2}\b/g) || [];
}

function firstYear(text) {
    const [year] =
        extractYears(text);

    return year ? Number(year) : null;
}

function normalizeTopic(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/d['’]?or/g, "dor")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function competitionFromText(text) {
    const lower =
        normalizeTopic(text);

    if (/\b(ballondor|ballon dor|balon dor|dor)\b/.test(lower)) {
        return {
            type: "award",
            key: "ballon dor",
            data: AWARDS["ballon dor"]
        };
    }

    if (lower.includes("golden boot") && lower.includes("world cup")) {
        return {
            type: "award",
            key: "world cup golden boot",
            data: AWARDS["world cup golden boot"]
        };
    }

    if (lower.includes("champions league") || lower.includes("european cup")) {
        return {
            type: "competition",
            key: "champions league",
            data: COMPETITIONS["champions league"]
        };
    }

    if (lower.includes("europa league") || lower.includes("uefa cup")) {
        return {
            type: "competition",
            key: "europa league",
            data: COMPETITIONS["europa league"]
        };
    }

    if (lower.includes("world cup")) {
        return {
            type: "competition",
            key: "world cup",
            data: COMPETITIONS["world cup"]
        };
    }

    if (/\beuro\b|\beuros\b|european championship/.test(lower)) {
        return {
            type: "competition",
            key: "euro",
            data: COMPETITIONS.euro
        };
    }

    if (lower.includes("premier league") || lower.includes("english top flight") || lower.includes("england league")) {
        return {
            type: "league",
            key: "england",
            data: LEAGUES.england
        };
    }

    if (lower.includes("la liga") || lower.includes("spanish league")) {
        return {
            type: "league",
            key: "la liga",
            data: LEAGUES["la liga"]
        };
    }

    if (lower.includes("serie a") || lower.includes("italian league")) {
        return {
            type: "league",
            key: "serie a",
            data: LEAGUES["serie a"]
        };
    }

    if (lower.includes("bundesliga") || lower.includes("german league")) {
        return {
            type: "league",
            key: "bundesliga",
            data: LEAGUES.bundesliga
        };
    }

    if (lower.includes("ligue 1") || lower.includes("french league")) {
        return {
            type: "league",
            key: "ligue 1",
            data: LEAGUES["ligue 1"]
        };
    }

    return null;
}

function answerStructuredHistory(text) {
    const year =
        firstYear(text);
    const item =
        competitionFromText(text);

    if (item && year) {
        const winner =
            item.data?.winners?.[year];

        if (winner) {
            return `${winner} won the ${item.data.label} in ${year}.`;
        }

        return `I do not have a stored ${item.data.label} winner for ${year} yet.`;
    }

    const lower =
        normalizeTopic(text);
    const positionKey =
        Object.keys(POSITION_FACTS)
            .find(key =>
                lower.includes(key)
            );

    if (positionKey) {
        return POSITION_FACTS[positionKey];
    }

    return null;
}

function topicMatches(text, fact) {
    const lower =
        String(text || "").toLowerCase();
    const factLower =
        fact.toLowerCase();

    if (/\bballon\b|\bd'or\b|\bdor\b|\byashin\b|\bkopa\b/.test(lower)) {
        return /\bballon\b|\byashin\b|\bkopa\b/.test(factLower);
    }

    if (/\bworld cup\b|\bfifa world cup\b|\bgolden boot\b|\bgolden ball\b/.test(lower)) {
        return factLower.includes("world cup") ||
            factLower.includes("golden boot") ||
            factLower.includes("golden ball");
    }

    if (/\beuro\b|\beuros\b|\beuropean championship\b/.test(lower)) {
        return factLower.includes("euro") ||
            factLower.includes("european championship");
    }

    if (/\bchampions league\b|\beuropean cup\b/.test(lower)) {
        return factLower.includes("champions league") ||
            factLower.includes("european cup");
    }

    return true;
}

function getRelevantFootballKnowledge(text, limit = 6) {
    const tokens =
        tokenize(text);
    const years =
        extractYears(text);

    if (!tokens.length) {
        return [];
    }

    return FOOTBALL_FACTS
        .filter(fact =>
            topicMatches(text, fact) &&
            (
                !years.length ||
                years.some(year => fact.includes(year))
            )
        )
        .map(fact => ({
            fact,
            score:
                scoreFact(tokens, fact) +
                years.reduce(
                    (score, year) =>
                        fact.includes(year)
                            ? score + 4
                            : score,
                    0
                )
        }))
        .filter(row => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(row => row.fact);
}

function answerFootballKnowledge(text) {
    const structured =
        answerStructuredHistory(text);

    if (structured) {
        return structured;
    }

    const facts =
        getRelevantFootballKnowledge(text, 3);

    if (!facts.length) {
        return null;
    }

    return facts.join("\n");
}

function isFootballKnowledgeQuestion(text) {
    return topicMatches(text, "") === false ||
        /\b(world cup|fifa world cup|euros?|european championship|champions league|european cup|ballon|d'or|dor|golden boot|golden ball|history|record|trophy|winner)\b/i
            .test(String(text || ""));
}

module.exports = {
    FOOTBALL_FACTS,
    answerStructuredHistory,
    answerFootballKnowledge,
    getRelevantFootballKnowledge,
    isFootballKnowledgeQuestion
};
