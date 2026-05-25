const { getMatches: getCache, setMatches } = require("../Utils/cache");

const BASE_URL = "https://api.ourproclub.app/api/match/history";
const REQUEST_TIMEOUT_MS = 15000;

// -------------------------
// FETCH FROM REAL API
// -------------------------
async function fetchMatchesFromEA(clubId) {

    const url = `${BASE_URL}?clubId=${clubId}&limit=500`;
    const controller = new AbortController();
    const timeout =
        setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS
        );

    try {

        const res =
            await fetch(
                url,
                {
                    signal: controller.signal
                }
            );

        if (!res.ok) {
            throw new Error(`EA API error: ${res.status}`);
        }

        return await res.json();

    } catch (err) {

        if (err.name === "AbortError") {
            throw new Error(
                `EA API timed out after ${REQUEST_TIMEOUT_MS}ms`
            );
        }

        throw err;

    } finally {

        clearTimeout(timeout);
    }
}

// -------------------------
// MAIN WITH CACHE
// -------------------------
async function getMatches(clubId, options = {}) {

    const cached = options.forceRefresh
        ? null
        : getCache(clubId);

    if (cached) return cached;

    const data = await fetchMatchesFromEA(clubId);

    setMatches(clubId, data);

    return data;
}

module.exports = {
    getMatches
};
