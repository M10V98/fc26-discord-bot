const cache = {
    matches: new Map(),
    leaderboard: { data: null, expires: 0 }
};

// -------------------------
// MATCH CACHE (5 min)
// -------------------------
function getMatches(clubId) {
    const entry = cache.matches.get(String(clubId));

    if (!entry || Date.now() > entry.expires) return null;

    return entry.data;
}

function setMatches(clubId, data) {
    cache.matches.set(
        String(clubId),
        {
            data,
            expires: Date.now() + 5 * 60 * 1000
        }
    );
}

// -------------------------
// LEADERBOARD CACHE (1 min)
// -------------------------
function getLeaderboard() {
    if (Date.now() > cache.leaderboard.expires) return null;
    return cache.leaderboard.data;
}

function setLeaderboard(data) {
    cache.leaderboard.data = data;
    cache.leaderboard.expires = Date.now() + 60 * 1000;
}

module.exports = {
    getMatches,
    setMatches,
    getLeaderboard,
    setLeaderboard
};
