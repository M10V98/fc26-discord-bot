const {
    EmbedBuilder,
    SlashCommandBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    number,
    FOOTER
} = require("../Utils/embedStyle");
const {
    getAllTimeFriendlyClubStats,
    getAllTimePlayerStats
} = require("../Services/legacyStats");

function rank(players, key, linkedMaps) {
    const rows = players
        .filter(player => Number(player[key] || 0) > 0)
        .sort((left, right) => {
            const difference = Number(right[key] || 0) - Number(left[key] || 0);

            return difference ||
                Number(right.matches || 0) - Number(left.matches || 0);
        })
        .slice(0, 5);

    return rows.length
        ? rows.map((player, index) =>
            `**${index + 1}.** ${displayName(player.player_name, linkedMaps, player.player_id)} — **${number(player[key])}**`
        ).join("\n")
        : "No tracked data yet.";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("legacy")
        .setDescription("FC 26 + FC 27 all-time club records"),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const [players, club, linkedRows] = await Promise.all([
                getAllTimePlayerStats(interaction.guild.id),
                getAllTimeFriendlyClubStats(interaction.guild.id),
                getLinkedRows(db, interaction.guild.id)
            ]);
            const linkedMaps = buildLinkedMaps(linkedRows);
            const winRate = club.games
                ? ((club.wins / club.games) * 100).toFixed(1)
                : "0.0";

            const embed = new EmbedBuilder()
                .setColor("#f5c542")
                .setTitle(`🏛️ ${interaction.guild.name} Legacy Records`)
                .setDescription(
                    "Combined bot-tracked FC 26 and FC 27 records. " +
                    "Club results intentionally include **friendly matches only**."
                )
                .addFields(
                    {
                        name: "⚽ Club Friendly Record",
                        value:
                            `**${number(club.games)}** played · ` +
                            `**${number(club.wins)}W ${number(club.draws)}D ${number(club.losses)}L**\n` +
                            `Goals: **${number(club.goals_for)}** for · **${number(club.goals_against)}** against\n` +
                            `Win rate: **${winRate}%**`,
                        inline: false
                    },
                    {
                        name: "🥇 Top Goalscorers",
                        value: rank(players, "goals", linkedMaps),
                        inline: true
                    },
                    {
                        name: "🎯 Top Assisters",
                        value: rank(players, "assists", linkedMaps),
                        inline: true
                    },
                    {
                        name: "🏟️ Most Appearances",
                        value: rank(players, "matches", linkedMaps),
                        inline: true
                    }
                )
                .setFooter(FOOTER);

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("legacy command error:", err);
            return interaction.editReply(
                "Failed to load legacy records."
            );
        }
    }
};
