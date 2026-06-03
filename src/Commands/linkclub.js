const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const {
    syncGuildStats
} = require("../Services/autoStatsSync");
const db = require("../Utils/db");

async function linkById(interaction, clubId) {
   console.log({
    guild: interaction.guild,
    guildId: interaction.guildId
});
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
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("linkclub")
        .setDescription("Link your EA club. Find your ClubID on the EA Clubs Ranking website.")
        .addStringOption(option =>
            option
                .setName("clubid")
                .setDescription("EA ClubID from the EA Clubs Ranking website")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            return linkById(
                interaction,
                interaction.options.getString("clubid")
            );
        } catch (err) {
            console.error("linkclub error:", err);

            await interaction.editReply(
                "Failed to link club."
            );
        }
    }
};
