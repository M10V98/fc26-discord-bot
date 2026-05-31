const path = require("path");
const fs = require("fs");
const os = require("os");

const FONT_DIR = path.join(__dirname, "../assets/fonts");
const FONTCONFIG_FILE = path.join(
    os.tmpdir(),
    "automode-fonts.conf"
);

if (!fs.existsSync(FONTCONFIG_FILE)) {
    fs.writeFileSync(
        FONTCONFIG_FILE,
        `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONT_DIR.replace(/\\/g, "/")}</dir>
  <cachedir>${path.join(os.tmpdir(), "fontconfig-cache").replace(/\\/g, "/")}</cachedir>
  <match target="pattern">
    <test qual="any" name="family">
      <string>sans-serif</string>
    </test>
    <edit name="family" mode="assign" binding="same">
      <string>Arial</string>
    </edit>
  </match>
</fontconfig>`
    );
}

process.env.FONTCONFIG_FILE =
    process.env.FONTCONFIG_FILE ||
    FONTCONFIG_FILE;

process.env.FONTCONFIG_PATH =
    process.env.FONTCONFIG_PATH ||
    FONT_DIR;

const sharp = require("sharp");

const archetypes = require("../Utils/archetypes");

const {
    buildCrestUrl
} = require("./crests");

const TEMPLATE_PATH = path.join(
    __dirname,
    "../assets/automode-infographic.png"
);

const WIDTH = 1920;
const HEIGHT = 1080;
const BADGE_SIZE = 84;

let fontCss;

const FONT_CANDIDATES = [
    {
        family: "AutomodeUI",
        weight: "400 900",
        paths: [
            path.join(FONT_DIR, "arial.ttf"),
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
        ]
    }
];

