const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("ratings")
        .setDescription("Top average ratings"),

    async execute(interaction) {

        await interaction.deferReply();

        const players =
            await db.all(
                `SELECT * FROM players`
            );

        const sorted =
            players
            .map(p => ({
                ...p,
                avg:
                    p.total_rating /
                    Math.max(p.matches, 1)
            }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setColor("#00b0f4")
            .setTitle("⭐ Rating Leaderboard");

        sorted.forEach((p, i) => {

            embed.addFields({
                name:
                    `#${i + 1} ${p.player_name}`,
                value:
                    `⭐ ${p.avg.toFixed(2)}`
            });

        });

        await interaction.editReply({
            embeds: [embed]
        });
    }
};