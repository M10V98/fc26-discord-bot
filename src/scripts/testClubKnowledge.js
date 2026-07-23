const assert = require("assert");

const {
    answerClubKnowledge,
    isClubKnowledgeQuestion,
    isPassiveClubKnowledgeQuestion
} = require("../Services/clubKnowledge");

assert.strictEqual(answerClubKnowledge("Who is Fyzo?"), null);
assert.strictEqual(
    answerClubKnowledge("What happened in the Fyzo incident?"),
    null
);
assert.strictEqual(isClubKnowledgeQuestion("Tell me old club history"), false);
assert.strictEqual(isPassiveClubKnowledgeQuestion("old club story"), false);

console.log("Club knowledge checks passed: removed club story, history, and quiz question answers.");
