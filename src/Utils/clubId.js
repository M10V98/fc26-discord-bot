function normalizeClubId(input) {
    const value =
        String(input || "").trim();

    if (/^\d+$/.test(value)) {
        return value;
    }

    try {
        const url =
            new URL(value);
        const clubId =
            url.searchParams.get("clubId");

        if (/^\d+$/.test(clubId || "")) {
            return clubId;
        }
    } catch {
        // A plain non-numeric value is not a valid club ID.
    }

    return null;
}

function isValidClubId(input) {
    return normalizeClubId(input) === String(input || "").trim();
}

module.exports = {
    isValidClubId,
    normalizeClubId
};
