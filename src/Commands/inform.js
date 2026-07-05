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
    enrichPlayerStats
} = require("../Utils/matchEvents");
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

async function getDivisionMatches(clubId, limit) {
    const [league, playoff] =
        await Promise.all([
            eaApi.getMatches(
                clubId,
                "leagueMatch",
                {
                    forceRefresh: true,
                    maxResultCount: Math.max(limit, 10)
                }
            ).catch(() => []),
            eaApi.getMatches(
                clubId,
                "playoffMatch",
                {
                    forceRefresh: true,
                    maxResultCount: Math.max(limit, 10)
                }
            ).catch(() => [])
        ]);

    return [
        ...league,
        ...playoff
    ]
        .filter(match => match?.matchId && match.timestamp != null)
        .sort((a, b) => n(b.timestamp) - n(a.timestamp))
        .slice(0, limit);
}

function addPlayer(aggregate, playerId, rawPlayer) {
    const player =
        enrichPlayerStats(rawPlayer);
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

    current.name = player.playername || current.name;
    current.appearances += 1;
    current.goals += n(player.goals);
    current.assists += n(player.assists);
    current.secondAssists += n(player.secondassists || player.secondAssists);
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

    if (key === "passPercent") {
        return `${number(player.passes)} passes, ${number(player.passAttempts)} attempted, ${number(player.passPercent)}% success rate`;
    }

    if (key === "dribbles") {
        return `${number(player.dribbles)} dribbles completed`;
    }

    if (key === "interceptions") {
        return `${number(player.interceptions)} interceptions`;
    }

    if (key === "tacklePercent") {
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

            const settings =
                await getGuildSettings(interaction.guild.id);
            const limit =
                interaction.options.getInteger("last") ||
                settings.inFormWindow;

            const [matches, info, crestUrl, linkedRows] =
                await Promise.all([
                    getDivisionMatches(club.club_id, limit),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            if (!matches.length) {
                return interaction.editReply(
                    "No recent league or playoff matches found."
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
                `These are the best performing players from your last ${matches.length} League/Playoff matches. Friendly matches are not counted, as comp stats use the friendly match API separately.`,
                "",
                infoBlock([
                    "**Top Average Rating**, sorted by average match rating",
                    "**Top Goalscorers**, sorted by # goals",
                    "**Top Assisters**, sorted by # assists",
                    "**Top Second Assisters**, sorted by # second assists",
                    "**Best Passers**, sorted by pass success percentage",
                    "**Top Dribblers**, sorted by # dribbles completed",
                    "**Top Interceptors**, sorted by # interceptions",
                    "**Best Tacklers**, sorted by tackle success percentage"
                ]),
                "",
                infoBlock([
                    "Use `/matches` or `/automode` regularly to keep Second Assists, Dribbles, and Interceptions updated."
                ]),
                "",
                `\u2B50 **Top Average Rating**\n${top(players, linkedMaps, "avgRating")}`,
                `\u26BD **Top Goalscorers**\n${top(players, linkedMaps, "goals")}`,
                `\u{1F91D} **Top Assisters**\n${top(players, linkedMaps, "assists")}`,
                `\u{1F517} **Top Second Assisters**\n${top(players, linkedMaps, "secondAssists")}`,
                `\u{1F45F} **Best Passers**\n${top(players, linkedMaps, "passPercent")}`,
                `\u{1F4A8} **Top Dribblers**\n${top(players, linkedMaps, "dribbles")}`,
                `\u{1F9E0} **Top Interceptors**\n${top(players, linkedMaps, "interceptions")}`,
                `\u{1F6E1}\uFE0F **Best Tacklers**\n${top(players, linkedMaps, "tacklePercent")}`
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
