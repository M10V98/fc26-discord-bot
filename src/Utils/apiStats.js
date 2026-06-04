function normalizeKey(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function readStat(stats, keys, fallback = 0) {
    if (!stats || typeof stats !== "object") {
        return fallback;
    }

    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(stats, key)) {
            return stats[key];
        }
    }

    const wanted =
        new Set(keys.map(normalizeKey));

    for (const [key, value] of Object.entries(stats)) {
        if (wanted.has(normalizeKey(key))) {
            return value;
        }
    }

    return fallback;
}

function numberStat(stats, keys, fallback = 0) {
    return Number(readStat(stats, keys, fallback) || 0);
}

const SAVE_KEYS = [
    "saves",
    "save",
    "savesMade",
    "savesmade",
    "gkSaves",
    "gksaves",
    "gkSavesMade",
    "gksavesmade",
    "keeperSaves",
    "keepersaves",
    "keeperSavesMade",
    "keepersavesmade",
    "goalkeeperSaves",
    "goalkeepersaves",
    "goalkeeperSavesMade",
    "goalkeepersavesmade"
];

function saves(stats) {
    return numberStat(stats, SAVE_KEYS);
}

module.exports = {
    SAVE_KEYS,
    numberStat,
    readStat,
    saves
};
