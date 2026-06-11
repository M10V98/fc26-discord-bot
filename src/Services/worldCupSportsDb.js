const axios = require("axios");

const API_KEY =
    process.env.THESPORTSDB_API_KEY || "123";
const WORLD_CUP_LEAGUE_ID = "4429";
const WORLD_CUP_SEASON = "2026";
const CACHE_MS = 60 * 1000;
const NATION_ALIASES = {
    "Cape Verde": "Cabo Verde",
    "Czech Republic": "Czechia",
    "Ivory Coast": "Cote d'Ivoire",
    "United States": "USA"
};

const client =
    axios.create({
        baseURL:
            `https://www.thesportsdb.com/api/v1/json/${API_KEY}`,
        timeout: 8000
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
    const response =
        await client.get(path, { params });

    return response.data || {};
}

async function getWorldCupStandings() {
    return cached(
        "world-cup-standings",
        async () => {
            const data =
                await request(
                    "/lookuptable.php",
                    {
                        l: WORLD_CUP_LEAGUE_ID,
                        s: WORLD_CUP_SEASON
                    }
                );

            return Array.isArray(data.table)
                ? data.table
                : [];
        }
    );
}

async function findNationalTeam(nationName) {
    const searchName =
        NATION_ALIASES[nationName] || nationName;

    return cached(
        `team:${nationName.toLowerCase()}`,
        async () => {
            const data =
                await request(
                    "/searchteams.php",
                    { t: searchName }
                );
            const teams =
                Array.isArray(data.teams)
                    ? data.teams
                    : [];

            return (
                teams.find(team =>
                    team.strLeague === "FIFA World Cup"
                ) ||
                teams.find(team =>
                    team.strSport === "Soccer"
                ) ||
                null
            );
        }
    );
}

async function teamEvents(path, teamId, key) {
    if (!teamId) {
        return [];
    }

    return cached(
        `${path}:${teamId}`,
        async () => {
            const data =
                await request(
                    `/${path}.php`,
                    { id: teamId }
                );
            const events =
                data[key] || data.events || [];

            return Array.isArray(events)
                ? events
                : [];
        }
    );
}

async function getNationLiveData(nationName) {
    const [team, standings] =
        await Promise.all([
            findNationalTeam(nationName),
            getWorldCupStandings()
        ]);
    const [upcoming, recent] =
        await Promise.all([
            teamEvents("eventsnext", team?.idTeam, "events"),
            teamEvents("eventslast", team?.idTeam, "results")
        ]);
    const standing =
        standings.find(row =>
            row.idTeam === team?.idTeam
        ) || null;
    const groupStandings =
        standing
            ? standings
                .filter(row =>
                    row.strDescription === standing.strDescription
                )
                .sort((a, b) =>
                    Number(a.intRank) - Number(b.intRank)
                )
            : [];

    return {
        team,
        standing,
        groupStandings,
        upcoming:
            upcoming.filter(event =>
                event.idLeague === WORLD_CUP_LEAGUE_ID
            ),
        recent:
            recent.filter(event =>
                event.idLeague === WORLD_CUP_LEAGUE_ID
            )
    };
}

module.exports = {
    getNationLiveData,
    getWorldCupStandings
};
