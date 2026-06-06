const axios = require("axios");

const SUPABASE_URL =
    process.env.WORLD_CUP_SUPABASE_URL ||
    "https://pagoqdpzbxpckhpqjoif.supabase.co";
const SUPABASE_ANON_KEY =
    process.env.WORLD_CUP_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZ29xZHB6YnhwY2tocHFqb2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzcyMTUsImV4cCI6MjA5NDI1MzIxNX0.DUCMOEHmZ8ZOVDpUshVzaOv45tMjwIUw1aNusQ9tc64";
const TOURNAMENT_SLUG =
    process.env.WORLD_CUP_TOURNAMENT_SLUG ||
    "world-cup-2026";

const client =
    axios.create({
        baseURL: `${SUPABASE_URL}/rest/v1`,
        timeout: 8000,
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

async function rows(table, params) {
    const response =
        await client.get(`/${table}`, {
            params
        });

    return Array.isArray(response.data)
        ? response.data
        : [];
}

async function getTournament() {
    const tournaments =
        await rows("tournaments", {
            select: "*",
            slug: `eq.${TOURNAMENT_SLUG}`
        });

    return tournaments[0] || null;
}

async function getProfiles(userIds) {
    const ids =
        [...new Set(userIds.filter(Boolean))];

    if (!ids.length) {
        return [];
    }

    return rows("profiles", {
        select: "id,username,avatar_url",
        id: `in.(${ids.join(",")})`
    });
}

async function getWorldCupData() {
    const tournament =
        await getTournament();

    if (!tournament) {
        return null;
    }

    const tournamentId =
        `eq.${tournament.id}`;
    const [
        participants,
        nations,
        groups,
        matches
    ] =
        await Promise.all([
            rows("tournament_participants", {
                select: "*",
                tournament_id: tournamentId,
                order: "registered_at.asc"
            }),
            rows("tournament_nations", {
                select: "*",
                tournament_id: tournamentId,
                order: "pool_order.asc"
            }),
            rows("tournament_groups", {
                select: "*",
                tournament_id: tournamentId,
                order: "position.asc"
            }),
            rows("tournament_matches", {
                select: "*",
                tournament_id: tournamentId,
                order: "scheduled_at.asc"
            })
        ]);
    const profiles =
        await getProfiles(
            participants.map(row => row.user_id)
        );
    const profileById =
        new Map(
            profiles.map(profile => [
                profile.id,
                profile
            ])
        );

    return {
        tournament,
        participants:
            participants.map(participant => ({
                ...participant,
                username:
                    profileById.get(participant.user_id)?.username ||
                    "Anonymous",
                avatar_url:
                    profileById.get(participant.user_id)?.avatar_url ||
                    null
            })),
        nations,
        groups,
        matches
    };
}

function calculateStandings(participants, matches) {
    const standings =
        new Map(
            participants.map(participant => [
                participant.id,
                {
                    participant,
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    gf: 0,
                    ga: 0,
                    gd: 0,
                    points: 0
                }
            ])
        );

    for (const match of matches) {
        if (
            match.status !== "finished" ||
            match.home_score == null ||
            match.away_score == null
        ) {
            continue;
        }

        const home =
            standings.get(match.home_participant_id);
        const away =
            standings.get(match.away_participant_id);

        if (!home || !away) {
            continue;
        }

        const homeScore =
            Number(match.home_score);
        const awayScore =
            Number(match.away_score);

        home.played += 1;
        away.played += 1;
        home.gf += homeScore;
        home.ga += awayScore;
        away.gf += awayScore;
        away.ga += homeScore;

        if (homeScore > awayScore) {
            home.won += 1;
            away.lost += 1;
            home.points += 3;
        } else if (awayScore > homeScore) {
            away.won += 1;
            home.lost += 1;
            away.points += 3;
        } else {
            home.drawn += 1;
            away.drawn += 1;
            home.points += 1;
            away.points += 1;
        }
    }

    return [...standings.values()]
        .map(row => ({
            ...row,
            gd: row.gf - row.ga
        }))
        .sort((a, b) =>
            b.points - a.points ||
            b.gd - a.gd ||
            b.gf - a.gf ||
            a.participant.username.localeCompare(b.participant.username)
        );
}

module.exports = {
    calculateStandings,
    getWorldCupData
};
