function getClubName(club) {
    return club?.details?.name || "Unknown";
}

function formatScoreboard(home, away) {

    return (
        `**${getClubName(home)}**  ${home.goals || 0} - ` +
        `${away.goals || 0}  **${getClubName(away)}**`
    );
}

module.exports = {
    formatScoreboard,
    getClubName
};
