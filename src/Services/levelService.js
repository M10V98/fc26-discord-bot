const {
    getTotalXPForLevel
} = require("../Utils/xpSystem");

const LEVEL_NAMES = [
    "Bronze I",
    "Bronze II",
    "Bronze III",
    "Bronze IV",
    "Silver I",
    "Silver II",
    "Silver III",
    "Silver IV",
    "Gold I",
    "Gold II",
    "Gold III",
    "Gold IV",
    "Elite I",
    "Elite II",
    "Elite III",
    "Elite IV",
    "Legend I",
    "Legend II",
    "Legend III",
    "Legend IV"
];

const levels = LEVEL_NAMES.map((name, index) => ({
    level: index + 1,
    name,
    req: getTotalXPForLevel(index + 1)
}));

function getLevel(xp) {

    let current = levels[0];

    for (const lvl of levels) {
        if (xp >= lvl.req) current = lvl;
    }

    return current;
}

module.exports = {
    getLevel,
    levels
};
