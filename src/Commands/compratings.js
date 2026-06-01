const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    refreshAndGetCompetitiveMatches,
    aggregateCompetitivePlayers
} = require("../Services/compStats");
const {
    getCrestUrl
} = require("../Services/crests");
const {
    FOOTER,
    underline,
    number,
    buildLinkedMaps,
    displayName,
    getLinkedRows
} = require("../Utils/embedStyle");
const eaApi = require("../Services/eaApi");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("compratings")
        .setDescription("Competitive friendly-match rating leaderboard"),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const club =
                await db.get(
                    `SELECT * FROM clubs WHERE guild_id = ?`,
                    [interaction.guild.id]
                );

            if (!club) {
                return interaction.editReply("No club linked. Use /linkclub first.");
            }

            const [matches, info, crestUrl, linkedRows] =
                await Promise.all([
                    refreshAndGetCompetitiveMatches(
                        interaction.guild.id,
                        club.club_id,
                        { forceRefresh: true }
                    ),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            const players =
                aggregateCompetitivePlayers(matches, club.club_id)
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .slice(0, 10);

            if (!players.length) {
                return interaction.editReply("No competitive friendly data stored yet.");
            }

            const linkedMaps = buildLinkedMaps(linkedRows);
            const clubName =
                info?.[String(club.club_id)]?.name || "Club";

            const description =
                players
                    .map((player, index) =>
                        `#${index + 1} ${displayName(player.name, linkedMaps, player.playerId)} - **${number(player.avgRating, 2)}** average rating (${number(player.appearances)} apps)`
                    )
                    .join("\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`Competitive Ratings for ${underline(clubName)}`)
                    .setDescription(description)
                    .setFooter(FOOTER);

            if (crestUrl) embed.setThumbnail(crestUrl);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("compratings error:", err);
            await interaction.editReply("Failed to load competitive ratings.");
        }
    }
};
