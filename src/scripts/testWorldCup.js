const assert = require("node:assert/strict");

const {
    calculateStandings
} = require("../Services/worldCupApi");
const {
    accountLinkResponse,
    liveEmbeds,
    myNationEmbeds,
    realWorldCupEmbeds,
    raffleEmbeds
} = require("../Commands/worldcup");
const worldCupCommand =
    require("../Commands/worldcup");

const participants = [
    { id: "a", username: "Alpha" },
    { id: "b", username: "Bravo" },
    { id: "c", username: "Charlie" }
];

const standings =
    calculateStandings(
        participants,
        [
            {
                status: "finished",
                home_participant_id: "a",
                away_participant_id: "b",
                home_score: 2,
                away_score: 0
            },
            {
                status: "finished",
                home_participant_id: "b",
                away_participant_id: "c",
                home_score: 1,
                away_score: 1
            },
            {
                status: "scheduled",
                home_participant_id: "a",
                away_participant_id: "c",
                home_score: null,
                away_score: null
            }
        ]
    );

assert.deepEqual(
    standings.map(row => row.participant.id),
    ["a", "c", "b"]
);
assert.equal(standings[0].points, 3);
assert.equal(standings[0].gd, 2);
assert.equal(standings[1].points, 1);
assert.equal(standings[2].points, 1);
assert.equal(standings[2].gd, -2);

const raffle =
    raffleEmbeds({
        raffle: {
            status: "active",
            pool_total_pence: 1250
        },
        participants: [
            {
                user_id: "user-a",
                username: "Alpha"
            }
        ],
        assignments: [
            {
                nation_id: "nation-a",
                user_id: "user-a",
                status: "active"
            }
        ],
        nations: [
            {
                id: "nation-a",
                name: "Argentina",
                flag_emoji: "🇦🇷"
            },
            {
                id: "nation-b",
                name: "Brazil",
                flag_emoji: "🇧🇷"
            }
        ],
        contributions: []
    });

assert.equal(raffle.length, 2);
assert.match(raffle[0].data.description, /Nations assigned:\*\* 1\/2/);
assert.match(raffle[0].data.description, /£12\.50/);
assert.match(raffle[1].data.description, /Argentina.*Alpha/s);
assert.match(raffle[1].data.description, /Brazil.*Unassigned/s);

const linkResponse =
    accountLinkResponse({
        participants: [
            {
                user_id: "user-a",
                username: "Alpha"
            }
        ],
        assignments: [
            {
                nation_id: "nation-a",
                user_id: "user-a"
            }
        ],
        nations: [
            {
                id: "nation-a",
                name: "Mexico"
            }
        ]
    });

assert.equal(
    linkResponse.components[0].components[0].data.custom_id,
    "worldcup_mynation_link"
);

const myNations =
    myNationEmbeds(
        {
            raffle: {
                pool_total_pence: 6500
            },
            contributions: []
        },
        {
            username: "Alpha"
        },
        [
            {
                assignment: {
                    status: "active"
                },
                nation: {
                    name: "Mexico",
                    flag_emoji: "🇲🇽"
                },
                live: {
                    team: {
                        strTeamBadge: "https://example.com/mexico.png"
                    },
                    standing: {
                        intRank: "1",
                        intPoints: "0",
                        intPlayed: "0",
                        intWin: "0",
                        intDraw: "0",
                        intLoss: "0",
                        intGoalsFor: "0",
                        intGoalsAgainst: "0",
                        intGoalDifference: "0",
                        strDescription: "Group A"
                    },
                    groupStandings: [
                        {
                            intRank: "1",
                            strTeam: "Mexico",
                            intPoints: "0",
                            intPlayed: "0",
                            intWin: "0",
                            intDraw: "0",
                            intLoss: "0",
                            intGoalsFor: "0",
                            intGoalsAgainst: "0",
                            intGoalDifference: "0"
                        }
                    ],
                    upcoming: [
                        {
                            strHomeTeam: "Mexico",
                            strAwayTeam: "South Africa",
                            strTimestamp: "2026-06-11T19:00:00",
                            strGroup: "A"
                        }
                    ],
                    recent: []
                }
            }
        ]
    );

assert.equal(myNations.length, 2);
assert.match(myNations[0].data.description, /Community pool:\*\* £65/);
assert.match(myNations[1].data.description, /Group position:\*\* 1/);
assert.match(myNations[1].data.description, /0 scored, 0 conceded/);
assert.match(
    myNations[1].data.fields[0].value,
    /Mexico vs South Africa/
);
assert.equal(myNations[1].data.fields[0].name, "📅 Next Fixture");
assert.equal(myNations[1].data.fields[1].name, "⚽ Recent Results");
assert.match(myNations[1].data.fields[2].value, /0 GF 0 GA 0 GD/);

const liveData = {
    tournament: {
        status: "registration_open",
        subtitle: "International Tournament",
        registration_closes_at: "2026-06-18T18:00:00Z",
        group_count: 8,
        group_size: 4
    },
    participants: [],
    nations: [],
    groups: [],
    matches: []
};

for (
    const section of [
        "tournament",
        "info",
        "participants",
        "draw",
        "groups",
        "fixtures",
        "results",
        "bracket",
        "awards"
    ]
) {
    const embeds =
        liveEmbeds(section, liveData);

    assert.ok(
        Array.isArray(embeds) && embeds.length,
        `${section} should return at least one live embed`
    );
}

const commandJson =
    worldCupCommand.data.toJSON();

assert.deepEqual(
    commandJson.options.map(option => option.name),
    ["section"]
);
assert.ok(
    commandJson.options[0]
        .choices
        .some(choice =>
            choice.name === "Bella Ciao Tournament - Info & Rules"
        )
);

const realWorldCup =
    realWorldCupEmbeds(
        "real_groups",
        {
            standings: {
                A: [
                    {
                        team: "Mexico",
                        position: 1,
                        points: 3,
                        played: 1,
                        won: 1,
                        drawn: 0,
                        lost: 0,
                        goalsFor: 2,
                        goalsAgainst: 0,
                        goalDifference: 2
                    }
                ]
            },
            matches: [],
            tournament: {
                tournament: {},
                teams: []
            }
        }
    );

assert.match(realWorldCup[0].data.description, /Mexico.*\+2\s+3/s);

console.log("World Cup standings checks passed.");
