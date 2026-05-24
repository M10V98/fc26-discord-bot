const { getMatches: getCache, setMatches } = require("../Utils/cache");

const BASE_URL = "https://api.ourproclub.app/api/match/history";

// -------------------------
// FETCH FROM REAL API
// -------------------------
async function fetchMatchesFromEA(clubId) {

    const url = `${BASE_URL}?clubId=${clubId}&limit=500`;

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`EA API error: ${res.status}`);
    }

    return await res.json();
}

// -------------------------
// MAIN WITH CACHE
// -------------------------
async function getMatches(clubId) {

    const cached = getCache();
    if (cached) return cached;

    const data = await fetchMatchesFromEA(clubId);

    setMatches(data);

    return data;
}

module.exports = {
    getMatches
};
