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
                        .setName("date")
                        .setDescription("Examples: 01/06/2026, 2026-06-01, 1 June 2026, tomorrow")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("load_up_time")
                        .setDescription("When players should load up. Examples: 19:45, 7.45pm, 1945")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("kickoff_time")
                        .setDescription("Kick-off time. Examples: 20:00, 8pm, 8.30pm, 2030")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("end_time")
                        .setDescription("When the event ends. Examples: 22:00, 10pm, 2230")
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
                            `${interaction.options.getString("date")} ${interaction.options.getString("kickoff_time")}`,
                        loadUpTimeText:
                            `${interaction.options.getString("date")} ${interaction.options.getString("load_up_time")}`,
                        endTimeText:
                            `${interaction.options.getString("date")} ${interaction.options.getString("end_time")}`,
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
            console.error("schedule session error:", err);
            await interaction.editReply(err.message || "Failed to create scheduled session.");
        }
    }
};
