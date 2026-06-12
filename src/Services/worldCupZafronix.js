const axios = require("axios");

const API_KEY =
    process.env.ZAFRONIX_WORLD_CUP_API_KEY;
const CACHE_MS = 5 * 60 * 1000;
const NATION_ALIASES = {
    "Cape Verde": "Cabo Verde",
    "Czech Republic": "Czechia",
    "Ivory Coast": "Côte d'Ivoire",
    "South Korea": "Korea Republic",
    "United States": "USA"
};

const client =
    axios.create({
        baseURL:
            "https://api.zafronix.com/fifa/worldcup/v1",
        timeout: 10000,
        headers: API_KEY
            ? { "X-API-Key": API_KEY }
            : {}
    });
const cache = new Map();

async function cached(key, load) {
    const existing =
        cache.get(key);

    if (
        existing &&
        Date.now() - existing.createdAt < CACHE_MS
    ) {
        return existing.value;
    }

    const value =
        await load();

    cache.set(key, {
        createdAt: Date.now(),
        value
    });

    return value;
}

async function request(path, params) {
    if (!API_KEY) {
        throw new Error(
            "ZAFRONIX_WORLD_CUP_API_KEY is not configured"
        );
    }

    const response =
        await client.get(path, { params });

    return response.data;
}

function normalizedName(name) {
    return String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function nationMatches(candidate, nationName) {
    const expected =
        NATION_ALIASES[nationName] || nationName;

    return normalizedName(candidate) === normalizedName(expected);
}

async function getWorldCupLiveData() {
    return cached(
        "zafronix:world-cup:2026",
        async () => {
            const [tournament, matches, standings] =
                await Promise.all([
                    request("/tournaments/2026"),
                    request("/matches", { year: 2026 }),
                    request("/standings", { year: 2026 })
                ]);

            return {
                tournament,
                matches:
                    Array.isArray(matches?.data)
                        ? matches.data
                        : [],
                standings:
                    standings?.groups || {}
            };
        }
    );
}

function normalizeStanding(row, groupName, team) {
    const goalsFor =
        row.goalsFor ?? row.gf ?? 0;
    const goalsAgainst =
        row.goalsAgainst ?? row.ga ?? 0;

    return {
        strTeam: row.team,
        strTeamBadge: team?.flag?.flagUrl || null,
        intRank: row.position,
        intPoints: row.points ?? row.pts ?? 0,
        intPlayed: row.played ?? 0,
        intWin: row.won ?? 0,
        intDraw: row.drawn ?? 0,
        intLoss: row.lost ?? 0,
        intGoalsFor: goalsFor,
        intGoalsAgainst: goalsAgainst,
        intGoalDifference:
            row.goalDifference ?? goalsFor - goalsAgainst,
        strDescription: groupName
            ? `Group ${groupName}`
            : "Group Table"
    };
}

function normalizeMatch(match) {
    return {
        strHomeTeam: match.homeTeam || match.homeRef || "TBC",
        strAwayTeam: match.awayTeam || match.awayRef || "TBC",
        strTimestamp:
            match.kickoffUtc ||
            (
                match.date
                    ? `${match.date}T${match.kickoff || "00:00"}:00Z`
                    : null
            ),
        intHomeScore: match.homeScore,
        intAwayScore: match.awayScore,
        strGroup:
            String(match.stage || "")
                .replace(/^group_/i, "")
                .toUpperCase()
    };
}

async function getNationLiveData(nationName) {
    const { tournament, matches, standings } =
        await getWorldCupLiveData();
    const teams =
        Array.isArray(tournament?.teams)
            ? tournament.teams
            : [];
    const team =
        teams.find(item =>
            nationMatches(item.name, nationName)
        ) || null;
    const groupName =
        team?.groupStage?.group;
    const standingRows =
        Array.isArray(standings[groupName])
            ? standings[groupName]
            : [];
    const groupStandings =
        groupName
            ? standingRows
                .map(row =>
                    normalizeStanding(
                        row,
                        groupName,
                        teams.find(item =>
                            nationMatches(item.name, row.team)
                        )
                    )
                )
                .sort((a, b) =>
                    (a.intRank || 99) - (b.intRank || 99)
                )
            : [];
    const standing =
        groupStandings.find(row =>
            nationMatches(row.strTeam, nationName)
        ) || null;
    const nationMatchesList =
        matches.filter(match =>
            nationMatches(match.homeTeam, nationName) ||
            nationMatches(match.awayTeam, nationName)
        );

    return {
        team: team
            ? {
                strTeam: team.name,
                strTeamBadge: team.flag?.flagUrl || null
            }
            : null,
        standing,
        groupStandings,
        upcoming:
            nationMatchesList
                .filter(match =>
                    match.status !== "finished" &&
                    match.homeScore == null &&
                    match.awayScore == null
                )
                .map(normalizeMatch),
        recent:
            nationMatchesList
                .filter(match =>
                    match.status === "finished" ||
                    (
                        match.homeScore != null &&
                        match.awayScore != null
                    )
                )
                .map(normalizeMatch)
    };
}

module.exports = {
    getNationLiveData,
    getWorldCupLiveData
};
