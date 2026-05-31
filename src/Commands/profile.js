const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const archetypes = require("../Utils/archetypes");

const {
    getLevelFromXP,
    getTotalXPForLevel
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
                 WHERE guild_id = ?
                 AND discord_id = ?`,
                [
                    interaction.guild.id,
                    interaction.user.id
                ]
            );

        if (!linked) {
            return interaction.editReply(
                "Use /claim first."
            );
        }

        const player =
            await db.get(
                `SELECT * FROM players
                 WHERE guild_id = ?
                 AND (
                    player_id = ?
                    OR player_name = ?
                 )`,
                [
                    interaction.guild.id,
                    linked.player_id,
                    linked.player_name
                ]
            );

        if (!player) {
            return interaction.editReply(
                "No profile found."
            );
        }

        const currentLevel =
            getLevelFromXP(player.xp || 0);

        const nextLevelXP =
            getTotalXPForLevel(currentLevel + 1);

        const avgRating =
            (
                player.total_rating /
                Math.max(player.matches, 1)
            ).toFixed(2);

        const archetype =
            archetypes[player.archetype] ||
            player.archetype ||
            "Unknown";

        const position =
            player.position &&
            String(player.position).toLowerCase() !== "null"
                ? player.position
                : archetype;

        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setTitle(player.player_name)
            .setDescription(
                `Position: ${position}\n` +
                `Archetype: ${archetype}`
            )
            .addFields(
                {
                    name: "Level",
                    value: `${currentLevel}`,
                    inline: true
                },
                {
                    name: "XP",
                    value: `${player.xp} / ${nextLevelXP}`,
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
