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
    getLevel
} = require("../Services/levelService");
const {
    FOOTER,
    buildLinkedMaps,
    compactRankLine,
    displayName,
    getLinkedRows,
    underline
} = require("../Utils/embedStyle");

const PAGE_SIZE = 15;

function normalizedScope(scope) {
    return scope === "alltime" ? "alltime" : "season";
}

function xpColumnForScope(scope) {
    return normalizedScope(scope) === "alltime"
        ? "all_time_xp"
        : "season_xp";
}

function scopeTitle(scope) {
    return normalizedScope(scope) === "alltime"
        ? "All-Time XP Leaderboard"
        : "Current Season XP Leaderboard";
}

function pageButtons(scope, page, totalPages) {
    if (totalPages <= 1) return [];

    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`leaderboard_page:${scope}:${page - 1}`)
                    .setLabel("Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 0),
                new ButtonBuilder()
                    .setCustomId(`leaderboard_page:${scope}:${page + 1}`)
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            )
    ];
}

async function buildLeaderboardPage(interaction, scope = "season", page = 0) {
    const safeScope = normalizedScope(scope);
    const xpColumn = xpColumnForScope(safeScope);
    const club =
        await db.get(
            `SELECT * FROM clubs WHERE guild_id = ?`,
            [interaction.guild.id]
        );
    const [players, info, crestUrl, linkedRows] =
        await Promise.all([
            db.all(
                `
                SELECT player_id, player_name, xp, season_xp, all_time_xp
                FROM players
                WHERE guild_id = ?
                ORDER BY ${xpColumn} DESC
                `,
                [interaction.guild.id]
            ),
            club ? eaApi.getClubInfo(club.club_id).catch(() => null) : null,
            club ? getCrestUrl(club.club_id).catch(() => null) : null,
            getLinkedRows(db, interaction.guild.id)
        ]);

    const rankedPlayers =
        players.filter(player => Number(player[xpColumn] || 0) > 0);

    if (!rankedPlayers.length) {
        return {
            content: "No players found yet.",
            embeds: [],
            components: []
        };
    }

    const totalPages =
        Math.max(1, Math.ceil(rankedPlayers.length / PAGE_SIZE));
    const safePage =
        Math.max(0, Math.min(Number(page || 0), totalPages - 1));
    const clubName =
        club && info?.[String(club.club_id)]?.name
            ? info[String(club.club_id)].name
            : interaction.guild.name;
    const linkedMaps =
        buildLinkedMaps(linkedRows);
    const lines =
        rankedPlayers
            .slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
            .map((player, index) => {
                const rank = safePage * PAGE_SIZE + index;
                const xp = Number(player[xpColumn] || 0);
                const label =
                    displayName(
                        player.player_name,
                        linkedMaps,
                        player.player_id
                    );

                return compactRankLine(
                    rank,
                    label,
                    `**${xp} XP** | ${getLevel(player.all_time_xp || player.xp || 0).name}`
                );
            });

    const embed =
        new EmbedBuilder()
            .setColor("#f5c542")
            .setTitle(`${scopeTitle(safeScope)} for ${underline(clubName)}`)
            .setDescription(lines.join("\n"))
            .setFooter({
                ...FOOTER,
                text: `${FOOTER.text} - Page ${safePage + 1}/${totalPages}`
            });

    if (crestUrl) embed.setThumbnail(crestUrl);

    return {
        content: null,
        embeds: [embed],
        components: pageButtons(safeScope, safePage, totalPages)
    };
}

async function handleLeaderboardPageButton(interaction) {
    const [, scope, page] =
        interaction.customId.split(":");
    const payload =
        await buildLeaderboardPage(interaction, scope, Number(page || 0));

    return interaction.update(payload);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("XP leaderboard")
        .addStringOption(option =>
            option
                .setName("scope")
                .setDescription("Which XP leaderboard to show")
                .addChoices(
                    {
                        name: "Current season",
                        value: "season"
                    },
                    {
                        name: "All time",
                        value: "alltime"
                    }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const payload =
            await buildLeaderboardPage(
                interaction,
                interaction.options.getString("scope") || "season",
                0
            );

        await interaction.editReply(payload);
    },

    handleLeaderboardPageButton
};
