const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const bellaApi =
    require("../Services/bellaApi");

const {
    getCrestUrl
} = require("../Services/crests");

const {
    FOOTER
} = require("../Utils/embedStyle");

const BELLA_CLUB_ID = 525542;

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

            const crestUrl =
                await getCrestUrl(
                    BELLA_CLUB_ID
                );

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(
                        "📊 Bella Ciao FC Competition Statistics"
                    )
                    .setThumbnail(
                        crestUrl
                    )
                    .addFields(
                        {
                            name: "🏆 Results",
                            value:
                                `✅ Wins: **${stats.wins ?? 0}**\n` +
                                `🤝 Draws: **${stats.draws ?? 0}**\n` +
                                `❌ Losses: **${stats.losses ?? 0}**`,
                            inline: true
                        },
                        {
                            name: "⚽ Activity",
                            value:
                                `🎮 Matches: **${stats.total ?? 0}**\n` +
                                `👥 Players: **${stats.activeplayers ?? 0}**`,
                            inline: true
                        },
                        {
                            name: "🥇 Achievements",
                            value:
                                `📈 Win Rate: **${stats.winrate ?? "0%"}**\n` +
                                `🏅 Trophies: **${stats.trophies ?? 0}**`,
                            inline: true
                        }
                    )
                    .setFooter({
                        text: FOOTER.text,
                        iconURL: FOOTER.iconURL
                    });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(
                "CompStats error:",
                err
            );

            await interaction.editReply(
                "Failed to load competition statistics."
            );
        }
    }
};