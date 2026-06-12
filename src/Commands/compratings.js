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
    compactRankLine,
    displayName,
    getLinkedRows,
    splitDescription
} = require("../Utils/embedStyle");
const eaApi = require("../Services/eaApi");

module.exports = {
    hidden: true,
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
                    .slice(0, 50);

            if (!players.length) {
                return interaction.editReply("No competitive friendly data stored yet.");
            }

            const linkedMaps = buildLinkedMaps(linkedRows);
            const clubName =
                info?.[String(club.club_id)]?.name || "Club";

            const lines =
                players
                    .map((player, index) =>
                        compactRankLine(
                            index,
                            displayName(player.name, linkedMaps, player.playerId),
                            `⭐ **${number(player.avgRating, 2)}** average rating (${number(player.appearances)} apps)`
                        )
                    );

            const embeds =
                splitDescription(lines)
                    .map((chunk, index) => {
                        const embed =
                            new EmbedBuilder()
                                .setColor("#ffffff")
                                .setTitle(
                                    index === 0
                                        ? `⭐ Competitive Ratings for ${underline(clubName)}`
                                        : "⭐ Competitive Ratings Continued"
                                )
                                .setDescription(chunk)
                                .setFooter(FOOTER);

                        if (crestUrl && index === 0) embed.setThumbnail(crestUrl);

                        return embed;
                    });

            await interaction.editReply({ embeds });
        } catch (err) {
            console.error("compratings error:", err);
            await interaction.editReply("Failed to load competitive ratings.");
        }
    }
};
