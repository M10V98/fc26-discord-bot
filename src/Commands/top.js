const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");

const {
    getCrestUrl
} = require("../Services/crests");

const STATS = [
    ["Games", "gamesPlayed"],
    ["Goals", "goals"],
    ["Assists", "assists"],
    ["Avg Rating", "ratingAve", 2],
    ["MOTM", "manOfTheMatch"],
    ["Win Rate", "winRate", 1, "%"],
    ["Passes", "passesMade"],
    ["Pass %", "passSuccessRate", 1, "%"],
    ["Tackles", "tacklesMade"],
    ["Tackle %", "tackleSuccessRate", 1, "%"],
    ["Shot %", "shotSuccessRate", 1, "%"],
    ["CS Def", "cleanSheetsDef"],
    ["CS GK", "cleanSheetsGK"],
    ["Fewest Reds", "redCards", 0, "", true]
];

function n(value) {
    return Number(value || 0);
}

function format(value, digits = 0, suffix = "") {
    const number = n(value);
    return `${digits > 0 ? number.toFixed(digits) : number}${suffix}`;
}

function topLines(members, stat) {
    const [, key, digits = 0, suffix = "", lowest = false] = stat;

    return members
        .slice()
        .sort((a, b) => {
            const diff =
                lowest
                    ? n(a[key]) - n(b[key])
                    : n(b[key]) - n(a[key]);

            if (diff !== 0) return diff;

            return n(b.gamesPlayed) - n(a.gamesPlayed);
        })
        .slice(0, 3)
        .map((member, index) =>
            `#${index + 1} ${member.name} - ${format(member[key], digits, suffix)}`
        )
        .join("\n") || "-";
}

function withDerivedStats(member) {
    const wins = n(member.wins);
    const losses = n(member.losses);
    const ties = n(member.ties);
    const games = n(member.gamesPlayed) || wins + losses + ties;
    const suppliedWinRate = n(member.winRate);

    return {
        ...member,
        winRate:
            suppliedWinRate ||
            (games > 0 ? (wins / games) * 100 : 0)
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("top")
        .setDescription("Show top 3 players per stat"),

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
                    ? members.members.map(withDerivedStats)
                    : [];

            if (!list.length) {
                return interaction.editReply(
                    "No member stats found for this club."
                );
            }

            const clubName =
                info?.[String(club.club_id)]?.name || "Club";

            const embed =
                new EmbedBuilder()
                    .setColor("#f4c542")
                    .setTitle(`${clubName} - Top Players`);

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            for (const stat of STATS) {
                embed.addFields({
                    name: stat[0],
                    value: topLines(list, stat),
                    inline: true
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (err) {
            console.error("top error:", err);

            await interaction.editReply(
                "Failed to load top players."
            );
        }
    }
};
