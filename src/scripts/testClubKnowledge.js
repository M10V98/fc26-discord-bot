const assert = require("assert");

const {
    answerClubKnowledge
} = require("../Services/clubKnowledge");

const fyzoProfile =
    answerClubKnowledge("Who is Fyzo?");

assert.ok(
    fyzoProfile?.startsWith("Fyzo is mostly known"),
    `Expected Fyzo profile, got: ${fyzoProfile}`
);
assert.strictEqual(
    answerClubKnowledge("According to Bella Ciao lore, which claim would fit perfectly into the Fyzo 50 Jobs 0 Hours incident?"),
    "All of the above"
);
assert.strictEqual(
    answerClubKnowledge("What happened to the Dirk Harrison double pivot?"),
    null
);

console.log("Club knowledge checks passed.");
