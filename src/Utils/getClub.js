const db = require('./db');

function getClubId(guildId) {
    return new Promise((resolve, reject) => {

        db.get(
            `SELECT club_id FROM clubs WHERE guild_id = ?`,
            [guildId],
            (err, row) => {

                if (err) return reject(err);

                resolve(row?.club_id || null);
            }
        );

    });
}

module.exports = { getClubId };