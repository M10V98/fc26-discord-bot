const {
    EmbedBuilder,
    SlashCommandBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");
const {
    getCrestUrl
} = require("../Services/crests");
const {
    FOOTER,
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    infoBlock,
    memberWinRate,
    number,
    underline
} = require("../Utils/embedStyle");

function n(value) {
    return Number(value || 0);
}

function enrichMember(member) {
    return {
        ...member,
        winRate: memberWinRate(member)
    };
}

function formatValue(player, key) {
    if (key === "ratingAve") return `${number(player.ratingAve, 1)} average match rating`;
    if (key === "goals") return `${number(player.goals)} goals, ${number(player.shotSuccessRate)}% conversion`;
    if (key === "assists") return `${number(player.assists)} assists`;
    if (key === "passSuccessRate") return `${number(player.passSuccessRate)}% pass success (${number(player.passesMade)} passes)`;
    if (key === "tackleSuccessRate") return `${number(player.tackleSuccessRate)}% tackle success (${number(player.tacklesMade)} tackles)`;
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
                return n(b.gamesPlayed) - n(a.gamesPlayed);
            })
            .slice(0, options.limit || 3);

    if (!sorted.length) return "No data";

    return sorted
        .map(player => `${displayName(player.name, linkedMaps)} (${formatValue(player, key)})`)
        .join("\n");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("top")
        .setDescription("Show top players per stat"),

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

            const [members, info, crestUrl, linkedRows] =
                await Promise.all([
                    eaApi.getMembersStats(club.club_id),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            const players =
                (members?.members || [])
                    .map(enrichMember);

            if (!players.length) {
                return interaction.editReply("No member stats found for this club.");
            }

            const clubName =
                info?.[String(club.club_id)]?.name || "Club";
            const linkedMaps =
                buildLinkedMaps(linkedRows);
            const description = [
                infoBlock([
                    "Uses EA member stats for this linked club.",
                    "Best passers and best tacklers are sorted by success percentage."
                ]),
                "",
                `**Highest AMR**\n${ranked(players, linkedMaps, "ratingAve")}`,
                `**Top Goalscorers**\n${ranked(players, linkedMaps, "goals")}`,
                `**Top Assisters**\n${ranked(players, linkedMaps, "assists")}`,
                `**Best Passers**\n${ranked(players, linkedMaps, "passSuccessRate")}`,
                `**Best Tacklers**\n${ranked(players, linkedMaps, "tackleSuccessRate")}`,
                `**Most Red Cards**\n${ranked(players, linkedMaps, "redCards")}`
            ].join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`Top Players for ${underline(clubName)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) embed.setThumbnail(crestUrl);

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (err) {
            console.error("top error:", err);
            await interaction.editReply("Failed to load top players.");
        }
    }
};
