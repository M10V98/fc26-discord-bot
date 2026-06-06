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

const {
    CLUB_LORE_QUIZ_QUESTIONS
} = require("../Services/clubKnowledge");
const questionKeys =
    CLUB_LORE_QUIZ_QUESTIONS.map(question =>
        String(question[0])
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
    );

assert.strictEqual(
    new Set(questionKeys).size,
    questionKeys.length,
    "Club lore quiz prompts must be unique"
);
assert.ok(
    CLUB_LORE_QUIZ_QUESTIONS.length >= 360,
    `Expected at least 360 club lore questions, got ${CLUB_LORE_QUIZ_QUESTIONS.length}`
);
for (const [prompt, answers, correct] of CLUB_LORE_QUIZ_QUESTIONS) {
    assert.ok(prompt && Array.isArray(answers), "Every lore question needs a prompt and answers");
    assert.strictEqual(answers.length, 4, `${prompt} must have four answers`);
    assert.ok(Number.isInteger(correct) && correct >= 0 && correct < 4, `${prompt} has an invalid correct answer`);
}

console.log(`Club knowledge checks passed (${CLUB_LORE_QUIZ_QUESTIONS.length} unique lore questions).`);
