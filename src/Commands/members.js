const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");

const {
    getCrestUrl
} = require("../Services/crests");

const {
    FOOTER,
    underline,
    number,
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    infoBlock
} = require("../Utils/embedStyle");

function memberBlock(member, linkedMaps) {
    const position =
        member.favoritePosition ||
        member.proPos ||
        "Player";
    const overall =
        member.proOverall || "-";
    const height =
        member.proHeight
            ? `↕️ Height: ${member.proHeight}cm`
            : null;
    const amr =
        Math.round(Number(member.ratingAve || 0) * 10);

    return [
        `**${member.name || "Unknown"}**`,
        `👤 ${displayName(member.name, linkedMaps)}`,
        `📍 ${overall} ${position}`,
        "🔶 Creator",
        `👕 GP: ${number(member.gamesPlayed)}`,
        `⭐ AMR: ${amr}`,
        height
    ].filter(Boolean).join("\n");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("members")
        .setDescription("Show all current club members and stats"),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const club =
                await db.get(
                    `SELECT * FROM clubs WHERE guild_id = ?`,
                    [interaction.guild.id]
                );

            if (!club) {
                return interaction.editReply(
                    "No club linked. Use /linkclub first."
                );
            }

            const [members, info, crestUrl, linkedRows] =
                await Promise.all([
                    eaApi.getMembersStats(club.club_id),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            const list =
                Array.isArray(members?.members)
                    ? members.members
                    : [];

            if (!list.length) {
                return interaction.editReply(
                    "No current members found for this club."
                );
            }

            const clubName =
                info?.[String(club.club_id)]?.name || "Club";
            const notPlayed =
                list.filter(member => Number(member.gamesPlayed || 0) === 0).length;
            const linkedMaps =
                buildLinkedMaps(linkedRows);

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`Members of ${underline(clubName)}`)
                    .setDescription(
                        infoBlock([
                            `**${clubName}** has a total of ${list.length} member${list.length === 1 ? "" : "s"}, ${notPlayed} have not played a game yet.`
                        ])
                    )
                    .setFooter(FOOTER);

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            for (const member of list.slice(0, 24)) {
                embed.addFields({
                    name: "\u200b",
                    value: memberBlock(member, linkedMaps),
                    inline: true
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (err) {
            console.error("members error:", err);

            await interaction.editReply(
                "Failed to load members."
            );
        }
    }
};
