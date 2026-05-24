function getLevel(xp) {
    return Math.floor(xp / 500);
}

function getProgress(xp) {
    const currentLevelXP = xp % 500;
    return {
        level: getLevel(xp),
        progress: currentLevelXP,
        needed: 500
    };
}

module.exports = {
    getLevel,
    getProgress
};
