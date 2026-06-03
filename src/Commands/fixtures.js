const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const bellaApi =
    require("../Services/bellaApi");

const {
    getCrestUrl
} = require("../Services/crests");

const {
    FOOTER
} = require("../Utils/embedStyle");

const PAGE_SIZE = 5;
const BELLA_CLUB_ID = 525542;

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("fixtures")
            .setDescription(
                "View upcoming fixtures"
            ),

    async execute(interaction) {

        await interaction.deferReply();

        try {

            const fixtures =
                await bellaApi.getFixtures();

            if (!fixtures?.length) {

                return interaction.editReply(
                    "No upcoming fixtures found."
                );
            }

            const crestUrl =
                await getCrestUrl(
                    BELLA_CLUB_ID
                );

            let page = 0;

            const totalPages =
                Math.ceil(
                    fixtures.length /
                    PAGE_SIZE
                );

            const createEmbed = () => {

                const start =
                    page * PAGE_SIZE;

                const pageFixtures =
                    fixtures.slice(
                        start,
                        start + PAGE_SIZE
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor("#ffffff")
                        .setTitle(
                            "📋 Bella Ciao FC Fixtures"
                        )
                        .setThumbnail(
                            crestUrl
                        )
                        .setFooter({
                            text:
                                `${FOOTER.text} • Page ${page + 1}/${totalPages}`,
                            iconURL:
                                FOOTER.iconURL
                        });

                for (const fixture of pageFixtures) {

                    const date =
                        fixture.date
                            ? new Date(
                                fixture.date
                            ).toLocaleDateString(
                                "en-GB"
                            )
                            : "Unknown";

                    embed.addFields({
                        name:
                            `⚔️ ${fixture.match}`,
                        value:
                            `📅 Date: ${date}\n` +
                            `⏰ Time: ${fixture.time || "TBC"}\n` +
                            `🏆 Competition: ${fixture.competition || "Unknown"}\n` +
                            `🏟️ Venue: ${fixture.venue || "TBC"}`,
                        inline: false
                    });
                }

                return embed;
            };

            const createButtons =
                () =>
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    "fixtures_prev"
                                )
                                .setLabel(
                                    "Previous"
                                )
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                                .setDisabled(
                                    page === 0
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    "fixtures_next"
                                )
                                .setLabel(
                                    "Next"
                                )
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                                .setDisabled(
                                    page ===
                                    totalPages - 1
                                )
                        );

            const message =
                await interaction.editReply({
                    embeds: [
                        createEmbed()
                    ],
                    components: [
                        createButtons()
                    ]
                });

            const collector =
                message.createMessageComponentCollector({
                    time: 300000
                });

            collector.on(
                "collect",
                async i => {

                    if (
                        i.user.id !==
                        interaction.user.id
                    ) {

                        return i.reply({
                            content:
                                "Only the command user can use these buttons.",
                            ephemeral: true
                        });
                    }

                    if (
                        i.customId ===
                        "fixtures_next"
                    ) {
                        page++;
                    }

                    if (
                        i.customId ===
                        "fixtures_prev"
                    ) {
                        page--;
                    }

                    await i.update({
                        embeds: [
                            createEmbed()
                        ],
                        components: [
                            createButtons()
                        ]
                    });
                }
            );

            collector.on(
                "end",
                async () => {

                    try {

                        await interaction.editReply({
                            components: []
                        });

                    } catch {}
                }
            );

        } catch (err) {

            console.error(
                "Fixtures error:",
                err
            );

            await interaction.editReply(
                "Failed to load fixtures."
            );
        }
    }
};