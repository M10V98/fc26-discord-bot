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
    memberWinRate,
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    infoBlock
} = require("../Utils/embedStyle");

function n(value) {
    return Number(value || 0);
}

function enrichMember(member, localStats) {
    const local =
        localStats.get(String(member.name).toLowerCase()) || {};

    return {
        ...member,
        displayName: member.name,
        winRate: memberWinRate(member),
        secondAssists: n(local.second_assists),
        dribbles: n(local.dribbles),
        interceptions: n(local.interceptions)
    };
}

function formatValue(player, key) {
    if (key === "ratingAve") {
        return `${number(player.ratingAve, 1)} average match rating`;
    }

    if (key === "goals") {
        return `${number(player.goals)} goals, ${number(player.shotSuccessRate)}% conversion rate`;
    }

    if (key === "assists") {
        return `${number(player.assists)} assists`;
    }

    if (key === "secondAssists") {
        return `${number(player.secondAssists)} second assists`;
    }

    if (key === "dribbles") {
        return `${number(player.dribbles)} dribbles`;
    }

    if (key === "passesMade") {
        return `${number(player.passesMade)} passes, ${number(player.passSuccessRate)}% success rate`;
    }

    if (key === "tacklesMade") {
        return `${number(player.tacklesMade)} tackles, ${number(player.tackleSuccessRate)}% success rate`;
    }

    if (key === "interceptions") {
        return `${number(player.interceptions)} interceptions`;
    }

    if (key === "redCards") {
        return `${number(player.redCards)} red cards`;
    }

    return number(player[key]);
}

function ranked(players, linkedMaps, key, options = {}) {
    const sorted =
        players
            .filter(player =>
                options.allowZero ||
                n(player[key]) > 0
            )
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

    if (!sorted.length) {
        return "No data";
    }

    return sorted
        .map(player =>
            `${displayName(player.name, linkedMaps)} (${formatValue(player, key)})`
        )
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
                return interaction.editReply(
                    "No club linked. Use /linkclub first."
                );
            }

            const [members, info, crestUrl, linkedRows, localRows] =
                await Promise.all([
                    eaApi.getMembersStats(club.club_id),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id),
                    db.all(
                        `
                        SELECT *
                        FROM players
                        WHERE guild_id = ?
                        `,
                        [interaction.guild.id]
                    )
                ]);

            const clubName =
                info?.[String(club.club_id)]?.name || "Club";

            const localByName =
                new Map(
                    localRows.map(row => [
                        String(row.player_name || "").toLowerCase(),
                        row
                    ])
                );

            const players =
                (members?.members || [])
                    .map(member => enrichMember(member, localByName));

            if (!players.length) {
                return interaction.editReply(
                    "No member stats found for this club."
                );
            }

            const linkedMaps =
                buildLinkedMaps(linkedRows);

            const description = [
                infoBlock([
                    "**Highest AMR**, sorted by best AMR",
                    "**Top Goalscorers**, sorted by # goals",
                    "**Top Assisters**, sorted by # assists",
                    "**Top Passes**, sorted by # successful passes made",
                    "**Top Tacklers**, sorted by # successful tackles made",
                    "**Dribbles**, **Interceptions**, and **Second Assists** are from Match-Saving history"
                ]),
                "ℹ️ Use `/matches` or `/automode` regularly to keep your **Second Assists, Dribbles, and Interceptions** updated",
                "",
                `✨ **Highest AMR**\n${ranked(players, linkedMaps, "ratingAve")}`,
                `⚽ **Top Goalscorers**\n${ranked(players, linkedMaps, "goals")}`,
                `🎯 **Top Assisters**\n${ranked(players, linkedMaps, "assists")}`,
                `🔗 **Top Second Assists**\n${ranked(players, linkedMaps, "secondAssists")}`,
                `💨 **Top Dribblers**\n${ranked(players, linkedMaps, "dribbles")}`,
                `👟 **Top Passers**\n${ranked(players, linkedMaps, "passesMade")}`,
                `🛡️ **Top Tacklers**\n${ranked(players, linkedMaps, "tacklesMade")}`,
                `🧠 **Top Interceptors**\n${ranked(players, linkedMaps, "interceptions")}`,
                `🟥 **Most Red Cards**\n${ranked(players, linkedMaps, "redCards")}`
            ].join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`Top Players for ${underline(clubName)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
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
