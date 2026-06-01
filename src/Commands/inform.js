const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");
const {
    getGuildSettings
} = require("../Services/settingsService");

const {
    getCrestUrl
} = require("../Services/crests");

const {
    FOOTER,
    underline,
    number,
    percent,
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    infoBlock
} = require("../Utils/embedStyle");

function n(value) {
    return Number(value || 0);
}

function addPlayer(aggregate, playerId, player) {
    const current =
        aggregate.get(playerId) || {
            playerId,
            name: player.playername || playerId,
            appearances: 0,
            goals: 0,
            assists: 0,
            secondAssists: 0,
            ratingTotal: 0,
            passes: 0,
            passAttempts: 0,
            tackles: 0,
            tackleAttempts: 0,
            dribbles: 0,
            interceptions: 0,
            shots: 0
        };

    current.appearances += 1;
    current.goals += n(player.goals);
    current.assists += n(player.assists);
    current.secondAssists += n(player.secondassists);
    current.ratingTotal += n(player.rating);
    current.passes += n(player.passesmade);
    current.passAttempts += n(player.passattempts);
    current.tackles += n(player.tacklesmade);
    current.tackleAttempts += n(player.tackleattempts);
    current.dribbles += n(player.dribbles);
    current.interceptions += n(player.interceptions);
    current.shots += n(player.shots);

    aggregate.set(playerId, current);
}

function finalize(player) {
    return {
        ...player,
        avgRating:
            player.appearances > 0
                ? player.ratingTotal / player.appearances
                : 0,
        passPercent: percent(player.passes, player.passAttempts),
        tacklePercent: percent(player.tackles, player.tackleAttempts),
        conversion: percent(player.goals, player.shots)
    };
}

function valueFor(player, key) {
    if (key === "avgRating") {
        return `${number(player.avgRating, 1)} average rating`;
    }

    if (key === "goals") {
        return `${number(player.goals)} goals, ${number(player.shots)} shots, ${number(player.conversion)}% conversion rate`;
    }

    if (key === "assists") {
        return `${number(player.assists)} assists`;
    }

    if (key === "secondAssists") {
        return `${number(player.secondAssists)} second assists`;
    }

    if (key === "passes") {
        return `${number(player.passes)} passes, ${number(player.passAttempts)} attempted, ${number(player.passPercent)}% success rate`;
    }

    if (key === "dribbles") {
        return `${number(player.dribbles)} dribbles completed`;
    }

    if (key === "interceptions") {
        return `${number(player.interceptions)} interceptions`;
    }

    if (key === "tackles") {
        return `${number(player.tackles)} tackles, ${number(player.tackleAttempts)} attempted, ${number(player.tacklePercent)}% success rate`;
    }

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

    if (!sorted.length) {
        return "No data";
    }

    return sorted
        .map(player =>
            `${displayName(player.name, linkedMaps, player.playerId)} (${valueFor(player, key)})`
        )
        .join("\n");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("in-form")
        .setDescription("Show top in-form players from recent matches")
        .addIntegerOption(option =>
            option
                .setName("last")
                .setDescription("Recent match window")
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
                return interaction.editReply(
                    "No club linked. Use /linkclub first."
                );
            }

            const limit =
                interaction.options.getInteger("last") ||
                (await getGuildSettings(interaction.guild.id)).inFormWindow;

            const [matches, info, crestUrl, linkedRows] =
                await Promise.all([
                    eaApi.getRecentMatches(club.club_id, { limit }),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            if (!matches.length) {
                return interaction.editReply(
                    "No recent matches found."
                );
            }

            const clubId = String(club.club_id);
            const aggregate = new Map();

            for (const match of matches) {
                for (const [playerId, player] of Object.entries(match.players?.[clubId] || {})) {
                    addPlayer(aggregate, playerId, player);
                }
            }

            const players =
                [...aggregate.values()].map(finalize);

            if (!players.length) {
                return interaction.editReply(
                    "No player stats found in those matches."
                );
            }

            const clubName =
                info?.[clubId]?.name || "Club";

            const linkedMaps =
                buildLinkedMaps(linkedRows);

            const description = [
                `These are the best performing players from your last ${matches.length} League/Playoff matches. Friendly matches are included when EA returns reliable data.`,
                "",
                infoBlock([
                    "**Top Average Rating**, sorted by average match rating",
                    "**Top Goalscorers**, sorted by # goals",
                    "**Top Assisters**, sorted by # assists",
                    "**Top Second Assisters**, sorted by # second assists",
                    "**Top Passes**, sorted by # successful passes made",
                    "**Top Dribblers**, sorted by # dribbles completed",
                    "**Top Interceptors**, sorted by # interceptions",
                    "**Top Tacklers**, sorted by # successful tackles made"
                ]),
                "ℹ️ Use `/matches` or `/automode` regularly to keep your **Second Assists, Dribbles, and Interceptions** updated",
                "",
                `✨ **Top Average Rating**\n${top(players, linkedMaps, "avgRating")}`,
                `⚽ **Top Goalscorers**\n${top(players, linkedMaps, "goals")}`,
                `🤝 **Top Assisters**\n${top(players, linkedMaps, "assists")}`,
                `🔗 **Top Second Assisters**\n${top(players, linkedMaps, "secondAssists")}`,
                `👟 **Top Passers**\n${top(players, linkedMaps, "passes")}`,
                `💨 **Top Dribblers**\n${top(players, linkedMaps, "dribbles")}`,
                `🧠 **Top Interceptors**\n${top(players, linkedMaps, "interceptions")}`,
                `🛡️ **Top Tacklers**\n${top(players, linkedMaps, "tackles")}`
            ].join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`In-form Players for ${underline(clubName)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (err) {
            console.error("in-form error:", err);

            await interaction.editReply(
                "Failed to load in-form players."
            );
        }
    }
};
