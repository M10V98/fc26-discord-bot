const sharp = require("sharp");

const db = require("../Utils/db");
const {
    getLinkedClubs
} = require("./clubLinks");
const {
    refreshAndGetCompetitiveMatches,
    aggregateCompetitivePlayers
} = require("./compStats");

const FORMATIONS = {
    "4-2-3-1": [
        ["GK", 50, 91], ["LB", 15, 72], ["CB", 38, 78], ["CB", 62, 78], ["RB", 85, 72],
        ["CDM", 37, 58], ["CDM", 63, 58], ["LW", 18, 36], ["CAM", 50, 42], ["RW", 82, 36], ["ST", 50, 17]
    ],
    "4-3-3": [
        ["GK", 50, 91], ["LB", 15, 72], ["CB", 38, 78], ["CB", 62, 78], ["RB", 85, 72],
        ["CM", 28, 53], ["CM", 50, 61], ["CM", 72, 53], ["LW", 18, 27], ["ST", 50, 17], ["RW", 82, 27]
    ],
    "4-4-2": [
        ["GK", 50, 91], ["LB", 15, 72], ["CB", 38, 78], ["CB", 62, 78], ["RB", 85, 72],
        ["LM", 14, 48], ["CM", 38, 55], ["CM", 62, 55], ["RM", 86, 48], ["ST", 38, 20], ["ST", 62, 20]
    ],
    "3-5-2": [
        ["GK", 50, 91], ["CB", 25, 76], ["CB", 50, 80], ["CB", 75, 76],
        ["LWB", 12, 51], ["CM", 35, 56], ["CDM", 50, 65], ["CM", 65, 56], ["RWB", 88, 51],
        ["ST", 38, 20], ["ST", 62, 20]
    ],
    "4-1-2-1-2": [
        ["GK", 50, 91], ["LB", 15, 72], ["CB", 38, 78], ["CB", 62, 78], ["RB", 85, 72],
        ["CDM", 50, 62], ["CM", 32, 49], ["CM", 68, 49], ["CAM", 50, 36], ["ST", 38, 18], ["ST", 62, 18]
    ]
};

const POSITION_ALIASES = {
    GK: ["gk", "goalkeeper"],
    CB: ["cb", "centre back", "center back"],
    LB: ["lb", "left back", "full back", "fullback"],
    RB: ["rb", "right back", "full back", "fullback"],
    LWB: ["lwb", "left wing back", "wing back", "wingback"],
    RWB: ["rwb", "right wing back", "wing back", "wingback"],
    CDM: ["cdm", "dm", "defensive midfielder"],
    CM: ["cm", "centre mid", "center mid", "central midfielder"],
    CAM: ["cam", "am", "attacking midfielder"],
    LM: ["lm", "left mid", "left midfielder", "winger"],
    RM: ["rm", "right mid", "right midfielder", "winger"],
    LW: ["lw", "left wing", "winger"],
    RW: ["rw", "right wing", "winger"],
    ST: ["st", "striker", "cf", "centre forward", "center forward", "forward"]
};

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function rolePositions(member) {
    const names =
        member.roles.cache
            .filter(role => role.name !== "@everyone")
            .map(role => normalize(role.name));

    return Object.entries(POSITION_ALIASES)
        .filter(([, aliases]) =>
            names.some(name =>
                aliases.some(alias =>
                    name === alias || name.split(" ").includes(alias)
                )
            )
        )
        .map(([position]) => position);
}

function playerScore(player, position) {
    const games = Math.max(1, Number(player.appearances || 0));
    const rating = Number(player.avgRating || 0) * 12;
    const goals = Number(player.goals || 0) / games;
    const assists = Number(player.assists || 0) / games;
    const tackles = Number(player.tackles || 0) / games;
    const interceptions = Number(player.interceptions || 0) / games;
    const saves = Number(player.saves || 0) / games;
    const cleanSheets = Number(player.cleanSheets || 0) / games;
    const passes = Number(player.passes || 0) / games;

    if (position === "GK") return rating + saves * 5 + cleanSheets * 18 + passes * 0.08;
    if (["CB", "LB", "RB", "LWB", "RWB"].includes(position)) {
        return rating + tackles * 3 + interceptions * 4 + cleanSheets * 12 + assists * 5;
    }
    if (["CDM", "CM"].includes(position)) {
        return rating + tackles * 2.5 + interceptions * 3 + passes * 0.1 + assists * 8 + goals * 5;
    }
    if (["CAM", "LM", "RM", "LW", "RW"].includes(position)) {
        return rating + goals * 14 + assists * 16 + passes * 0.06;
    }
    return rating + goals * 22 + assists * 12;
}

function mergeStats(all, recent) {
    const allById =
        new Map(all.map(player => [String(player.playerId), player]));
    const recentById =
        new Map(recent.map(player => [String(player.playerId), player]));

    return [...new Set([...allById.keys(), ...recentById.keys()])]
        .map(playerId => ({
            playerId,
            all: allById.get(playerId) || {},
            recent: recentById.get(playerId) || {}
        }));
}

function linkedStatPlayer(link, players) {
    const wantedName = normalize(link.player_name);
    return players.find(player =>
        (link.player_id && String(player.playerId) === String(link.player_id)) ||
        normalize(player.all.name || player.recent.name) === wantedName
    );
}

