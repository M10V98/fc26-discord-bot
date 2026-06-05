const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const {
    syncGuildStats
} = require("../Services/autoStatsSync");
const {
    addLinkedClub
} = require("../Services/clubLinks");

async function linkById(interaction, clubId) {
    console.log({
        guild: interaction.guild,
        guildId: interaction.guildId
    });

    const linked =
        await addLinkedClub(
            interaction.guild.id,
            clubId,
            {
                makeDefault: true
            }
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
        `Club linked as the server default: ${linked.club_name || linked.club_id}\nSynced ${syncResult.processed} recent match${syncResult.processed === 1 ? "" : "es"} automatically.`
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("linkclub")
        .setDescription("Link your EA club. Find your ClubID on the EA Clubs Ranking website.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // ✅ Admin-only visibility
        .addStringOption(option =>
            option
                .setName("clubid")
                .setDescription("EA ClubID from the EA Clubs Ranking website")
                .setRequired(true)
        ),

    async execute(interaction) {
        // ✅ Admin check (runtime protection)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "You must be an admin to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

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
