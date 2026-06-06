const fs = require("fs");
const path = require("path");

const OUTPUT =
    path.join(
        __dirname,
        "../Services/englishFirstDivisionTables.js"
    );

function decodeHtml(value) {
    return String(value)
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]+>/g, "");
}

function seasonLabel(endYear) {
    return `${endYear - 1}-${String(endYear).slice(-2)}`;
}

function teamName(value) {
    return String(value || "")
        .replace(/^[+*=-]\s*/, "")
        .replace(/\s+\(.*?\)\s*$/, "")
        .trim()
        .toLowerCase()
        .replace(/\b[a-z]/g, letter =>
            letter.toUpperCase()
        )
        .replace(/\bFc\b/g, "FC")
        .replace(/\bAfc\b/g, "AFC");
}

function parseDivisionOne(html, label) {
    const text =
        decodeHtml(html)
            .replace(/\r/g, "");
    const start =
        text.search(/League Division 1/i);
    const end =
        text.search(/League Division 2/i);
    const section =
        text.slice(
            start,
            end > start
                ? end
                : undefined
        );
    const teams = [];

    for (const line of section.split("\n")) {
        const match =
            line.match(
                /^\s*(\d{1,2})\.\s+(.+?)\s{2,}\d{2}\s+/
            );

        if (!match) {
            continue;
        }

        teams[Number(match[1]) - 1] =
            teamName(match[2]);
    }

    const table =
        teams.filter(Boolean);

    if (table.length < 20) {
        throw new Error(
            `Only parsed ${table.length} Division One teams for ${label}`
        );
    }

    return table;
}

async function main() {
    const tables = {};

    for (let year = 1966; year <= 1992; year++) {
        const label =
            seasonLabel(year);
        const url =
            `https://www.rsssf.org/engpaul/FLA/${label}.html`;
        const response =
            await fetch(
                url,
                {
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                `Historical archive returned ${response.status} for ${url}`
            );
        }

        tables[year] =
            parseDivisionOne(
                await response.text(),
                label
            );
        console.log(
            `${label}: ${tables[year].length} teams, champion ${tables[year][0]}`
        );
    }

    const output = [
        "// Generated from RSSSF's English Football League final-table archive.",
        "// Seasons are keyed by their ending year.",
        "",
        `const ENGLISH_FIRST_DIVISION_TABLES = ${JSON.stringify(tables, null, 4)};`,
        "",
        "module.exports = { ENGLISH_FIRST_DIVISION_TABLES };",
        ""
    ].join("\n");

    fs.writeFileSync(
        OUTPUT,
        output,
        "utf8"
    );
    console.log(
        `Wrote ${Object.keys(tables).length} First Division tables to ${OUTPUT}`
    );
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
