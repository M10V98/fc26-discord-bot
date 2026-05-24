const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../Utils/db");
const { getLevel } = require("../Services/levelService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("XP leaderboard"),

    async execute(interaction) {

        await interaction.deferReply();

        const players = await db.all(
            `
            SELECT player_name, xp
            FROM players
            ORDER BY xp DESC
            LIMIT 10
            `
        );

        if (players.length === 0) {
            return interaction.editReply(
                "No players found yet."
            );
        }

        const embed = new EmbedBuilder()
            .setTitle("🏆 XP Leaderboard")
            .setColor("Gold");

        players.forEach((p, i) => {

            const level = getLevel(p.xp || 0);

            embed.addFields({
                name: `#${i + 1} ${p.player_name}`,
                value: `XP: ${p.xp || 0} | ${level.name}`
            });
        });

        await interaction.editReply({ embeds: [embed] });
    }
};
