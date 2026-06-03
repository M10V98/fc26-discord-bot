const BASE_LEVEL_XP = 12500;

const LEVEL_GROWTH =
    Math.sqrt(1.45);

const XP_WEIGHTS = {

    appearance: 25,

    goal: 35,
    assist: 30,

    tackle: 25,
    save: 30,

    pass: 15,

    cleanSheet: 50,
    motm: 75,
    win: 25,

    redCards: -500
};

function calculateXPBreakdown(stats) {

    const breakdown = {

        appearances:
            (stats.matches || 0) *
            XP_WEIGHTS.appearance,

        goals:
            (stats.goals || 0) *
            XP_WEIGHTS.goal,

        assists:
            (stats.assists || 0) *
            XP_WEIGHTS.assist,

        tackles:
            (stats.tackles || 0) *
            XP_WEIGHTS.tackle,

        saves:
            (stats.saves || 0) *
            XP_WEIGHTS.save,

        passes:
            (stats.passes || 0) *
            XP_WEIGHTS.pass,

        cleanSheets:
            (stats.clean_sheets || 0) *
            XP_WEIGHTS.cleanSheet,

        motm:
            (stats.motm || 0) *
            XP_WEIGHTS.motm,

        wins:
            (stats.wins || 0) *
            XP_WEIGHTS.win,

        redCards:
            (stats.red_cards || 0) *
            XP_WEIGHTS.redCard
    };

    return {
        ...breakdown,
        total:
            Object.values(breakdown)
                .reduce(
                    (sum, value) =>
                        sum + Number(value || 0),
                    0
                )
    };
}

function calculateXP(stats) {

    let xp = 0;

    xp += XP_WEIGHTS.appearance;

    xp +=
        (stats.goals || 0) *
        XP_WEIGHTS.goal;

    xp +=
        (stats.assists || 0) *
        XP_WEIGHTS.assist;

    xp +=
        (stats.secondAssists || 0) *
        0;

    xp +=
        (stats.tackles || 0) *
        XP_WEIGHTS.tackle;

    xp +=
        (stats.interceptions || 0) *
        0;

    xp +=
        (stats.saves || 0) *
        XP_WEIGHTS.save;

    xp +=
        (stats.passes || 0) *
        XP_WEIGHTS.pass;

    xp +=
        (stats.dribbles || 0) *
        0;

    if (stats.cleanSheet) {
        xp += XP_WEIGHTS.cleanSheet;
    }

    if (stats.motm) {
        xp += XP_WEIGHTS.motm;
    }

    if (stats.win) {
        xp += XP_WEIGHTS.win;
    }

    xp +=
        (stats.redCards || 0) *
        XP_WEIGHTS.redCard;

    return Math.floor(xp);
}

function getLevelFromXP(xp) {

    let level = 1;

    let required =
        BASE_LEVEL_XP;

    while (xp >= required) {

        xp -= required;

        level++;

        required =
            Math.floor(
                required *
                LEVEL_GROWTH
            );
    }

    return level;
}

function getXPForNextLevel(level) {

    let xp =
        BASE_LEVEL_XP;

    for (
        let i = 1;
        i < level;
        i++
    ) {

        xp =
            Math.floor(
                xp *
                LEVEL_GROWTH
            );
    }

    return xp;
}

function getTotalXPForLevel(level) {

    let total = 0;

    let required =
        BASE_LEVEL_XP;

    for (
        let i = 1;
        i < level;
        i++
    ) {

        total += required;

        required =
            Math.floor(
                required *
                LEVEL_GROWTH
            );
    }

    return total;
}

module.exports = {
    XP_WEIGHTS,
    calculateXP,
    calculateXPBreakdown,
    getLevelFromXP,
    getXPForNextLevel,
    getTotalXPForLevel
};