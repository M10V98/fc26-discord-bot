const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../Utils/db");

const {
    syncGuildStats
} = require("../Services/autoStatsSync");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("linkclub")
        .setDescription("Link your EA club")
        .addStringOption(option =>
            option
                .setName("clubid")
                .setDescription("EA Club ID")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {

            const clubId =
                interaction.options.getString(
                    "clubid"
                );

            await db.run(
                `
                INSERT OR REPLACE INTO clubs
                (guild_id, club_id)
                VALUES (?, ?)
                `,
                [
                    interaction.guild.id,
                    clubId
                ]
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

        } catch (err) {

            console.error(
                "linkclub error:",
                err
            );

            await interaction.editReply(
                "Failed to link club."
            );
        }
    }
};
