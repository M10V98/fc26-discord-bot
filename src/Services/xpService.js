function calculateXP(stats) {

    let xp = 0;

    xp += 10;

    xp += (Number(stats.goals) || 0) * 50;
    xp += (Number(stats.assists) || 0) * 40;
    xp += (Number(stats.tackles) || 0) * 20;
    xp += (Number(stats.saves) || 0) * 45;
    xp += (Number(stats.shots) || 0) * 5;

    if (stats.cleansheetsgk === "1" || stats.cleansheetsdef === "1") {
        xp += 35;
    }

    if (stats.win) {
        xp += 25;
    }

    if (stats.draw) {
        xp += 10;
    }

    const rating = Number(stats.rating || 0);

    if (rating >= 8.5) xp += 25;
    else if (rating >= 8.0) xp += 15;
    else if (rating >= 7.5) xp += 10;

    const minutes = (Number(stats.secondsPlayed) || 0) / 60;

    if (minutes >= 80) xp += 10;
    else if (minutes >= 60) xp += 5;

    return Math.max(0, Math.floor(xp));
}

module.exports = { calculateXP };