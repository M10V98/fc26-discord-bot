const assert = require("node:assert/strict");

const {
    calculateStandings
} = require("../Services/worldCupApi");
const {
    raffleEmbeds
} = require("../Commands/worldcup");

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

console.log("World Cup standings checks passed.");
