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

function hasAdminPermission(interaction) {
    return interaction.member.permissions.has(
        PermissionFlagsBits.Administrator
    );
}

async function resetXpOnly(guildId) {
    await db.run(
        `
        UPDATE players
        SET
            xp = 0,
            season_xp = 0,
            all_time_xp = 0,
            level = 1
        WHERE guild_id = ?
        `,
        [guildId]
    );

    await db.run(
        `
        UPDATE quiz_scores
        SET xp_awarded = 0,
            updated_at = ?
        WHERE guild_id = ?
        `,
        [
            Date.now(),
            guildId
        ]
    );

    cache.clear();
}

async function resetAllStats(guildId) {
    await db.run(
        `
        UPDATE players
        SET
            xp = 0,
            season_xp = 0,
            all_time_xp = 0,
            level = 1,
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

    await db.run(
        `
        DELETE FROM comp_matches
        WHERE guild_id = ?
        `,
        [guildId]
    );

    await db.run(
        `
        UPDATE quiz_scores
        SET xp_awarded = 0,
            updated_at = ?
        WHERE guild_id = ?
        `,
        [
            Date.now(),
            guildId
        ]
    );

    cache.clear();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resetstats")
        .setDescription("Reset XP only or reset all tracked stats")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!hasAdminPermission(interaction)) {
            return interaction.reply({
                content: "You must be an administrator to use this command.",
                ephemeral: true
            });
        }

        const confirmRow =
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`resetstats_xp:${interaction.user.id}`)
                    .setLabel("Reset XP Only")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`resetstats_confirm:${interaction.user.id}`)
                    .setLabel("Reset All Stats")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`resetstats_cancel:${interaction.user.id}`)
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
            );

        const embed =
            new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("Choose Reset Type")
                .setDescription(
                    [
                        "**Reset XP Only will reset:**",
                        "- Current XP",
                        "- Season XP",
                        "- All-time XP",
                        "- Player level",
                        "",
                        "**Reset All Stats will permanently reset:**",
                        "- All XP and levels",
                        "- Tracked stats (goals, assists, games, etc)",
                        "- Competitive stats",
                        "",
                        "**This cannot be undone.**"
                    ].join("\n")
                );

        return interaction.reply({
            embeds: [embed],
            components: [confirmRow],
            ephemeral: true
        });
    },

    async handleResetButtons(interaction) {
        const [action, userId] =
            interaction.customId.split(":");

        if (interaction.user.id !== userId) {
            return interaction.reply({
                content: "You cannot use this button.",
                ephemeral: true
            });
        }

        if (!hasAdminPermission(interaction)) {
            return interaction.reply({
                content: "Only administrators can use this button.",
                ephemeral: true
            });
        }

        if (action === "resetstats_cancel") {
            return interaction.update({
                content: "Reset cancelled.",
                embeds: [],
                components: []
            });
        }

        if (action === "resetstats_xp") {
            try {
                await resetXpOnly(interaction.guild.id);

                return interaction.update({
                    content:
                        "XP has been reset. Match stats and competitive records were left untouched.",
                    embeds: [],
                    components: []
                });
            } catch (err) {
                console.error(err);

                return interaction.update({
                    content: "Failed to reset XP.",
                    embeds: [],
                    components: []
                });
            }
        }

        if (action === "resetstats_confirm") {
            try {
                await resetAllStats(interaction.guild.id);

                return interaction.update({
                    content: "All stats have been fully reset.",
                    embeds: [],
                    components: []
                });
            } catch (err) {
                console.error(err);

                return interaction.update({
                    content: "Failed to reset stats.",
                    embeds: [],
                    components: []
                });
            }
        }
    }
};
