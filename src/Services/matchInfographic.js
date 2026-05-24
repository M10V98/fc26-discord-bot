const path = require("path");
const sharp = require("sharp");

const archetypes = require("../Utils/archetypes");

const TEMPLATE_PATH = path.join(
    __dirname,
    "../assets/automode-infographic.png"
);

const WIDTH = 1920;
const HEIGHT = 1080;

function escapeXml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function truncate(value, maxLength) {

    const text = String(value ?? "");

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength - 1)}…`;
}

function toNumber(value) {

    return Number(value || 0);
}

function percent(made, attempts) {

    const madeNumber = toNumber(made);
    const attemptNumber = toNumber(attempts);

    if (!attemptNumber) {
        return 0;
    }

    return Math.round(
        (madeNumber / attemptNumber) * 100
    );
}

function formatMatchType(value) {

    return String(value || "Match")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function titleCase(value) {

    return String(value || "")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(timestamp) {

    return new Date(timestamp * 1000)
        .toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });
}

function getInitials(name) {

    return String(name || "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

function getMinutesPlayed(players) {

    const seconds =
        Math.max(
            0,
            ...Object.values(players || {})
                .map(player => toNumber(player.secondsPlayed))
        );

    if (!seconds) {
        return null;
    }

    return Math.round(seconds / 60);
}

function buildRows(players) {

    return Object.entries(players || {})
        .sort(([, a], [, b]) =>
            toNumber(b.rating) - toNumber(a.rating)
        )
        .slice(0, 8)
        .map(([name, player]) => {

            const passes =
                `${player.passesmade || 0} / ${player.passattempts || 0} ` +
                `(${percent(player.passesmade, player.passattempts)}%)`;

            const tackles =
                `${player.tacklesmade || 0} / ${player.tackleattempts || 0} ` +
                `(${percent(player.tacklesmade, player.tackleattempts)}%)`;

            const badges = [
                player.mom === "1" ? "MOTM" : ""
            ].filter(Boolean);

            return {
                name,
                badges: badges.join(" "),
                position: `${titleCase(player.pos || "Player")} ${archetypes[player.archetypeid] || ""}`.trim(),
                rating: player.rating || "0.0",
                goals: player.goals || "0",
                shots: player.shots || "0",
                assists: player.assists || "0",
                secondAssists: player.secondAssists || "0",
                dribbles: player.dribbles || "0",
                passes,
                tackles,
                interceptions: player.interceptions || "0",
                saves: player.saves || "-"
            };
        });
}

function text(x, y, value, options = {}) {

    const {
        size = 28,
        weight = 500,
        fill = "#ffffff",
        anchor = "start",
        opacity = 1
    } = options;

    return (
        `<text x="${x}" y="${y}" ` +
        `font-size="${size}" font-weight="${weight}" ` +
        `fill="${fill}" text-anchor="${anchor}" opacity="${opacity}">` +
        `${escapeXml(value)}</text>`
    );
}

function rowText(x, y, value, width, options = {}) {

    return text(
        x,
        y,
        truncate(value, width),
        options
    );
}

function buildSvg(match, home, away) {

    const players = match.player_data || {};
    const rows = buildRows(players);
    const minutes = getMinutesPlayed(players);
    const trackedCount = Object.keys(players).length;

    const homeName = home.clubName || "Home";
    const awayName = away.clubName || "Away";
    const trackedClub =
        String(home.clubId) === String(match.club_id)
            ? home
            : away;

    const meta = [
        formatMatchType(match.match_type),
        formatDate(match.match_date),
        minutes ? `${minutes} minutes played` : null
    ].filter(Boolean).join(" • ");

    const playerNote =
        `${trackedClub.clubName} had ${trackedCount} tracked player${trackedCount === 1 ? "" : "s"}`;

    const columns = [
        ["Player", 120, 300],
        ["Position", 378, 260],
        ["MR", 676, 70],
        ["GLS", 782, 70],
        ["SHT", 878, 70],
        ["AST", 986, 70],
        ["2AST", 1090, 80],
        ["DRI", 1194, 70],
        ["PAS", 1306, 150],
        ["TKL", 1490, 150],
        ["INT", 1642, 70],
        ["SVS", 1748, 70]
    ];

    const header = [
        `<rect width="${WIDTH}" height="${HEIGHT}" fill="rgba(0,0,0,0.46)"/>`,
        `<rect y="0" width="${WIDTH}" height="230" fill="rgba(0,0,0,0.68)"/>`,
        `<rect y="830" width="${WIDTH}" height="250" fill="rgba(0,0,0,0.58)"/>`,
        `<rect x="92" y="248" width="1736" height="64" rx="8" fill="rgba(0,0,0,0.78)"/>`,
        text(690, 142, homeName, { size: 48, weight: 800, anchor: "end" }),
        text(850, 142, `(${home.goals})`, { size: 38, weight: 800, anchor: "middle" }),
        text(960, 142, "vs", { size: 36, weight: 800, anchor: "middle" }),
        text(1070, 142, `(${away.goals})`, { size: 38, weight: 800, anchor: "middle" }),
        text(1230, 142, awayName, { size: 48, weight: 800 }),
        `<circle cx="760" cy="126" r="42" fill="rgba(0,0,0,0.6)" stroke="#d4b429" stroke-width="4"/>`,
        text(760, 140, getInitials(homeName), { size: 28, weight: 900, anchor: "middle", fill: "#d4b429" }),
        `<circle cx="1160" cy="126" r="42" fill="rgba(0,0,0,0.6)" stroke="#2f7cff" stroke-width="4"/>`,
        text(1160, 140, getInitials(awayName), { size: 28, weight: 900, anchor: "middle", fill: "#2f7cff" }),
        text(960, 184, meta, { size: 24, weight: 700, anchor: "middle" }),
        text(960, 214, playerNote, { size: 21, weight: 500, anchor: "middle", opacity: 0.86 }),
        ...columns.map(([label, x]) =>
            text(x, 286, label, { size: 24, weight: 900 })
        )
    ];

    const body = rows.flatMap((row, index) => {

        const y = 356 + (index * 58);
        const bg =
            index % 2 === 0
                ? `<rect x="92" y="${y - 38}" width="1736" height="56" fill="rgba(0,0,0,0.46)"/>`
                : `<rect x="92" y="${y - 38}" width="1736" height="56" fill="rgba(0,0,0,0.34)"/>`;

        return [
            bg,
            rowText(120, y, `${row.name} ${row.badges}`.trim(), 24, { size: 21, weight: 650 }),
            rowText(378, y, row.position, 25, { size: 21 }),
            text(696, y, row.rating, { size: 21, weight: 650, anchor: "middle" }),
            text(802, y, row.goals, { size: 21, weight: 650, anchor: "middle" }),
            text(898, y, row.shots, { size: 21, weight: 650, anchor: "middle" }),
            text(1006, y, row.assists, { size: 21, weight: 650, anchor: "middle" }),
            text(1112, y, row.secondAssists, { size: 21, weight: 650, anchor: "middle" }),
            text(1212, y, row.dribbles, { size: 21, weight: 650, anchor: "middle" }),
            rowText(1306, y, row.passes, 14, { size: 21, weight: 650 }),
            rowText(1490, y, row.tackles, 14, { size: 21, weight: 650 }),
            text(1662, y, row.interceptions, { size: 21, weight: 650, anchor: "middle" }),
            text(1768, y, row.saves, { size: 21, weight: 650, anchor: "middle" })
        ];
    });

    const footer = [
        text(22, 1058, "Powered by", { size: 32, weight: 500, opacity: 0.82 }),
        text(214, 1058, "OurProClub.app", { size: 32, weight: 800, fill: "#d5b617" })
    ];

    return Buffer.from(
        `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
        `<style>text{font-family:'Segoe UI',Arial,sans-serif;dominant-baseline:alphabetic}</style>` +
        header.join("") +
        body.join("") +
        footer.join("") +
        "</svg>"
    );
}

async function generateMatchInfographic(match) {

    const teams =
        Object.entries(match.match_data?.clubs || {});

    if (teams.length < 2) {
        return null;
    }

    const home = {
        clubId: teams[0][0],
        ...teams[0][1]
    };

    const away = {
        clubId: teams[1][0],
        ...teams[1][1]
    };

    const overlay =
        buildSvg(match, home, away);

    return sharp(TEMPLATE_PATH)
        .resize(WIDTH, HEIGHT, { fit: "cover" })
        .blur(5)
        .modulate({ brightness: 0.58, saturation: 0.88 })
        .composite([
            {
                input: overlay,
                top: 0,
                left: 0
            }
        ])
        .png()
        .toBuffer();
}

module.exports = {
    generateMatchInfographic
};
