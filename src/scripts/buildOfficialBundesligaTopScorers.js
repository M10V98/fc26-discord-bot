const fs = require("fs");
const path = require("path");

const SOURCE =
    "https://www.bundesliga.com/en/bundesliga/news/all-top-scorers-bundesliga-muller-lewandowski-dzeko-nkunku-klinsmann-heynckes-fullkrug-24227/";
const OUTPUT =
    path.join(
        __dirname,
        "../Services/officialBundesligaTopScorers.js"
    );
const CORRECTIONS = {
    2000: {
        winners: ["Martin Max"],
        clubs: { "Martin Max": "1860 Munich" },
        goals: 19
    },
    2024: {
        winners: ["Harry Kane"],
        clubs: { "Harry Kane": "Bayern Munich" },
        goals: 36
    },
    2025: {
        winners: ["Harry Kane"],
        clubs: { "Harry Kane": "Bayern Munich" },
        goals: 26
    }
};

function endingYear(startYear, endShort) {
    const century =
        Math.floor(startYear / 100) * 100;
    const end =
        Number(endShort);

    return end < startYear % 100
        ? century + 100 + end
        : century + end;
}

function playerRecords(value) {
    const players =
        value
        .split(/\s+and\s+/)
        .map(player => player.trim())
        .filter(Boolean);
    const winners = [];
    const clubs = {};

    for (const player of players) {
        const match =
            player.match(/^(.+?)\s*\(([^)]+)\)$/);
        const winner =
            (match?.[1] || player).trim();

        winners.push(winner);

        if (match?.[2]) {
            clubs[winner] = match[2].trim();
        }
    }

    return {
        winners,
        clubs
    };
}

async function main() {
    const response =
        await fetch(
            SOURCE,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            }
        );

    if (!response.ok) {
        throw new Error(
            `Official Bundesliga archive returned ${response.status}`
        );
    }

    const html =
        await response.text();
    const pattern =
        /(19\d{2}|20\d{2})\/(\d{2}):\s*([^\\<]{1,300}?)\s+-\s+(?:both\s+|all\s+)?(\d+) goals/g;
    const records = {};
    let match;

    while ((match = pattern.exec(html))) {
        const year =
            endingYear(
                Number(match[1]),
                match[2]
            );

        if (year < 1966 || year > 2025) {
            continue;
        }

        const players =
            playerRecords(match[3]);

        records[year] = {
            label: "Bundesliga top scorer",
            ...players,
            goals: Number(match[4])
        };
    }

    for (const [year, correction] of Object.entries(CORRECTIONS)) {
        records[year] = {
            label: "Bundesliga top scorer",
            ...correction
        };
    }

    const ordered =
        Object.fromEntries(
            Object.entries(records)
                .sort((a, b) =>
                    Number(a[0]) - Number(b[0])
                )
        );
    const output =
        [
            "// Generated from Bundesliga.com's official historical top-scorer archive.",
            "// Seasons are keyed by their ending year.",
            "",
            `const BUNDESLIGA_TOP_SCORERS = ${JSON.stringify(ordered, null, 4)};`,
            "",
            "module.exports = {",
            "    BUNDESLIGA_TOP_SCORERS",
            "};",
            ""
        ].join("\n");

    fs.writeFileSync(
        OUTPUT,
        output,
        "utf8"
    );

    console.log(
        `Wrote ${Object.keys(ordered).length} official Bundesliga top-scorer seasons to ${OUTPUT}`
    );
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
