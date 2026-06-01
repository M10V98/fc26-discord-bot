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
    getLevel
} = require("../Services/levelService");
const {
    FOOTER,
    compactRankLine,
    splitDescription,
    underline
} = require("../Utils/embedStyle");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("XP leaderboard"),

    async execute(interaction) {
        await interaction.deferReply();

        const club =
            await db.get(
                `SELECT * FROM clubs WHERE guild_id = ?`,
                [interaction.guild.id]
            );

        const [players, info, crestUrl] =
            await Promise.all([
                db.all(
                    `
                    SELECT player_name, xp
                    FROM players
                    WHERE guild_id = ?
                    ORDER BY xp DESC
                    LIMIT 50
                    `,
                    [interaction.guild.id]
                ),
                club ? eaApi.getClubInfo(club.club_id).catch(() => null) : null,
                club ? getCrestUrl(club.club_id).catch(() => null) : null
            ]);

        if (!players.length) {
            return interaction.editReply("No players found yet.");
        }

        const clubName =
            club && info?.[String(club.club_id)]?.name
                ? info[String(club.club_id)].name
                : interaction.guild.name;
        const lines =
            players.map((player, index) => {
                const level = getLevel(player.xp || 0);

                return compactRankLine(
                    index,
                    player.player_name,
                    `🏆 **${player.xp || 0} XP** | ${level.name}`
                );
            });
        const embeds =
            splitDescription(lines)
                .map((chunk, index) => {
                    const embed =
                        new EmbedBuilder()
                            .setColor("#f5c542")
                            .setTitle(
                                index === 0
                                    ? `🏆 XP Leaderboard for ${underline(clubName)}`
                                    : "🏆 XP Leaderboard Continued"
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
