const fs = require("fs");
const path = require("path");

const BASE_URL = "https://proclubsworld.com";
const OUTPUT_PATH = path.join(
    __dirname,
    "../data/playerBuilder/fc26-player-builder.json"
);

async function json(route) {
    const response = await fetch(`${BASE_URL}${route}`, {
        headers: {
            Accept: "application/json",
            "User-Agent": "Bella-Ciao-FC-Builder-Data/1.0"
        }
    });
    if (!response.ok) {
        throw new Error(`${route} returned ${response.status}`);
    }
    return response.json();
}

function sanitizePlaystyle(playstyle) {
    return {
        id: playstyle.id,
        name: playstyle.name,
        category: playstyle.category,
        requirementsText: playstyle.requirementsText,
        requirements: playstyle.requirements,
        isPlus: Boolean(playstyle.isPlus),
        apCost: Number(playstyle.apCost || 0),
        minLevel: Number(playstyle.minLevel || 0)
    };
}

async function main() {
    const names = await json("/api/builder/archetypes");
    const [archetypes, playstyles, facilities] = await Promise.all([
        Promise.all(
            names.map(name =>
                json(`/api/builder/archetypes/${encodeURIComponent(name)}`)
            )
        ),
        json("/api/builder/playstyles"),
        json("/api/builder/facilities")
    ]);
    const output = {
        schemaVersion: 1,
        game: "EA Sports FC 26",
        generatedAt: new Date().toISOString(),
        source: {
            name: "ProClubs World Player Builder",
            url: `${BASE_URL}/tools/player-builder`,
            note: "Factual builder values only. Artwork, SVGs, branding, and account data are excluded."
        },
        archetypeNames: names,
        archetypes: Object.fromEntries(
            archetypes.map(archetype => [archetype.name, archetype])
        ),
        playstyles: playstyles.map(sanitizePlaystyle),
        facilities
    };

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
    console.log(
        `Wrote ${OUTPUT_PATH} (${names.length} archetypes, ${output.playstyles.length} playstyles, ${facilities.levels.length} facility levels).`
    );
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { main, sanitizePlaystyle };
