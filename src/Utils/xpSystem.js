const BASE_LEVEL_XP = 12500;
const LEVEL_GROWTH = Math.sqrt(1.35);

function calculateXP(stats) {

    let xp = 0;

    xp += 100;

    xp += (stats.goals || 0) * 250;
    xp += (stats.assists || 0) * 180;
    xp += (stats.secondAssists || 0) * 80;

    xp += (stats.tackles || 0) * 35;
    xp += (stats.interceptions || 0) * 30;
    xp += (stats.saves || 0) * 120;

    xp += (stats.passes || 0) * 2;
    xp += (stats.dribbles || 0) * 12;

    if (stats.cleanSheet) xp += 150;
    if (stats.motm) xp += 200;
    if (stats.win) xp += 120;

    xp += Math.floor(
        (stats.rating || 0) * 25
    );

    return xp;
}

function getLevelFromXP(xp) {

    let level = 1;
    let required = BASE_LEVEL_XP;

    while (xp >= required) {

        xp -= required;

        level++;

        required =
            Math.floor(required * LEVEL_GROWTH);
    }

    return level;
}

function getXPForNextLevel(level) {

    let xp = BASE_LEVEL_XP;

    for (let i = 1; i < level; i++) {

        xp =
            Math.floor(xp * LEVEL_GROWTH);
    }

    return xp;
}

function getTotalXPForLevel(level) {

    let total = 0;
    let required = BASE_LEVEL_XP;

    for (let i = 1; i < level; i++) {

        total += required;

        required =
            Math.floor(required * LEVEL_GROWTH);
    }

    return total;
}

module.exports = {
    calculateXP,
    getLevelFromXP,
    getXPForNextLevel,
    getTotalXPForLevel
};
