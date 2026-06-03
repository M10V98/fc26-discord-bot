// =========================
// OFFICIAL EA PRO CLUBS API
// =========================
//
// Browser-style headers are required: EA blocks plain User-Agents.
// Each endpoint has its own TTL via the shared keyed cache.

const cache = require("../Utils/cache");

const PLATFORM = "common-gen5";
const BASE = "https://proclubs.ea.com/api/fc";
const REQUEST_TIMEOUT_MS = 15000;

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.ea.com/",
    "Origin": "https://www.ea.com"
};

const TTL = {
    info:         60 * 60 * 1000,   // 1h
    overallStats: 5  * 60 * 1000,   // 5m
    members:      2  * 60 * 1000,   // 2m
    career:       10 * 60 * 1000,   // 10m
    matches:      60 * 1000         // 60s
};

// -------------------------
// INTERNAL FETCH (timeout + 1 retry on 5xx)
// -------------------------

async function fetchOnce(url) {

    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
    );

    try {

        const res = await fetch(
            url,
            {
                headers: HEADERS,
                signal: controller.signal
            }
        );

        const text = await res.text();

        return {
            ok: res.ok,
            status: res.status,
            text
        };

    } finally {
        clearTimeout(timeout);
    }
}

async function fetchJson(url) {

    let attempt = 0;

    while (true) {

        attempt += 1;

        let result;

        try {
            result = await fetchOnce(url);
        } catch (err) {

            if (attempt < 2 && err.name === "AbortError") {
                continue;
            }

            throw err;
        }

        if (!result.ok) {

            if (attempt < 2 && result.status >= 500) {
                continue;
            }

            const preview =
                (result.text || "")
                    .replace(/\s+/g, " ")
                    .slice(0, 200);

            throw new Error(
                `EA API ${result.status} for ${url} :: ${preview}`
            );
        }

        if (!result.text || result.text.startsWith("<")) {

            throw new Error(
                `EA API returned non-JSON for ${url}: ` +
                result.text.slice(0, 200)
            );
        }

        try {
            return JSON.parse(result.text);
        } catch (err) {
            throw new Error(
                `EA API JSON parse failed for ${url}: ${err.message}`
            );
        }
    }
}

// -------------------------
// CACHE-AWARE HELPER
// -------------------------

async function cached(key, ttl, loader, options = {}) {

    if (!options.forceRefresh) {

        const hit = cache.get(key);

        if (hit !== null && hit !== undefined) {
            return hit;
        }
    }

    const data = await loader();

    cache.set(key, data, ttl);

    return data;
}

// -------------------------
// PUBLIC ENDPOINTS
// -------------------------

async function getClubInfo(clubId, options = {}) {

    return cached(
        `info:${clubId}`,
        TTL.info,
        async () => {

            const url =
                `${BASE}/clubs/info?platform=${PLATFORM}&clubIds=${clubId}`;

            return fetchJson(url);
        },
        options
    );
}

async function getOverallStats(clubId, options = {}) {

    return cached(
        `overall:${clubId}`,
        TTL.overallStats,
        async () => {

            const url =
                `${BASE}/clubs/overallStats?platform=${PLATFORM}&clubIds=${clubId}`;

            return fetchJson(url);
        },
        options
    );
}

async function getMembersStats(clubId, options = {}) {

    return cached(
        `members:${clubId}`,
        TTL.members,
        async () => {

            const url =
                `${BASE}/members/stats?platform=${PLATFORM}&clubId=${clubId}`;

            return fetchJson(url);
        },
        options
    );
}

async function getMembersCareer(clubId, options = {}) {

    return cached(
        `career:${clubId}`,
        TTL.career,
        async () => {

            const url =
                `${BASE}/members/career/stats?platform=${PLATFORM}&clubId=${clubId}`;

            return fetchJson(url);
        },
        options
    );
}

async function getMatches(clubId, matchType, options = {}) {

    const max =
        options.maxResultCount || 100;

    return cached(
        `matches:${clubId}:${matchType}:${max}`,
        TTL.matches,
        async () => {

            const url =
                `${BASE}/clubs/matches?platform=${PLATFORM}` +
                `&clubIds=${clubId}` +
                `&matchType=${matchType}` +
                `&maxResultCount=${max}`;

            const json = await fetchJson(url);

            return Array.isArray(json)
                ? json.map(match => ({
                    ...match,
                    matchType:
                        match.matchType ||
                        match.matchtype ||
                        matchType
                }))
                : [];
        },
        options
    );
}

// -------------------------
// MERGED RECENT MATCHES (league + playoff + friendly)
// -------------------------

async function getRecentMatches(clubId, options = {}) {

    const limit = options.limit || 100;
    const maxResultCount =
        options.maxResultCount ||
        Math.min(100, Math.max(limit, 10));

    const fetchOpts = {
        forceRefresh: Boolean(options.forceRefresh),
        maxResultCount
    };

    const [league, playoff, friendly] = await Promise.all([
        getMatches(clubId, "leagueMatch", fetchOpts).catch(() => []),
        getMatches(clubId, "playoffMatch", fetchOpts).catch(() => []),
        getMatches(clubId, "friendlyMatch", fetchOpts).catch(() => [])
    ]);

    const tag = arr => Array.isArray(arr) ? arr : [];

    return [
        ...tag(league),
        ...tag(playoff),
        ...tag(friendly)
    ]
        .filter(m => m && m.matchId && m.timestamp != null)
        .sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp)
        )
        .slice(0, limit);
}

module.exports = {
    getClubInfo,
    getOverallStats,
    getMembersStats,
    getMembersCareer,
    getMatches,
    getRecentMatches
};
