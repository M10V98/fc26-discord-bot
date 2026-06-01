const BASE_LEVEL_XP = 12500;
const LEVEL_GROWTH = Math.sqrt(1.35);

function calculateXP(stats) {

    let xp = 0;

    xp += 25;

    xp += (stats.goals || 0) * 220;
    xp += (stats.assists || 0) * 170;
    xp += (stats.secondAssists || 0) * 95;

    xp += (stats.tackles || 0) * 45;
    xp += (stats.interceptions || 0) * 55;
    xp += (stats.saves || 0) * 70;

    xp += (stats.passes || 0) * 1.5;
    xp += (stats.dribbles || 0) * 20;

    if (stats.cleanSheet) xp += 110;
    if (stats.motm) xp += 160;
    if (stats.win) xp += 70;

    xp += Math.floor(
        (stats.rating || 0) * 20
    );

    return Math.floor(xp);
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
