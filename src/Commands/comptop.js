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
const eaApi = require("../Services/eaApi");
const {
    FOOTER,
    underline,
    number,
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    infoBlock
} = require("../Utils/embedStyle");

function n(value) {
    return Number(value || 0);
}

function valueFor(player, key) {
    if (key === "avgRating") return `${number(player.avgRating, 1)} average match rating`;
    if (key === "goals") return `${number(player.goals)} goals, ${number(player.shotPercent)}% conversion rate`;
    if (key === "assists") return `${number(player.assists)} assists`;
    if (key === "passPercent") return `${number(player.passPercent)}% pass success (${number(player.passes)} passes)`;
    if (key === "tacklePercent") return `${number(player.tacklePercent)}% tackle success (${number(player.tackles)} tackles)`;
    if (key === "redCards") return `${number(player.redCards)} red cards`;
    return number(player[key]);
}

function ranked(players, linkedMaps, key, options = {}) {
    const sorted =
        players
            .filter(player => options.allowZero || n(player[key]) > 0)
            .slice()
            .sort((a, b) => {
                const diff =
                    options.lowest
                        ? n(a[key]) - n(b[key])
                        : n(b[key]) - n(a[key]);

                if (diff !== 0) return diff;
                return n(b.appearances) - n(a.appearances);
            })
            .slice(0, options.limit || 3);

    if (!sorted.length) return "No data";

    return sorted
        .map(player =>
            `${displayName(player.name, linkedMaps, player.playerId)} (${valueFor(player, key)})`
        )
        .join("\n");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("comptop")
        .setDescription("Show competitive friendly top players per stat"),

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
                aggregateCompetitivePlayers(matches, club.club_id);

            if (!players.length) {
                return interaction.editReply("No competitive friendly data stored yet.");
            }

            const clubId = String(club.club_id);
            const clubName =
                info?.[clubId]?.name || "Club";
            const linkedMaps = buildLinkedMaps(linkedRows);

            const description = [
                infoBlock([
                    "Competitive stats use stored Friendly Match data only",
                    "Each command refreshes the friendly-match API before reading stored history"
                ]),
                "",
                `⭐ **Highest AMR**\n${ranked(players, linkedMaps, "avgRating")}`,
`⚽ **Top Goalscorers**\n${ranked(players, linkedMaps, "goals")}`,
`🎯 **Top Assisters**\n${ranked(players, linkedMaps, "assists")}`,
`🅿️ **Best Passers**\n${ranked(players, linkedMaps, "passPercent")}`,
`🛡️ **Best Tacklers**\n${ranked(players, linkedMaps, "tacklePercent")}`,
`🟥 **Most Red Cards**\n${ranked(players, linkedMaps, "redCards")}`
            ].join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`🏅 Competitive Top Players for ${underline(clubName)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) embed.setThumbnail(crestUrl);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("comptop error:", err);
            await interaction.editReply("Failed to load competitive top players.");
        }
    }
};
