const cache = {
    matches: { data: null, expires: 0 },
    leaderboard: { data: null, expires: 0 }
};

// -------------------------
// MATCH CACHE (5 min)
// -------------------------
function getMatches() {
    if (Date.now() > cache.matches.expires) return null;
    return cache.matches.data;
}

function setMatches(data) {
    cache.matches.data = data;
    cache.matches.expires = Date.now() + 5 * 60 * 1000;
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