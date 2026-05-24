function getLevel(xp) {

    const levels = [
        { level: 1, name: "Bronze I", req: 0 },
        { level: 2, name: "Bronze II", req: 25000 },
        { level: 3, name: "Bronze III", req: 58750 },
        { level: 4, name: "Silver I", req: 104312 },
        { level: 5, name: "Silver II", req: 165821 },
        { level: 6, name: "Gold I", req: 248858 },
        { level: 7, name: "Gold II", req: 360958 },
        { level: 8, name: "Elite I", req: 512293 },
        { level: 9, name: "Elite II", req: 716595 },
        { level: 10, name: "Elite III", req: 992402 }
    ];

    let current = levels[0];

    for (const lvl of levels) {
        if (xp >= lvl.req) current = lvl;
    }

    return current;
}

module.exports = { getLevel };