function getFontCss() {

    if (fontCss) {
        return fontCss;
    }

    const faces =
        FONT_CANDIDATES
            .map(font => {

                const fontPath =
                    font.paths.find(candidate =>
                        fs.existsSync(candidate)
                    );

                if (!fontPath) {
                    return "";
                }

                const data =
                    fs.readFileSync(fontPath)
                        .toString("base64");

                return (
                    "@font-face{" +
                    `font-family:'${font.family}';` +
                    `font-weight:${font.weight};` +
                    "font-style:normal;" +
                    "src:url('data:font/truetype;base64," +
                    data +
                    "') format('truetype');" +
                    "}"
                );
            })
            .join("");

    fontCss =
        faces +
        "text{" +
        "font-family:'AutomodeUI','DejaVu Sans','Liberation Sans',Arial,sans;" +
        "dominant-baseline:alphabetic;" +
        "}";

    return fontCss;
}

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

    return `${text.slice(0, maxLength - 1)}\u2026`;
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

    return new Date(Number(timestamp) * 1000)
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
        .slice(0, 11)
        .map(([, player]) => {

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
                name: player.playername || "Player",
                badges: badges.join(" "),
                position:
                    `${titleCase(player.pos || "Player")} ` +
                    `${archetypes[player.archetypeid] || ""}`.trim(),
                rating: player.rating || "0.0",
                goals: player.goals || "0",
                shots: player.shots || "0",
                assists: player.assists || "0",
                passes,
                tackles,
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

function buildSvg(match, ourClubId, home, away) {

    const players =
        match.players?.[ourClubId] || {};

    const rows = buildRows(players);
    const minutes = getMinutesPlayed(players);
    const trackedCount = Object.keys(players).length;

    const homeName = home.details?.name || "Home";
    const awayName = away.details?.name || "Away";

    const trackedClub =
        String(home.clubId) === String(ourClubId)
            ? home
            : away;

    const trackedName =
        trackedClub.details?.name || "Club";

    const matchType =
        match.clubs?.[ourClubId]?.matchType ||
        home.matchType ||
        "Match";

    const meta = [
        formatMatchType(matchType),
        formatDate(match.timestamp),
        minutes ? `${minutes} minutes played` : null
    ].filter(Boolean).join(" \u2022 ");

    const playerNote =
        `${trackedName} had ${trackedCount} tracked player${trackedCount === 1 ? "" : "s"}`;

    const columns = [
        ["Player", 120, 300],
        ["Position", 378, 260],
        ["MR", 696, 70],
        ["GLS", 802, 70],
        ["SHT", 898, 70],
        ["AST", 1006, 70],
        ["PAS", 1140, 150],
        ["TKL", 1340, 150],
        ["SVS", 1540, 70]
    ];

    const header = [
        `<rect width="${WIDTH}" height="${HEIGHT}" fill="rgba(0,0,0,0.46)"/>`,
        `<rect y="0" width="${WIDTH}" height="230" fill="rgba(0,0,0,0.68)"/>`,
        `<rect y="830" width="${WIDTH}" height="250" fill="rgba(0,0,0,0.58)"/>`,
        `<rect x="92" y="248" width="1736" height="64" rx="8" fill="rgba(0,0,0,0.78)"/>`,
        text(680, 142, homeName, { size: 48, weight: 800, anchor: "end" }),
        text(845, 142, `(${home.goals || 0})`, { size: 38, weight: 800, anchor: "middle" }),
        text(960, 142, "vs", { size: 36, weight: 800, anchor: "middle" }),
        text(1075, 142, `(${away.goals || 0})`, { size: 38, weight: 800, anchor: "middle" }),
        text(1240, 142, awayName, { size: 48, weight: 800 }),
        // Badge placeholders are drawn underneath - actual crests composited later.
        `<circle cx="755" cy="126" r="46" fill="rgba(0,0,0,0.6)" stroke="#d4b429" stroke-width="4"/>`,
        text(755, 140, getInitials(homeName), { size: 28, weight: 900, anchor: "middle", fill: "#d4b429" }),
        `<circle cx="1165" cy="126" r="46" fill="rgba(0,0,0,0.6)" stroke="#2f7cff" stroke-width="4"/>`,
        text(1165, 140, getInitials(awayName), { size: 28, weight: 900, anchor: "middle", fill: "#2f7cff" }),
        text(960, 184, meta, { size: 24, weight: 700, anchor: "middle" }),
        text(960, 214, playerNote, { size: 21, weight: 500, anchor: "middle", opacity: 0.86 }),
        ...columns.map(([label, x]) =>
            text(x, 286, label, { size: 24, weight: 900 })
        )
    ];

    const body = rows.flatMap((row, index) => {

        const y = 352 + (index * 48);
        const bg =
            index % 2 === 0
                ? `<rect x="92" y="${y - 34}" width="1736" height="46" fill="rgba(0,0,0,0.46)"/>`
                : `<rect x="92" y="${y - 34}" width="1736" height="46" fill="rgba(0,0,0,0.34)"/>`;

        return [
            bg,
            rowText(120, y, `${row.name} ${row.badges}`.trim(), 24, { size: 19, weight: 650 }),
            rowText(378, y, row.position, 25, { size: 19 }),
            text(716, y, row.rating, { size: 19, weight: 650, anchor: "middle" }),
            text(822, y, row.goals, { size: 19, weight: 650, anchor: "middle" }),
            text(918, y, row.shots, { size: 19, weight: 650, anchor: "middle" }),
            text(1026, y, row.assists, { size: 19, weight: 650, anchor: "middle" }),
            rowText(1140, y, row.passes, 14, { size: 19, weight: 650 }),
            rowText(1340, y, row.tackles, 14, { size: 19, weight: 650 }),
            text(1560, y, row.saves, { size: 19, weight: 650, anchor: "middle" })
        ];
    });

    const footer = [
        text(22, 1058, "Powered by", { size: 32, weight: 500, opacity: 0.82 }),
        text(214, 1058, "EA Pro Clubs API", { size: 32, weight: 800, fill: "#d5b617" })
    ];

    return Buffer.from(
        `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
        `<style>${getFontCss()}</style>` +
        header.join("") +
        body.join("") +
        footer.join("") +
        "</svg>"
    );
}

async function fetchBadgeInput(crestAssetId, left, top) {

    const url = buildCrestUrl(crestAssetId);

    if (!url) {
        return null;
    }

    const controller = new AbortController();
    const timeout =
        setTimeout(
            () => controller.abort(),
            7000
        );

    try {

        const res =
            await fetch(
                url,
                {
                    signal: controller.signal
                }
            );

        if (!res.ok) {
            return null;
        }

        const arrayBuffer =
            await res.arrayBuffer();

        const raw =
            Buffer.from(arrayBuffer);

        const mask =
            Buffer.from(
                `<svg width="${BADGE_SIZE}" height="${BADGE_SIZE}" xmlns="http://www.w3.org/2000/svg">` +
                `<circle cx="${BADGE_SIZE / 2}" cy="${BADGE_SIZE / 2}" r="${(BADGE_SIZE / 2) - 1}" fill="#ffffff"/>` +
                "</svg>"
            );

        const circleBadge =
            await sharp(raw)
                .resize(BADGE_SIZE, BADGE_SIZE, { fit: "cover" })
                .composite([
                    {
                        input: mask,
                        blend: "dest-in"
                    }
                ])
                .png()
                .toBuffer();

        return {
            input: circleBadge,
            left,
            top
        };

    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function generateMatchInfographic(match, ourClubId) {

    const clubsObj = match.clubs || {};
    const clubIds = Object.keys(clubsObj);

    if (clubIds.length < 2) {
        return null;
    }

    const ourId = String(ourClubId || clubIds[0]);

    // Render with our club on the LEFT (home).
    const oppId = clubIds.find(id => id !== ourId) || clubIds[1];

    const home = {
        clubId: ourId,
        ...clubsObj[ourId]
    };

    const away = {
        clubId: oppId,
        ...clubsObj[oppId]
    };

    const overlay =
        buildSvg(match, ourId, home, away);

    const homeCrest = home.details?.customKit?.crestAssetId;
    const awayCrest = away.details?.customKit?.crestAssetId;

    const badgeInputs =
        (await Promise.all([
            fetchBadgeInput(
                homeCrest,
                755 - Math.floor(BADGE_SIZE / 2),
                126 - Math.floor(BADGE_SIZE / 2)
            ),
            fetchBadgeInput(
                awayCrest,
                1165 - Math.floor(BADGE_SIZE / 2),
                126 - Math.floor(BADGE_SIZE / 2)
            )
        ]))
            .filter(Boolean);

    return sharp(TEMPLATE_PATH)
        .resize(WIDTH, HEIGHT, { fit: "cover" })
        .blur(5)
        .modulate({ brightness: 0.58, saturation: 0.88 })
        .composite([
            {
                input: overlay,
                top: 0,
                left: 0
            },
            ...badgeInputs
        ])
        .png()
        .toBuffer();
}

module.exports = {
    generateMatchInfographic
};
