const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");

const {
    getXPForNextLevel
} = require("../Utils/xpSystem");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    async execute(interaction) {

        await interaction.deferReply();

        const linked =
            await db.get(
                `SELECT * FROM linked_players
                 WHERE discord_id = ?`,
                [interaction.user.id]
            );

        if (!linked) {
            return interaction.editReply(
                "❌ Use /claim first."
            );
        }

        const player =
            await db.get(
                `SELECT * FROM players
                 WHERE player_name = ?`,
                [linked.player_name]
            );

        if (!player) {
            return interaction.editReply(
                "❌ No profile found."
            );
        }

        const nextLevelXP =
            getXPForNextLevel(player.level);

        const avgRating =
            (
                player.total_rating /
                Math.max(player.matches, 1)
            ).toFixed(2);

        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setTitle(
                `🔥 ${player.player_name}`
            )
            .setDescription(
                `📍 ${player.position}\n` +
                `🧠 ${player.archetype}`
            )
            .addFields(
                {
                    name: "Level",
                    value: `${player.level}`,
                    inline: true
                },

                {
                    name: "XP",
                    value:
                        `${player.xp} / ${nextLevelXP}`,
                    inline: true
                },

                {
                    name: "Matches",
                    value: `${player.matches}`,
                    inline: true
                },

                {
                    name: "Goals",
                    value: `${player.goals}`,
                    inline: true
                },

                {
                    name: "Assists",
                    value: `${player.assists}`,
                    inline: true
                },

                {
                    name: "Avg Rating",
                    value: `${avgRating}`,
                    inline: true
                }
            );

        await interaction.editReply({
            embeds: [embed]
        });
    }
};