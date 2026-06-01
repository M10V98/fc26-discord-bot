const {
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const {
    canManageSessions,
    createSession
} = require("../Services/scheduleSessions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("schedule")
        .setDescription("Create scheduled club sessions")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName("session")
                .setDescription("Create a role-backed RSVP session")
                .addStringOption(option =>
                    option
                        .setName("time_date")
                        .setDescription("Example: 2026-06-01 20:00 or 01/06/2026 20:00")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("league")
                        .setDescription("League or competition name")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("title")
                        .setDescription("Session title")
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!canManageSessions(interaction)) {
            return interaction.editReply(
                "Only server administrators can schedule sessions."
            );
        }

        try {
            const result =
                await createSession(
                    interaction,
                    {
                        timeText:
                            interaction.options.getString("time_date"),
                        league:
                            interaction.options.getString("league"),
                        title:
                            interaction.options.getString("title") ||
                            `${interaction.guild.name} Scheduled Session`
                    }
                );

            await interaction.editReply(
                `Scheduled session created with role <@&${result.role.id}>.`
            );
        } catch (err) {
            console.error("schedule session error:", err);
            await interaction.editReply(err.message || "Failed to create scheduled session.");
        }
    }
};
