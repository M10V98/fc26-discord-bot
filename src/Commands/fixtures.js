const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const bellaApi =
    require("../Services/bellaApi");

const db =
    require("../Utils/db");

const {
    FOOTER,
    getCrestUrl
} = require("../Utils/embedStyle");

const PAGE_SIZE = 5;

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

            if (!fixtures.length) {

                return interaction.editReply(
                    "No upcoming fixtures found."
                );
            }

            const club =
                await db.get(
                    `
                    SELECT club_id
                    FROM clubs
                    WHERE guild_id = ?
                    `,
                    [interaction.guild.id]
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
                            "📋 Upcoming Fixtures"
                        )
                        .setThumbnail(
                            club
                                ? getCrestUrl(
                                    club.club_id
                                )
                                : null
                        )
                        .setFooter({
                            text:
                                `${FOOTER.text} • Page ${page + 1}/${totalPages}`,
                            iconURL:
                                FOOTER.iconURL
                        });

                for (const fixture of pageFixtures) {

                    const date =
                        new Date(
                            fixture.date
                        )
                            .toLocaleDateString(
                                "en-GB"
                            );

                    embed.addFields({
                        name:
                            `⚔️ ${fixture.match}`,
                        value:
                            `📅 ${date}\n` +
                            `⏰ ${fixture.time}\n` +
                            `🏆 ${fixture.competition}\n` +
                            `🏟️ ${fixture.venue}`,
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
                                    "prev"
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
                                    "next"
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

            const msg =
                await interaction.editReply({
                    embeds: [
                        createEmbed()
                    ],
                    components: [
                        createButtons()
                    ]
                });

            const collector =
                msg.createMessageComponentCollector({
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
                        "next"
                    ) {
                        page++;
                    }

                    if (
                        i.customId ===
                        "prev"
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

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "Failed to load fixtures."
            );
        }
    }
};