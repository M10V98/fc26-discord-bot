const axios = require("axios");

const BASE_URL = "https://api.ourproclub.app/api";

async function getMatchHistory(clubId, limit = 5) {
    try {
        const response = await axios.get(`${BASE_URL}/match/history`, {
            params: {
                clubId,
                limit
            }
        });

        return response.data;

    } catch (err) {
        console.error("EA API ERROR:", err.response?.data || err.message);
        return [];
    }
}

module.exports = {
    getMatchHistory
};
