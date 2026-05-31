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
    ["Goals", "goals"],
    ["Assists", "assists"],
    ["Avg Rating", "avgRating", 2],
    ["Passes", "passes"],
    ["Pass %", "passPercent", 1, "%"],
    ["Tackles", "tackles"],
    ["Tackle %", "tacklePercent", 1, "%"],
    ["MOTM", "motm"],
    ["Clean Sheets", "cleanSheets"],
    ["Saves", "saves"]
];

function n(value) {
    return Number(value || 0);
}

function addPlayer(aggregate, playerId, player) {
    const current =
        aggregate.get(playerId) || {
            name: player.playername || playerId,
            appearances: 0,
            goals: 0,
            assists: 0,
            ratingTotal: 0,
            passes: 0,
            passAttempts: 0,
            tackles: 0,
            tackleAttempts: 0,
            motm: 0,
            cleanSheets: 0,
            redCards: 0,
            shots: 0,
            saves: 0
        };

    current.appearances += 1;
    current.goals += n(player.goals);
    current.assists += n(player.assists);
    current.ratingTotal += n(player.rating);
    current.passes += n(player.passesmade);
    current.passAttempts += n(player.passattempts);
    current.tackles += n(player.tacklesmade);
    current.tackleAttempts += n(player.tackleattempts);
    current.motm += player.mom === "1" ? 1 : 0;
    current.cleanSheets +=
        player.cleansheetsdef === "1" || player.cleansheetsgk === "1"
            ? 1
            : 0;
    current.redCards += player.redcards === "1" ? 1 : 0;
    current.shots += n(player.shots);
    current.saves += n(player.saves);

    aggregate.set(playerId, current);
}

function finalize(player) {
    return {
        ...player,
        avgRating:
            player.appearances > 0
                ? player.ratingTotal / player.appearances
                : 0,
        passPercent:
            player.passAttempts > 0
                ? (player.passes / player.passAttempts) * 100
                : 0,
        tacklePercent:
            player.tackleAttempts > 0
                ? (player.tackles / player.tackleAttempts) * 100
                : 0
    };
}

function topFive(players, stat) {
    const [, key, digits = 0, suffix = ""] = stat;

    return players
        .slice()
        .sort((a, b) => {
            const diff = n(b[key]) - n(a[key]);
            if (diff !== 0) return diff;
            return n(b.appearances) - n(a.appearances);
        })
        .slice(0, 5)
        .map((player, index) => {
            const value =
                digits > 0
                    ? n(player[key]).toFixed(digits)
                    : n(player[key]);

            return `#${index + 1} ${player.name} - ${value}${suffix}`;
        })
        .join("\n") || "-";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("in-form")
        .setDescription("Show top in-form players from recent matches")
        .addIntegerOption(option =>
            option
                .setName("last")
                .setDescription("Recent match window")
                .setRequired(true)
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
                interaction.options.getInteger("last") || 5;

            const [matches, info, crestUrl] =
                await Promise.all([
                    eaApi.getRecentMatches(club.club_id, { limit }),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id)
                ]);

            if (!matches.length) {
                return interaction.editReply(
                    "No recent matches found."
                );
            }

            const aggregate = new Map();
            const clubId = String(club.club_id);

            for (const match of matches) {
                const players =
                    match.players?.[clubId] || {};

                for (const [playerId, player] of Object.entries(players)) {
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

            const embed =
                new EmbedBuilder()
                    .setColor("#ff7a59")
                    .setTitle(`${clubName} - In Form`)
                    .setDescription(
                        `Top performers from the latest ${matches.length} merged match${matches.length === 1 ? "" : "es"}.`
                    );

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            for (const stat of STATS) {
                embed.addFields({
                    name: stat[0],
                    value: topFive(players, stat),
                    inline: true
                });
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
