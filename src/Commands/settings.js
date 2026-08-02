const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const {
    FOOTER
} = require("../Utils/embedStyle");
const {
    KEYS,
    getGuildSettings,
    setSetting
} = require("../Services/settingsService");
const { canUseAdminCommands } = require("../Utils/permissions");

function settingsEmbed(settings) {
    return new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("Bot Settings")
        .setDescription(
            [
                "**In-form Window**",
                `${settings.inFormWindow} matches`,
                "",
                "**Competitive In-form Window**",
                `${settings.compInFormWindow} friendly matches`,
                "",
                "**Schedule Pre Tag**",
                `${settings.schedulePreTagMinutes} minutes before kick-off`
            ].join("\n")
        )
        .setFooter(FOOTER);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("View or update server bot settings")
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View current settings")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Update command defaults")
                .addStringOption(option =>
                    option
                        .setName("setting")
                        .setDescription("Setting to update")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "Default /in-form window",
                                value: KEYS.inFormWindow
                            },
                            {
                                name: "Default /compin-form window",
                                value: KEYS.compInFormWindow
                            },
                            {
                                name: "Schedule pre-session tag",
                                value: KEYS.schedulePreTagMinutes
                            }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName("value")
                        .setDescription("Default value")
                        .setRequired(true)
                        .addChoices(
                            { name: "Last 5 matches", value: 5 },
                            { name: "Last 10 matches", value: 10 },
                            { name: "30 minutes before kick-off", value: 30 },
                            { name: "45 minutes before kick-off", value: 45 }
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!canUseAdminCommands(interaction)) {
            return interaction.editReply(
                "Only administrators or Managers can change server settings."
            );
        }

        const subcommand =
            interaction.options.getSubcommand();

        if (subcommand === "set") {
            const key =
                interaction.options.getString("setting");
            const value =
                interaction.options.getInteger("value");
            const allowed =
                key === KEYS.schedulePreTagMinutes
                    ? [30, 45]
                    : [5, 10];

            if (!allowed.includes(value)) {
                return interaction.editReply(
                    key === KEYS.schedulePreTagMinutes
                        ? "Schedule pre-session tag must be 30 or 45 minutes."
                        : "That stat window must be 5 or 10 matches."
                );
            }

            await setSetting(
                interaction.guild.id,
                key,
                value
            );
        }

        const settings =
            await getGuildSettings(interaction.guild.id);

        await interaction.editReply({
            embeds: [settingsEmbed(settings)]
        });
    }
};
