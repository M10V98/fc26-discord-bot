const eaApi = require("./eaApi");
const { processMatchXP } = require("./processMatchXP");
const { db } = require("../Utils/initDb");

let lastMatchId = null;

async function syncMatches() {

    const clubId = db.get("clubs")?.default;
    if (!clubId) return;

    const matches = await eaApi.getMatches(clubId);

    if (!matches?.length) return;

    for (const match of matches.reverse()) {

        if (lastMatchId && match.id <= lastMatchId) continue;

        processMatchXP(match, clubId);
    }

    lastMatchId = matches[0].id;
}

function startMatchSync() {

    console.log("🔥 Match sync started (auto XP enabled)");

    setInterval(() => {
        syncMatches().catch(console.error);
    }, 5 * 60 * 1000); // every 5 minutes
}

module.exports = { startMatchSync };