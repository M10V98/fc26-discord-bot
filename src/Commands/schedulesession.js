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
        .setName("schedulesession")
        .setDescription("Create a role-backed RSVP session")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName("date")
                .setDescription("Examples: 01/06/2026, 2026-06-01, 1 June 2026, tomorrow")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("time")
                .setDescription("Examples: 20:00, 8pm, 8.30pm, 2030")
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
                            `${interaction.options.getString("date")} ${interaction.options.getString("time")}`,
                        league:
                            interaction.options.getString("league"),
                        title:
                            interaction.options.getString("title")
                    }
                );

            await interaction.editReply(
                `Scheduled session created with role <@&${result.role.id}>.`
            );
        } catch (err) {
            console.error("schedulesession error:", err);
            await interaction.editReply(err.message || "Failed to create scheduled session.");
        }
    }
};
