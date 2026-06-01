const {
    PermissionFlagsBits,
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
                `${settings.compInFormWindow} friendly matches`
            ].join("\n")
        )
        .setFooter(FOOTER);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("View or update server bot settings")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
                            { name: "Last 10 matches", value: 10 }
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (
            !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
        ) {
            return interaction.editReply(
                "Only administrators can change server settings."
            );
        }

        const subcommand =
            interaction.options.getSubcommand();

        if (subcommand === "set") {
            await setSetting(
                interaction.guild.id,
                interaction.options.getString("setting"),
                interaction.options.getInteger("value")
            );
        }

        const settings =
            await getGuildSettings(interaction.guild.id);

        await interaction.editReply({
            embeds: [settingsEmbed(settings)]
        });
    }
};
