function formatScoreboard(home, away) {

    return (
        `**${home.clubName}**  ${home.goals} - ` +
        `${away.goals}  **${away.clubName}**`
    );
}

module.exports = {
    formatScoreboard
};
