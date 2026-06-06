const fs = require("fs");
const path = require("path");

const HEADERS = {
    Origin: "https://www.premierleague.com",
    Referer: "https://www.premierleague.com/",
    "User-Agent": "Mozilla/5.0"
};
const BASE =
    "https://footballapi.pulselive.com/football";
const OUTPUT =
    path.join(
        __dirname,
        "../Services/officialPremierLeagueHistory.js"
    );
const TOP_SCORER_CLUBS = {
    1993: ["Tottenham Hotspur"],
    1994: ["Newcastle United"],
    1995: ["Blackburn Rovers"],
    1996: ["Newcastle United"],
    1997: ["Newcastle United"],
    1998: ["Coventry City", "Liverpool", "Blackburn Rovers"],
    1999: ["Leeds United", "Liverpool", "Manchester United"],
    2000: ["Sunderland"],
    2001: ["Chelsea"],
    2002: ["Arsenal"],
    2003: ["Manchester United"],
    2004: ["Arsenal"],
    2005: ["Arsenal"],
    2006: ["Arsenal"],
    2007: ["Chelsea"],
    2008: ["Manchester United"],
    2009: ["Chelsea"],
    2010: ["Chelsea"],
    2011: ["Manchester United", "Manchester City"],
    2012: ["Arsenal"],
    2013: ["Manchester United"],
    2014: ["Liverpool"],
    2015: ["Manchester City"],
    2016: ["Tottenham Hotspur"],
    2017: ["Tottenham Hotspur"],
    2018: ["Liverpool"],
    2019: ["Arsenal", "Liverpool", "Liverpool"],
    2020: ["Leicester City"],
    2021: ["Tottenham Hotspur"],
    2022: ["Liverpool", "Tottenham Hotspur"],
    2023: ["Manchester City"],
    2024: ["Manchester City"],
    2025: ["Liverpool"]
};

async function getJson(url) {
    const response =
        await fetch(
            url,
            {
                headers: HEADERS
            }
        );

    if (!response.ok) {
        throw new Error(
            `Official Premier League API returned ${response.status} for ${url}`
        );
    }

    return response.json();
}

function seasonEndYear(label) {
    const match =
        String(label || "").match(/^(\d{4})\/(\d{2})$/);

    if (!match) {
        return null;
    }

    const start =
        Number(match[1]);
    const end =
        Number(match[2]);
    const century =
        Math.floor(start / 100) * 100;

    return end < start % 100
        ? century + 100 + end
        : century + end;
}

async function getSeasons() {
    const data =
        await getJson(
            `${BASE}/competitions/1/compseasons?page=0&pageSize=100`
        );

    return (data.content || [])
        .map(row => ({
            id: Number(row.id),
            label: row.label,
            year: seasonEndYear(row.label)
        }))
        .filter(row =>
            row.year &&
            row.year <= 2025
        )
        .sort((a, b) => a.year - b.year);
}

async function getFinalTable(season) {
    const data =
        await getJson(
            `${BASE}/standings?comp=1&compSeasons=${season.id}&altIds=true&page=0&pageSize=100`
        );
    const tables =
        data.tables || [];
    const table =
        tables
            .slice()
            .sort((a, b) =>
                Number(b.gameWeek || 0) -
                Number(a.gameWeek || 0)
            )[0];

    return (table?.entries || [])
        .slice()
        .sort((a, b) =>
            Number(a.position || 0) -
            Number(b.position || 0)
        )
        .map(entry =>
            entry.team?.club?.name ||
            entry.team?.name
        )
        .filter(Boolean);
}

async function getTopScorers(season) {
    const data =
        await getJson(
            `${BASE}/stats/ranked/players/goals?comps=1&compSeasons=${season.id}&altIds=true&page=0&pageSize=100`
        );
    const rows =
        data.stats?.content || [];
    const topGoals =
        Math.max(
            0,
            ...rows.map(row => Number(row.value || 0))
        );

    const leaders =
        rows.filter(row =>
            Number(row.value || 0) === topGoals
        );
    const winners =
        leaders
            .map(row =>
                row.owner?.name?.display
            )
            .filter(Boolean);
    const clubs =
        Object.fromEntries(
            leaders
                .map(row => [
                    row.owner?.name?.display,
                    row.owner?.currentTeam?.name ||
                    row.owner?.team?.name ||
                    row.owner?.club?.name
                ])
                .filter(([winner, club]) =>
                    winner && club
                )
        );

    return {
        winners,
        clubs,
        goals: topGoals
    };
}

async function main() {
    const seasons =
        await getSeasons();
    const tables = {};
    const goldenBoot = {};

    for (const season of seasons) {
        const [table, scorers] =
            await Promise.all([
                getFinalTable(season),
                getTopScorers(season)
            ]);

        if (table.length >= 4) {
            tables[season.year] = table;
        }

        if (scorers.winners.length) {
            const clubs =
                Object.fromEntries(
                    scorers.winners.map((winner, index) => [
                        winner,
                        TOP_SCORER_CLUBS[season.year]?.[index] ||
                        scorers.clubs[winner]
                    ])
                );

            goldenBoot[season.year] = {
                label: "Premier League top scorer",
                winners: scorers.winners,
                clubs,
                goals: scorers.goals
            };
        }

        console.log(
            `${season.label}: ${table.length} teams, ${scorers.winners.join(" and ")} (${scorers.goals})`
        );
    }

    const output =
        [
            "// Generated from the official Premier League API.",
            "// Seasons are keyed by their ending year.",
            "",
            `const PREMIER_LEAGUE_TABLES = ${JSON.stringify(tables, null, 4)};`,
            "",
            `const PREMIER_LEAGUE_TOP_SCORERS = ${JSON.stringify(goldenBoot, null, 4)};`,
            "",
            "module.exports = {",
            "    PREMIER_LEAGUE_TABLES,",
            "    PREMIER_LEAGUE_TOP_SCORERS",
            "};",
            ""
        ].join("\n");

    fs.writeFileSync(
        OUTPUT,
        output,
        "utf8"
    );

    console.log(
        `Wrote ${seasons.length} official Premier League seasons to ${OUTPUT}`
    );
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
