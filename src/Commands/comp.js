const {
    SlashCommandBuilder
} = require("discord.js");

const sections = {
    matches: require("./compmatches"),
    stats: require("./compstats"),
    top: require("./comptop"),
    ratings: require("./compratings"),
    player: require("./compplayerstats"),
    form: require("./compin-form")
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("competitive")
        .setDescription("View competitive match and player data")
        .addStringOption(option =>
            option
                .setName("section")
                .setDescription("Choose the competitive data to view")
                .setRequired(true)
                .addChoices(
                    { name: "Recent Matches", value: "matches" },
                    { name: "Club Statistics", value: "stats" },
                    { name: "Top Players", value: "top" },
                    { name: "Rating Leaderboard", value: "ratings" },
                    { name: "Player Statistics", value: "player" },
                    { name: "In-form Players", value: "form" }
                )
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User for Player Statistics")
        )
        .addStringOption(option =>
            option
                .setName("player")
                .setDescription("Claimed player for Player Statistics")
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option
                .setName("last")
                .setDescription("Recent match window for In-form Players")
                .addChoices(
                    { name: "Last 5 matches", value: 5 },
                    { name: "Last 10 matches", value: 10 }
                )
        ),

    async autocomplete(interaction) {
        return sections.player.autocomplete(interaction);
    },

    async execute(interaction) {
        const section =
            interaction.options.getString("section");
        const command =
            sections[section];

        if (!command) {
            return interaction.reply(
                "That competitive section is unavailable."
            );
        }

        return command.execute(interaction);
    }
};
