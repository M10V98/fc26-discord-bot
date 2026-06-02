const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    getGuildSettings
} = require("../Services/settingsService");
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
    if (key === "avgRating") return `${number(player.avgRating, 1)} average rating`;
    if (key === "goals") return `${number(player.goals)} goals, ${number(player.shots)} shots, ${number(player.shotPercent)}% conversion rate`;
    if (key === "assists") return `${number(player.assists)} assists`;
    if (key === "passPercent") return `${number(player.passes)} passes, ${number(player.passAttempts)} attempted, ${number(player.passPercent)}% success rate`;
    if (key === "tacklePercent") return `${number(player.tackles)} tackles, ${number(player.tackleAttempts)} attempted, ${number(player.tacklePercent)}% success rate`;
    return number(player[key]);
}

function top(players, linkedMaps, key) {
    const sorted =
        players
            .filter(player => n(player[key]) > 0)
            .slice()
            .sort((a, b) => {
                const diff = n(b[key]) - n(a[key]);
                if (diff !== 0) return diff;
                return n(b.appearances) - n(a.appearances);
            })
            .slice(0, 5);

    if (!sorted.length) return "No data";

    return sorted
        .map(player =>
            `${displayName(player.name, linkedMaps, player.playerId)} (${valueFor(player, key)})`
        )
        .join("\n");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("compin-form")
        .setDescription("Show in-form competitive friendly players")
        .addIntegerOption(option =>
            option
                .setName("last")
                .setDescription("Recent competitive match window")
                .addChoices(
                    { name: "Last 5 matches", value: 5 },
                    { name: "Last 10 matches", value: 10 }
                )
        ),

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

            const limit =
                interaction.options.getInteger("last") ||
                (await getGuildSettings(interaction.guild.id)).compInFormWindow;

            const [storedMatches, info, crestUrl, linkedRows] =
                await Promise.all([
                    refreshAndGetCompetitiveMatches(
                        interaction.guild.id,
                        club.club_id,
                        { forceRefresh: true, limit }
                    ),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            const matches = storedMatches.slice(0, limit);

            if (!matches.length) {
                return interaction.editReply("No competitive friendly data stored yet.");
            }

            const players =
                aggregateCompetitivePlayers(matches, club.club_id);

            if (!players.length) {
                return interaction.editReply("No player stats found in those competitive matches.");
            }

            const clubId = String(club.club_id);
            const clubName =
                info?.[clubId]?.name || "Club";
            const linkedMaps = buildLinkedMaps(linkedRows);
            const description = [
                `These are the best performing players from your last ${matches.length} stored competitive friendly matches.`,
                "",
                infoBlock([
                    "Competitive in-form uses stored Friendly Match data only",
                    "Each run refreshes the friendly-match API before reading stored history"
                ]),
                "",
                `**Top Average Rating**\n${top(players, linkedMaps, "avgRating")}`,
                `**Top Goalscorers**\n${top(players, linkedMaps, "goals")}`,
                `**Top Assisters**\n${top(players, linkedMaps, "assists")}`,
                `**Best Passers**\n${top(players, linkedMaps, "passPercent")}`,
                `**Best Tacklers**\n${top(players, linkedMaps, "tacklePercent")}`
            ].join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`🔥 Competitive In-form Players for ${underline(clubName)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) embed.setThumbnail(crestUrl);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("compin-form error:", err);
            await interaction.editReply("Failed to load competitive in-form players.");
        }
    }
};
