const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder
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
    underline
} = require("../Utils/embedStyle");

const PAGE_SIZE = 15;

function pageButtons(page, totalPages) {
    if (totalPages <= 1) return [];

    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ratings_page:${page - 1}`)
                    .setLabel("Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 0),
                new ButtonBuilder()
                    .setCustomId(`ratings_page:${page + 1}`)
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            )
    ];
}

async function buildRatingsPage(interaction, page = 0) {
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
            .sort((a, b) => b.avg - a.avg);

    if (!sorted.length) {
        return {
            content: "No rating data found yet.",
            embeds: [],
            components: []
        };
    }

    const totalPages =
        Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage =
        Math.max(0, Math.min(Number(page || 0), totalPages - 1));
    const clubName =
        club && info?.[String(club.club_id)]?.name
            ? info[String(club.club_id)].name
            : interaction.guild.name;
    const linkedMaps =
        buildLinkedMaps(linkedRows);
    const lines =
        sorted
            .slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
            .map((player, index) => {
                const rank = safePage * PAGE_SIZE + index;

                return compactRankLine(
                    rank,
                    displayName(
                        player.player_name,
                        linkedMaps,
                        player.player_id
                    ),
                    `**${player.avg.toFixed(2)}** average rating (${player.matches || 0} apps)`
                );
            });

    const embed =
        new EmbedBuilder()
            .setColor("#00b0f4")
            .setTitle(`Rating Leaderboard for ${underline(clubName)}`)
            .setDescription(lines.join("\n"))
            .setFooter({
                ...FOOTER,
                text: `${FOOTER.text} - Page ${safePage + 1}/${totalPages}`
            });

    if (crestUrl) embed.setThumbnail(crestUrl);

    return {
        content: null,
        embeds: [embed],
        components: pageButtons(safePage, totalPages)
    };
}

async function handleRatingsPageButton(interaction) {
    const page =
        Number(interaction.customId.split(":")[1] || 0);
    const payload =
        await buildRatingsPage(interaction, page);

    return interaction.update(payload);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ratings")
        .setDescription("Top average ratings"),

    async execute(interaction) {
        await interaction.deferReply();

        const payload =
            await buildRatingsPage(interaction, 0);

        await interaction.editReply(payload);
    },

    handleRatingsPageButton
};
