const {
    ActionRowBuilder,
    ModalBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const {
    canManageSessions,
    createSession
} = require("../Services/scheduleSessions");

function modalInput(customId, label, placeholder) {
    return new ActionRowBuilder().addComponents(
        new TextInputBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setPlaceholder(placeholder)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
    );
}

function guidedModal() {
    return new ModalBuilder()
        .setCustomId("schedule_guided_submit")
        .setTitle("Schedule Club Session")
        .addComponents(
            modalInput("date", "Date", "01/07/2026 or tomorrow"),
            modalInput("load", "Load-up time", "19:45"),
            modalInput("kickoff", "Kick-off time", "20:00"),
            modalInput("end", "End time", "22:00"),
            modalInput("league-title", "League | optional title", "VPG League | Match Night")
        );
}

async function createFromValues(interaction, values) {
    const result = await createSession(interaction, {
        timeText: `${values.date} ${values.kickoff}`,
        loadUpTimeText: `${values.date} ${values.load}`,
        endTimeText: `${values.date} ${values.end}`,
        league: values.league,
        title: values.title || null
    });
    return interaction.editReply(
        `Scheduled session created with role <@&${result.role.id}>.`
    );
}

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
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("guided")
                .setDescription("Mobile-friendly guided session setup")
        ),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === "guided") {
            if (!canManageSessions(interaction)) {
                return interaction.reply({
                    content: "Only server administrators can schedule sessions.",
                    flags: MessageFlags.Ephemeral
                });
            }
            return interaction.showModal(guidedModal());
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!canManageSessions(interaction)) {
            return interaction.editReply(
                "Only server administrators can schedule sessions."
            );
        }

        try {
            await createFromValues(interaction, {
                date: interaction.options.getString("date"),
                load: interaction.options.getString("load_up_time"),
                kickoff: interaction.options.getString("kickoff_time"),
                end: interaction.options.getString("end_time"),
                league: interaction.options.getString("league"),
                title: interaction.options.getString("title")
            });
        } catch (err) {
            console.error("schedule session error:", err);
            await interaction.editReply(err.message || "Failed to create scheduled session.");
        }
    },

    async handleGuidedModal(interaction) {
        if (!canManageSessions(interaction)) {
            return interaction.reply({
                content: "Only server administrators can schedule sessions.",
                flags: MessageFlags.Ephemeral
            });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const [league, ...titleParts] = interaction.fields
                .getTextInputValue("league-title")
                .split("|")
                .map(value => value.trim());
            return await createFromValues(interaction, {
                date: interaction.fields.getTextInputValue("date"),
                load: interaction.fields.getTextInputValue("load"),
                kickoff: interaction.fields.getTextInputValue("kickoff"),
                end: interaction.fields.getTextInputValue("end"),
                league,
                title: titleParts.join(" | ") || null
            });
        } catch (err) {
            console.error("guided schedule error:", err);
            return interaction.editReply(err.message || "Failed to create scheduled session.");
        }
    }
};
