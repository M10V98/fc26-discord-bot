const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");

const {
    getCrestUrl
} = require("../Services/crests");

function number(value, digits = 0) {
    const n = Number(value || 0);
    return digits > 0 ? n.toFixed(digits) : String(n);
}

function winRate(member) {
    const wins = Number(member.wins || 0);
    const losses = Number(member.losses || 0);
    const ties = Number(member.ties || 0);
    const games =
        Number(member.gamesPlayed || 0) ||
        wins + losses + ties;
    const supplied = Number(member.winRate || 0);

    if (supplied) return supplied.toFixed(1);
    if (!games) return "0.0";

    return ((wins / games) * 100).toFixed(1);
}

function memberLine(member) {
    return [
        `GP ${number(member.gamesPlayed)}`,
        `G ${number(member.goals)}`,
        `A ${number(member.assists)}`,
        `R ${number(member.ratingAve, 2)}`,
        `MOTM ${number(member.manOfTheMatch)}`,
        `WR ${winRate(member)}%`
    ].join(" | ");
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

            const [members, info, crestUrl] =
                await Promise.all([
                    eaApi.getMembersStats(club.club_id),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id)
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

            const embeds = [];

            for (let i = 0; i < list.length; i += 25) {
                const chunk = list.slice(i, i + 25);

                const embed =
                    new EmbedBuilder()
                        .setColor("#00b0f4")
                        .setTitle(`${clubName} - Members`)
                        .setFooter({
                            text: `${list.length} member${list.length === 1 ? "" : "s"}`
                        });

                if (crestUrl) {
                    embed.setThumbnail(crestUrl);
                }

                for (const member of chunk) {
                    embed.addFields({
                        name: member.name || "Unknown",
                        value: memberLine(member),
                        inline: false
                    });
                }

                embeds.push(embed);
            }

            await interaction.editReply({
                embeds: embeds.slice(0, 10)
            });
        } catch (err) {
            console.error("members error:", err);

            await interaction.editReply(
                "Failed to load members."
            );
        }
    }
};
