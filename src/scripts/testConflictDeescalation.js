const assert = require("node:assert/strict");

const {
    conflictScore,
    shouldIntervene
} = require("../Services/conflictDeescalation");

assert.equal(conflictScore("fair enough"), 0);
assert.equal(conflictScore("not true"), 1);
assert.ok(conflictScore("shut up you idiot") >= 2);

assert.equal(
    shouldIntervene([
        { authorId: "a", score: 2 },
        { authorId: "b", score: 2 },
        { authorId: "a", score: 1 },
        { authorId: "b", score: 1 },
        { authorId: "a", score: 1 },
        { authorId: "b", score: 1 }
    ]),
    true
);

assert.equal(
    shouldIntervene([
        { authorId: "a", score: 2 },
        { authorId: "b", score: 0 },
        { authorId: "a", score: 0 }
    ]),
    false
);

assert.equal(
    shouldIntervene([
        { authorId: "a", score: 0 },
        { authorId: "b", score: 0 },
        { authorId: "a", score: 0 },
        { authorId: "b", score: 0 },
        { authorId: "a", score: 0 }
    ]),
    false
);

assert.equal(
    shouldIntervene([
        { authorId: "a", score: 0 },
        { authorId: "b", score: 0.5 },
        { authorId: "a", score: 0 },
        { authorId: "b", score: 0 },
        { authorId: "a", score: 0 },
        { authorId: "b", score: 0.5 },
        { authorId: "a", score: 0 },
        { authorId: "b", score: 0 }
    ]),
    false,
    "A prolonged mild disagreement must not trigger."
);

assert.equal(
    shouldIntervene([
        { authorId: "a", score: 2 },
        { authorId: "b", score: 0.5 },
        { authorId: "a", score: 2 },
        { authorId: "b", score: 0.5 },
        { authorId: "a", score: 2 },
        { authorId: "b", score: 0.5 }
    ]),
    false,
    "Hostility from only one person must not trigger."
);

console.log("Conflict de-escalation checks passed.");
