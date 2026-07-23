const assert = require("node:assert/strict");

const {
    isValidClubId,
    normalizeClubId
} = require("../Utils/clubId");

assert.equal(normalizeClubId("30523"), "30523");
assert.equal(normalizeClubId(" 30523 "), "30523");
assert.equal(
    normalizeClubId(
        "https://www.ea.com/en-gb/games/ea-sports-fc/clubs/overview?clubId=30523&platform=common-gen5"
    ),
    "30523"
);
assert.equal(normalizeClubId("VantaXI"), null);
assert.equal(normalizeClubId("fc turko"), null);
assert.equal(normalizeClubId("https://www.ea.com/no-club-id"), null);
assert.equal(isValidClubId("30523"), true);
assert.equal(isValidClubId("https://example.com?clubId=30523"), false);

console.log("Club ID normalization tests passed.");