async function recommendLineup(guild, session, formation) {
    const canPlay = JSON.parse(session.can_play || "[]").map(String);
    const [clubs, links] =
        await Promise.all([
            getLinkedClubs(guild.id),
            db.all(`SELECT * FROM linked_players WHERE guild_id = ?`, [guild.id])
        ]);
    const rows =
        await Promise.all(
            clubs.map(async club => {
                const matches =
                    await refreshAndGetCompetitiveMatches(
                        guild.id,
                        club.club_id,
                        { forceRefresh: true, limit: 500 }
                    ).catch(() => []);

                return matches.map(match => ({
                    match,
                    clubId: String(club.club_id)
                }));
            })
        );
    const matches =
        rows.flat()
            .sort((a, b) => Number(b.match.timestamp || 0) - Number(a.match.timestamp || 0));
    const recentMatches = matches.slice(0, 5);
    const aggregate = matchRows => {
        const combined = new Map();

        for (const row of matchRows) {
            for (const player of aggregateCompetitivePlayers([row.match], row.clubId)) {
                const current = combined.get(String(player.playerId)) || [];
                current.push({ match: row.match, clubId: row.clubId });
                combined.set(String(player.playerId), current);
            }
        }

        return [...combined.entries()].flatMap(([playerId, playerMatches]) => {
            const byClub = new Map();
            for (const row of playerMatches) {
                const list = byClub.get(row.clubId) || [];
                list.push(row.match);
                byClub.set(row.clubId, list);
            }
            const stats =
                [...byClub.entries()]
                    .flatMap(([clubId, clubMatches]) => aggregateCompetitivePlayers(clubMatches, clubId))
                    .filter(player => String(player.playerId) === playerId);
            if (!stats.length) return [];
            const base = stats[0];
            const totalApps = stats.reduce((sum, player) => sum + player.appearances, 0);
            return [{
                ...base,
                appearances: totalApps,
                goals: stats.reduce((sum, player) => sum + player.goals, 0),
                assists: stats.reduce((sum, player) => sum + player.assists, 0),
                tackles: stats.reduce((sum, player) => sum + player.tackles, 0),
                interceptions: stats.reduce((sum, player) => sum + player.interceptions, 0),
                saves: stats.reduce((sum, player) => sum + player.saves, 0),
                cleanSheets: stats.reduce((sum, player) => sum + player.cleanSheets, 0),
                passes: stats.reduce((sum, player) => sum + player.passes, 0),
                avgRating: totalApps
                    ? stats.reduce((sum, player) => sum + player.avgRating * player.appearances, 0) / totalApps
                    : 0
            }];
        });
    };
    const stats = mergeStats(aggregate(matches), aggregate(recentMatches));
    const candidates = [];

    for (const userId of canPlay) {
        const member = await guild.members.fetch(userId).catch(() => null);
        const link = links.find(row => String(row.discord_id) === userId);
        const stat = link ? linkedStatPlayer(link, stats) : null;
        if (!member || !link || !stat) continue;
        candidates.push({
            userId,
            name: member.displayName || link.player_name,
            positions: rolePositions(member),
            stat
        });
    }

    const selected = [];
    const used = new Set();
    for (const [position, x, y] of FORMATIONS[formation] || FORMATIONS["4-2-3-1"]) {
        const choice =
            candidates
                .filter(player => !used.has(player.userId) && player.positions.includes(position))
                .map(player => ({
                    ...player,
                    score:
                        playerScore(player.stat.recent, position) * 0.7 +
                        playerScore(player.stat.all, position) * 0.3
                }))
                .sort((a, b) => b.score - a.score)[0] || null;
        if (choice) used.add(choice.userId);
        selected.push({ position, x, y, player: choice });
    }

    return {
        selected,
        recentMatchCount: recentMatches.length,
        candidateCount: candidates.length
    };
}

function escapeXml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function renderLineupPng(lineup, formation, title) {
    const width = 1200;
    const height = 1600;
    const cards =
        lineup.selected.map(slot => {
            const x = Math.round(slot.x / 100 * width);
            const y = 155 + Math.round(slot.y / 100 * 1330);
            const name = slot.player?.name || "Unfilled";
            const score = slot.player ? slot.player.score.toFixed(1) : "-";
            return `
                <g transform="translate(${x},${y})">
                    <circle r="68" fill="${slot.player ? "#15191f" : "#5f6f62"}" stroke="#ffffff" stroke-width="5"/>
                    <text y="-8" text-anchor="middle" fill="#ffffff" font-size="28" font-weight="800">${escapeXml(slot.position)}</text>
                    <text y="26" text-anchor="middle" fill="#d7ff66" font-size="20">${escapeXml(score)}</text>
                    <rect x="-108" y="76" width="216" height="42" rx="18" fill="#101512" opacity=".94"/>
                    <text y="105" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="700">${escapeXml(name.slice(0, 18))}</text>
                </g>`;
        }).join("");
    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${width}" height="${height}" fill="#101512"/>
            <text x="60" y="70" fill="#ffffff" font-family="Arial,sans-serif" font-size="38" font-weight="800">${escapeXml(title)}</text>
            <text x="60" y="112" fill="#d7ff66" font-family="Arial,sans-serif" font-size="25">${escapeXml(formation)} - Recommended from tracked COMP form</text>
            <rect x="55" y="145" width="1090" height="1395" rx="32" fill="#208447" stroke="#ffffff" stroke-width="7"/>
            <line x1="55" y1="842" x2="1145" y2="842" stroke="#ffffff" stroke-width="5"/>
            <circle cx="600" cy="842" r="135" fill="none" stroke="#ffffff" stroke-width="5"/>
            <rect x="315" y="145" width="570" height="210" fill="none" stroke="#ffffff" stroke-width="5"/>
            <rect x="315" y="1330" width="570" height="210" fill="none" stroke="#ffffff" stroke-width="5"/>
            <g font-family="Arial,sans-serif">${cards}</g>
        </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
    FORMATIONS,
    recommendLineup,
    renderLineupPng
};
