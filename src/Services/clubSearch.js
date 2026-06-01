const db = require("../Utils/db");
const {
    buildCrestUrl
} = require("./crests");

async function linkClubToGuild(guildId, clubId) {
    await db.run(
        `
        INSERT OR REPLACE INTO clubs
        (guild_id, club_id)
        VALUES (?, ?)
        `,
        [
            guildId,
            String(clubId)
        ]
    );
}

module.exports = {
    buildCrestUrl,
    linkClubToGuild
};
