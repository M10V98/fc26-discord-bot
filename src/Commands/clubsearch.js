const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const {
    buildClubSelect,
    formatSearchSummary,
    searchClubs
} = require("../Services/clubSearch");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clubsearch")
        .setDescription("Search EA clubs by scanning a Club ID batch")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Club name to search for")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("start")
                .setDescription("First Club ID to scan")
                .setMinValue(1)
        )
        .addIntegerOption(option =>
            option
                .setName("count")
                .setDescription("How many Club IDs to scan, max 2000")
                .setMinValue(1)
                .setMaxValue(2000)
        )
        .addBooleanOption(option =>
            option
                .setName("cache_only")
                .setDescription("Only search clubs already discovered by previous scans")
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const query =
                interaction.options.getString("name");
            const cacheOnly =
                interaction.options.getBoolean("cache_only") || false;
            const result =
                await searchClubs({
                    query,
                    startId: interaction.options.getInteger("start") || 1,
                    count: interaction.options.getInteger("count") || 500,
                    scan: !cacheOnly,
                    forceRefresh: true
                });
            const components =
                buildClubSelect(result.matches, "link_club");

            await interaction.editReply({
                content:
                    result.matches.length
                        ? `${formatSearchSummary(result, query)}\n\nSelect a club to link it to this server.`
                        : `${formatSearchSummary(result, query)}\n\nNo matching clubs found.`,
                components
            });
        } catch (err) {
            console.error("clubsearch error:", err);

            await interaction.editReply(
                "Failed to search clubs."
            );
        }
    }
};
