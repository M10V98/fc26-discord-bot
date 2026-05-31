const eaApi = require("./Services/eaApi");

async function getMatchHistory(clubId, limit = 5) {
    try {
        return await eaApi.getRecentMatches(
            clubId,
            { limit }
        );
    } catch (err) {
        console.error("EA API ERROR:", err.message);
        return [];
    }
}

module.exports = {
    getMatchHistory
};
