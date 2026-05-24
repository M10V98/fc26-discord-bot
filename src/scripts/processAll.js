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
        await eaApi.getMatches(
            club.club_id
        );

    for (const match of matches.reverse()) {

        await processMatch(match);
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
