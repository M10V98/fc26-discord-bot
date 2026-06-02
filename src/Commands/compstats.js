const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const bellaApi =
    require("../Services/bellaApi");

const db =
    require("../Utils/db");

const {
    FOOTER,
    getCrestUrl
} = require("../Utils/embedStyle");

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("compstats")
            .setDescription(
                "View Bella Ciao FC competition statistics"
            ),

    async execute(interaction) {

        await interaction.deferReply();

        try {

            const stats =
                await bellaApi.getCompStats();

            const club =
                await db.get(
                    `
                    SELECT club_id
                    FROM clubs
                    WHERE guild_id = ?
                    `,
                    [interaction.guild.id]
                );

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(
                        "📊 Competition Statistics"
                    )
                    .setThumbnail(
                        club
                            ? getCrestUrl(club.club_id)
                            : null
                    )
                    .addFields(
                        {
                            name: "🏆 Results",
                            value:
                                `Wins: **${stats.wins}**\n` +
                                `Draws: **${stats.draws}**\n` +
                                `Losses: **${stats.losses}**`,
                            inline: true
                        },
                        {
                            name: "⚽ Activity",
                            value:
                                `Matches: **${stats.total}**\n` +
                                `Players: **${stats.activeplayers}**`,
                            inline: true
                        },
                        {
                            name: "🥇 Achievements",
                            value:
                                `Win Rate: **${stats.winrate}**\n` +
                                `Trophies: **${stats.trophies}**`,
                            inline: true
                        }
                    )
                    .setFooter(FOOTER);

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "Failed to load competition statistics."
            );
        }
    }
};