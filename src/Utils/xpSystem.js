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
    let required = 25000;

    while (xp >= required) {

        xp -= required;

        level++;

        required =
            Math.floor(required * 1.35);
    }

    return level;
}

function getXPForNextLevel(level) {

    let xp = 25000;

    for (let i = 1; i < level; i++) {

        xp =
            Math.floor(xp * 1.35);
    }

    return xp;
}

module.exports = {
    calculateXP,
    getLevelFromXP,
    getXPForNextLevel
};
