// =========================
// CLUB CREST URL HELPER
// =========================
//
// EA serves club crests at a fixed CDN base. The "asset id" comes from
// the club's customKit.crestAssetId, prefixed with "l".

const eaApi = require("./eaApi");

const CREST_BASE =
    "https://eafc24.content.easports.com/" +
    "fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/" +
    "2024/fcweb/crests/256x256";

const memo = new Map();

function buildCrestUrl(crestAssetId) {

    if (!crestAssetId) return null;

    return `${CREST_BASE}/l${crestAssetId}.png`;
}

function extractCrestFromInfo(info, clubId) {

    if (!info || typeof info !== "object") return null;

    const entry = info[String(clubId)];

    return entry?.customKit?.crestAssetId || null;
}

function extractCrestFromMatches(matches, clubId) {

    if (!Array.isArray(matches)) return null;

    for (const match of matches) {

        const club =
            match?.clubs?.[String(clubId)];

        const id =
            club?.details?.customKit?.crestAssetId;

        if (id) return id;
    }

    return null;
}

async function getCrestUrl(clubId) {

    const key = String(clubId);

    if (memo.has(key)) {
        return memo.get(key);
    }

    let crestAssetId = null;

    try {
        const info = await eaApi.getClubInfo(clubId);
        crestAssetId = extractCrestFromInfo(info, clubId);
    } catch (err) {
        console.error("crest info lookup failed:", err.message);
    }

    if (!crestAssetId) {

        try {
            const league =
                await eaApi.getMatches(
                    clubId,
                    "leagueMatch",
                    { maxResultCount: 1000 }
                );

            crestAssetId =
                extractCrestFromMatches(league, clubId);

        } catch (err) {
            console.error("crest match lookup failed:", err.message);
        }
    }

    const url = buildCrestUrl(crestAssetId);

    memo.set(key, url);

    return url;
}

function clearCrestMemo() {
    memo.clear();
}

module.exports = {
    buildCrestUrl,
    getCrestUrl,
    clearCrestMemo
};
