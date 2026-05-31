// =========================
// GENERIC KEYED TTL CACHE
// =========================

const store = new Map();

function get(key) {

    const entry = store.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expires) {

        store.delete(key);

        return null;
    }

    return entry.data;
}

function set(key, data, ttlMs) {

    store.set(
        key,
        {
            data,
            expires: Date.now() + Math.max(0, ttlMs || 0)
        }
    );
}

function del(key) {
    store.delete(key);
}

function clear() {
    store.clear();
}

// =========================
// LEGACY HELPERS (kept for backwards-compat with leaderboard.js etc.)
// =========================

function getLeaderboard() {
    return get("leaderboard");
}

function setLeaderboard(data) {
    set("leaderboard", data, 60 * 1000);
}

module.exports = {
    get,
    set,
    del,
    clear,
    getLeaderboard,
    setLeaderboard
};
