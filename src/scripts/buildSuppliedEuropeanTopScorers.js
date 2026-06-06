const fs = require("fs");
const path = require("path");

const SOURCE =
    path.join(__dirname, "../data/europeanTopScorers1966-2025.csv");
const OUTPUT =
    path.join(__dirname, "../Services/europeanTopScorers.js");

const LEAGUES = [
    ["laLiga", "La Liga top scorer"],
    ["serieA", "Serie A top scorer"],
    ["ligue1", "Ligue 1 top scorer"]
];

const JOINT_WINNER_CLUBS = {
    laLiga: {
        1969: ["Real Madrid", "Atletico Madrid"],
        1970: ["Real Madrid", "Atletico Madrid", "Atletico Madrid"],
        1971: ["Atletico Madrid", "Barcelona"],
        1984: ["Real Valladolid", "Real Madrid"],
        2005: ["Villarreal", "Barcelona"]
    },
    serieA: {
        1973: ["Bologna", "Torino", "AC Milan"],
        1996: ["Bari", "Lazio"],
        2002: ["Juventus", "Piacenza"],
        2015: ["Inter", "Hellas Verona"],
        2018: ["Inter", "Lazio"]
    },
    ligue1: {
        1980: ["Laval", "Monaco"],
        1984: ["Auxerre", "Toulon"],
        1994: ["Lens", "Monaco", "Nantes"],
        2002: ["Auxerre", "Bordeaux"],
        2012: ["Montpellier", "PSG"],
        2020: ["Monaco", "PSG"]
    }
};

function endingYear(season) {
    const match =
        String(season).match(/^(\d{4})-(\d{2})$/);

    if (!match) {
        throw new Error(`Invalid season: ${season}`);
    }

    const start = Number(match[1]);
    const end = Number(match[2]);
    const century = Math.floor(start / 100) * 100;

    return end < start % 100
        ? century + 100 + end
        : century + end;
}

function parseEntry(value, leagueKey, year) {
    const parts =
        String(value)
            .split(" - ")
            .map(part => part.trim());
    const goals =
        Number(parts.pop());
    const suppliedClub =
        parts.length > 1
            ? parts.pop()
            : null;
    const winners =
        parts.join(" - ")
            .split(" / ")
            .map(name => name.trim())
            .filter(Boolean);
    const correctedClubs =
        JOINT_WINNER_CLUBS[leagueKey]?.[year] || [];
    const clubs = {};

    winners.forEach((winner, index) => {
        const club =
            suppliedClub || correctedClubs[index];

        if (club) {
            clubs[winner] = club;
        }
    });

    return {
        winners,
        clubs,
        goals
    };
}

function main() {
    const rows =
        fs.readFileSync(SOURCE, "utf8")
            .trim()
            .split(/\r?\n/)
            .slice(1);
    const records =
        Object.fromEntries(
            LEAGUES.map(([key]) => [key, {}])
        );

    for (const row of rows) {
        const [season, ...entries] =
            row.split(",");
        const year =
            endingYear(season);

        LEAGUES.forEach(([key, label], index) => {
            records[key][year] = {
                label,
                ...parseEntry(entries[index], key, year)
            };
        });
    }

    const output = [
        "// Generated from the historical top-scorer list supplied by the bot owner.",
        "// Seasons are keyed by their ending year.",
        "",
        `const EUROPEAN_TOP_SCORERS = ${JSON.stringify(records, null, 4)};`,
        "",
        "module.exports = { EUROPEAN_TOP_SCORERS };",
        ""
    ].join("\n");

    fs.writeFileSync(OUTPUT, output, "utf8");
    console.log(
        `Wrote ${rows.length} seasons for ${LEAGUES.length} leagues to ${OUTPUT}`
    );
}

main();
