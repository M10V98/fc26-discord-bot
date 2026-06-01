const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const eaApi = require("../Services/eaApi");
const {
    getCrestUrl
} = require("../Services/crests");
const {
    FOOTER,
    buildLinkedMaps,
    compactRankLine,
    displayName,
    getLinkedRows,
    splitDescription,
    underline
} = require("../Utils/embedStyle");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ratings")
        .setDescription("Top average ratings"),

    async execute(interaction) {
        await interaction.deferReply();

        const club =
            await db.get(
                `SELECT * FROM clubs WHERE guild_id = ?`,
                [interaction.guild.id]
            );

        const [players, info, crestUrl, linkedRows] =
            await Promise.all([
                db.all(
                    `SELECT * FROM players WHERE guild_id = ?`,
                    [interaction.guild.id]
                ),
                club ? eaApi.getClubInfo(club.club_id).catch(() => null) : null,
                club ? getCrestUrl(club.club_id).catch(() => null) : null,
                getLinkedRows(db, interaction.guild.id)
            ]);

        const sorted =
            players
                .map(player => ({
                    ...player,
                    avg:
                        Number(player.total_rating || 0) /
                        Math.max(Number(player.matches || 0), 1)
                }))
                .filter(player => Number(player.matches || 0) > 0)
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 50);

        if (!sorted.length) {
            return interaction.editReply("No rating data found yet.");
        }

        const clubName =
            club && info?.[String(club.club_id)]?.name
                ? info[String(club.club_id)].name
                : interaction.guild.name;
        const linkedMaps =
            buildLinkedMaps(linkedRows);
        const lines =
            sorted.map((player, index) =>
                compactRankLine(
                    index,
                    displayName(
                        player.player_name,
                        linkedMaps,
                        player.player_id
                    ),
                    `⭐ **${player.avg.toFixed(2)}** average rating (${player.matches || 0} apps)`
                )
            );
        const embeds =
            splitDescription(lines)
                .map((chunk, index) => {
                    const embed =
                        new EmbedBuilder()
                            .setColor("#00b0f4")
                            .setTitle(
                                index === 0
                                    ? `⭐ Rating Leaderboard for ${underline(clubName)}`
                                    : "⭐ Rating Leaderboard Continued"
                            )
                            .setDescription(chunk)
                            .setFooter(FOOTER);

                    if (crestUrl && index === 0) {
                        embed.setThumbnail(crestUrl);
                    }

                    return embed;
                });

        await interaction.editReply({ embeds });
    }
};
