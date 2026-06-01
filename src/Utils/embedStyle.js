const FOOTER = {
    text: "BellaCiaoFC.app"
};

function underline(value) {
    return escapeMarkdown(value || "Club");
}

function number(value, digits = 0) {
    const parsed = Number(value || 0);
    return digits > 0 ? parsed.toFixed(digits) : String(Math.round(parsed));
}

function escapeMarkdown(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/([*_~`>|])/g, "\\$1");
}

function percent(made, attempts) {
    const madeNumber = Number(made || 0);
    const attemptNumber = Number(attempts || 0);

    if (!attemptNumber) {
        return 0;
    }

    return Math.round((madeNumber / attemptNumber) * 100);
}

function memberWinRate(member) {
    const wins = Number(member.wins || 0);
    const losses = Number(member.losses || 0);
    const ties = Number(member.ties || 0);
    const games =
        Number(member.gamesPlayed || 0) ||
        wins + losses + ties;
    const supplied = Number(member.winRate || 0);

    if (supplied) return supplied;
    if (!games) return 0;

    return (wins / games) * 100;
}

function buildLinkedMaps(rows) {
    const byName = new Map();
    const byId = new Map();

    for (const row of rows || []) {
        if (row.player_name) {
            byName.set(row.player_name.toLowerCase(), row);
        }

        if (row.player_id) {
            byId.set(String(row.player_id), row);
        }
    }

    return {
        byName,
        byId
    };
}

function displayName(name, linkedMaps, playerId = null) {
    const row =
        playerId && linkedMaps?.byId?.get(String(playerId)) ||
        linkedMaps?.byName?.get(String(name || "").toLowerCase());

    if (row?.discord_id) {
        return `<@${row.discord_id}>`;
    }

    return escapeMarkdown(name || "Unknown");
}

function compactRankLine(index, label, value) {
    const safeLabel =
        String(label || "").startsWith("<@") ||
        String(label || "").includes("\\")
            ? label
            : escapeMarkdown(label);

    return `**#${index + 1}** ${safeLabel} - ${value}`;
}

function splitDescription(lines, maxLength = 3800) {
    const chunks = [];
    let current = "";

    for (const line of lines) {
        const next =
            current
                ? `${current}\n${line}`
                : line;

        if (next.length > maxLength && current) {
            chunks.push(current);
            current = line;
        } else {
            current = next;
        }
    }

    if (current) {
        chunks.push(current);
    }

    return chunks;
}

async function getLinkedRows(db, guildId) {
    return db.all(
        `
        SELECT *
        FROM linked_players
        WHERE guild_id = ?
        `,
        [guildId]
    );
}

function infoBlock(lines) {
    return lines
        .filter(Boolean)
        .map(line => `> ${line}`)
        .join("\n");
}

function resultDot(goalsFor, goalsAgainst) {
    const gf = Number(goalsFor || 0);
    const ga = Number(goalsAgainst || 0);

    if (gf > ga) return "🟢";
    if (gf < ga) return "🔴";
    return "🟡";
}

function formatMatchType(value) {
    return String(value || "Match")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function timeAgo(timestamp) {
    if (!timestamp) {
        return "recently";
    }

    const seconds =
        Math.max(0, Math.floor(Date.now() / 1000) - Number(timestamp));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds / 3600);

    if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    return "today";
}

module.exports = {
    FOOTER,
    underline,
    number,
    percent,
    memberWinRate,
    buildLinkedMaps,
    displayName,
    compactRankLine,
    escapeMarkdown,
    splitDescription,
    getLinkedRows,
    infoBlock,
    resultDot,
    formatMatchType,
    timeAgo
};
