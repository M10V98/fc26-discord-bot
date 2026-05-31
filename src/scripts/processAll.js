const eaApi =
    require("../Services/eaApi");

const db =
    require("../Utils/db");

const {
    processMatch
} = require("../Services/processMatch");

async function run() {

    const club =
        await db.get(
            `
            SELECT * FROM clubs
            LIMIT 1
            `
        );

    const matches =
        await eaApi.getRecentMatches(
            club.club_id,
            { limit: 100 }
        );

    for (const match of matches.reverse()) {

        await processMatch(
            match,
            club.guild_id || "default",
            club.club_id
        );
    }

    console.log(
        "✅ All matches processed."
    );

    await db.close();
}

run().catch(err => {

    console.error(err);
    process.exitCode = 1;
});
