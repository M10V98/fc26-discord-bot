const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const db = require("../Utils/db");
const eaApi = require("./eaApi");
const {
    buildCrestUrl
} = require("./crests");
const {
    escapeMarkdown
} = require("../Utils/embedStyle");

const IDS_PER_REQUEST = 50;
const DEFAULT_SCAN_COUNT = 500;
const MAX_SCAN_COUNT = 2000;

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function chunkIds(startId, count) {
    const chunks = [];
    let current = Number(startId);
    const end = current + Number(count);

    while (current < end) {
        const ids = [];

        for (
            let id = current;
            id < Math.min(current + IDS_PER_REQUEST, end);
            id++
        ) {
            ids.push(id);
        }

        chunks.push(ids);
        current += IDS_PER_REQUEST;
    }

    return chunks;
}

function clubFromInfoEntry(clubId, entry) {
    if (!entry?.name) return null;

    return {
        clubId: String(clubId),
        name: String(entry.name),
        crestAssetId:
            entry.customKit?.crestAssetId
                ? String(entry.customKit.crestAssetId)
                : null,
        raw: entry
    };
}

async function cacheClub(club) {
    await db.run(
        `
        INSERT OR REPLACE INTO club_search_cache
        (club_id, club_name, crest_asset_id, raw_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            club.clubId,
            club.name,
            club.crestAssetId,
            JSON.stringify(club.raw || {}),
            Date.now()
        ]
    );
}

async function searchCachedClubs(query, limit = 25) {
    const needle = `%${String(query || "").toLowerCase()}%`;

    const rows =
        await db.all(
            `
            SELECT *
            FROM club_search_cache
            WHERE lower(club_name) LIKE ?
            ORDER BY updated_at DESC
            LIMIT ?
            `,
            [
                needle,
                limit
            ]
        );

    return rows.map(row => ({
        clubId: row.club_id,
        name: row.club_name,
        crestAssetId: row.crest_asset_id
    }));
}

async function scanClubRange(options) {
    const query = normalize(options.query);
    const startId =
        Math.max(1, Number(options.startId || 1));
    const count =
        Math.min(
            MAX_SCAN_COUNT,
            Math.max(1, Number(options.count || DEFAULT_SCAN_COUNT))
        );
    const matches = [];
    let foundClubs = 0;

    for (const ids of chunkIds(startId, count)) {
        let info = null;

        try {
            info =
                await eaApi.getClubInfo(
                    ids.join(","),
                    { forceRefresh: Boolean(options.forceRefresh) }
                );
        } catch (err) {
            console.error("club search batch failed:", err.message);
            continue;
        }

        for (const [clubId, entry] of Object.entries(info || {})) {
            const club = clubFromInfoEntry(clubId, entry);
            if (!club) continue;

            foundClubs += 1;
            await cacheClub(club);

            if (normalize(club.name).includes(query)) {
                matches.push(club);
            }
        }
    }

    return {
        startId,
        count,
        endId: startId + count - 1,
        foundClubs,
        matches: matches.slice(0, 25)
    };
}

async function searchClubs(options) {
    const cached =
        await searchCachedClubs(options.query, 25);

    if (cached.length && !options.scan) {
        return {
            source: "cache",
            startId: options.startId,
            count: 0,
            endId: options.startId,
            foundClubs: cached.length,
            matches: cached
        };
    }

    const scanned =
        await scanClubRange(options);

    const combined = new Map();

    for (const club of [...scanned.matches, ...cached]) {
        combined.set(String(club.clubId), club);
    }

    return {
        ...scanned,
        source: "scan",
        matches: [...combined.values()].slice(0, 25)
    };
}

function buildClubSelect(matches, customId = "link_club") {
    const options =
        matches.slice(0, 25).map(club => ({
            label: club.name.slice(0, 100),
            description: `Club ID ${club.clubId}`.slice(0, 100),
            value: `${club.clubId}|${club.name}`.slice(0, 100)
        }));

    if (!options.length) {
        return [];
    }

    return [
        new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder("Select the club to link")
                    .addOptions(options)
            )
    ];
}

function formatSearchSummary(result, query) {
    const lines = [
        `Search: **${escapeMarkdown(query)}**`,
        result.count
            ? `Scanned Club IDs **${result.startId}-${result.endId}**`
            : "Used cached club results",
        `Clubs discovered in this batch: **${result.foundClubs}**`,
        `Matches shown: **${result.matches.length}**`
    ];

    if (result.count) {
        lines.push(
            `Next batch: start at **${result.endId + 1}** if your club is not listed.`
        );
    }

    return lines.join("\n");
}

async function linkClubToGuild(guildId, clubId) {
    await db.run(
        `
        INSERT OR REPLACE INTO clubs
        (guild_id, club_id)
        VALUES (?, ?)
        `,
        [
            guildId,
            String(clubId)
        ]
    );
}

module.exports = {
    DEFAULT_SCAN_COUNT,
    MAX_SCAN_COUNT,
    buildClubSelect,
    buildCrestUrl,
    formatSearchSummary,
    linkClubToGuild,
    searchClubs
};
