const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const cache = require("../Utils/cache");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resetstats")
        .setDescription("Reset ALL stats (XP + tracking + competitive)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 🔒 HARD ADMIN CHECK (never rely on Discord UI alone)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ You must be an administrator to use this command.",
                ephemeral: true
            });
        }

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`resetstats_confirm:${interaction.user.id}`)
                .setLabel("Confirm Reset")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`resetstats_cancel:${interaction.user.id}`)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
            .setColor("#ff4d4d")
            .setTitle("⚠️ Confirm Full Stats Reset")
            .setDescription(
                [
                    "**This will permanently reset:**",
                    "• All XP (season + all-time)",
                    "• All tracked stats (goals, assists, games, etc)",
                    "• All competitive stats",
                    "",
                    "**This CANNOT be undone.**"
                ].join("\n")
            );

        await interaction.reply({
            embeds: [embed],
            components: [confirmRow],
            ephemeral: true
        });
    },

    async handleResetButtons(interaction) {
        const [action, userId] = interaction.customId.split(":");

        // 🔒 Only original user can press
        if (interaction.user.id !== userId) {
            return interaction.reply({
                content: "❌ You can't use this button.",
                ephemeral: true
            });
        }

        // 🔒 Admin check on button too
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Only administrators can use this button.",
                ephemeral: true
            });
        }

        if (action === "resetstats_cancel") {
            return interaction.update({
                content: "❌ Reset cancelled.",
                embeds: [],
                components: []
            });
        }

        if (action === "resetstats_confirm") {
            try {
                const guildId = interaction.guild.id;

                // 🔥 Reset ALL tracked + XP stats
                await db.run(
                    `
                    UPDATE players
                    SET 
                        xp = 0,
                        season_xp = 0,
                        all_time_xp = 0,
                        matches = 0,
                        goals = 0,
                        assists = 0,
                        passes = 0,
                        tackles = 0,
                        saves = 0,
                        clean_sheets = 0,
                        motm = 0,
                        red_cards = 0
                    WHERE guild_id = ?
                    `,
                    [guildId]
                );

                // 🔥 Reset competitive stats
                await db.run(
                    `
                    DELETE FROM comp_matches
                    WHERE guild_id = ?
                    `,
                    [guildId]
                );

                // 🔥 Clear cache
                cache.clear();

                return interaction.update({
                    content: "✅ All stats have been fully reset.",
                    embeds: [],
                    components: []
                });

            } catch (err) {
                console.error(err);

                return interaction.update({
                    content: "❌ Failed to reset stats.",
                    embeds: [],
                    components: []
                });
            }
        }
    }
};