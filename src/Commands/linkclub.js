const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const {
    syncGuildStats
} = require("../Services/autoStatsSync");
const {
    buildClubSelect,
    formatSearchSummary,
    linkClubToGuild,
    searchClubs
} = require("../Services/clubSearch");

async function linkById(interaction, clubId) {
    await linkClubToGuild(
        interaction.guild.id,
        clubId
    );

    const syncResult =
        await syncGuildStats(
            interaction.guild.id,
            clubId,
            {
                forceRefresh: true
            }
        );

    await interaction.editReply(
        `Club linked: ${clubId}\nSynced ${syncResult.processed} recent match${syncResult.processed === 1 ? "" : "es"} automatically.`
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("linkclub")
        .setDescription("Link your EA club")
        .addSubcommand(subcommand =>
            subcommand
                .setName("id")
                .setDescription("Link by EA Club ID")
                .addStringOption(option =>
                    option
                        .setName("clubid")
                        .setDescription("EA Club ID")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("search")
                .setDescription("Search a Club ID batch by club name")
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
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const subcommand =
                interaction.options.getSubcommand();

            if (subcommand === "id") {
                return linkById(
                    interaction,
                    interaction.options.getString("clubid")
                );
            }

            const query =
                interaction.options.getString("name");
            const result =
                await searchClubs({
                    query,
                    startId: interaction.options.getInteger("start") || 1,
                    count: interaction.options.getInteger("count") || 500,
                    scan: true,
                    forceRefresh: true
                });
            const components =
                buildClubSelect(result.matches, "link_club");

            await interaction.editReply({
                content:
                    result.matches.length
                        ? `${formatSearchSummary(result, query)}\n\nSelect the club to link it to this server.`
                        : `${formatSearchSummary(result, query)}\n\nNo matching clubs found in that batch.`,
                components
            });
        } catch (err) {
            console.error("linkclub error:", err);

            await interaction.editReply(
                "Failed to link or search for a club."
            );
        }
    }
};
