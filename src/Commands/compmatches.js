const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    refreshAndGetCompetitiveMatches
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
    resultDot,
    timeAgo
} = require("../Utils/embedStyle");

function clubName(club) {
    return club?.details?.name || "Unknown";
}

function bestPlayer(match, clubId, linkedMaps) {
    const players = Object.entries(match.players?.[clubId] || {});

    if (!players.length) return null;

    const motm =
        players.find(([, player]) => player.mom === "1");

    const [playerId, player] =
        motm ||
        players
            .slice()
            .sort(([, a], [, b]) =>
                Number(b.rating || 0) - Number(a.rating || 0)
            )[0];

    return {
        name: displayName(player.playername, linkedMaps, playerId),
        rating: player.rating || "0.0"
    };
}

function lineForMatch(match, clubId, linkedMaps) {
    const clubs = match.clubs || {};
    const our = clubs[clubId];
    const opponentId =
        Object.keys(clubs).find(id => id !== clubId);
    const opponent = clubs[opponentId];

    if (!our || !opponent) return null;

    const best = bestPlayer(match, clubId, linkedMaps);
    const stadium =
        our.details?.stadName ||
        opponent.details?.stadName ||
        "the stadium";

    return [
        `${resultDot(our.goals, opponent.goals)} **${clubName(opponent)} (${number(opponent.goals)}) vs. (${number(our.goals)}) ${clubName(our)}**`,
        `Friendly match, played ${timeAgo(match.timestamp)}, at ${stadium}`,
        best
            ? `**${best.name}** got Man of the Match, and finished with a **${best.rating} match rating**`
            : "No player ratings found."
    ].join("\n");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("compmatches")
        .setDescription("Show stored competitive friendly matches"),

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
                        { forceRefresh: true, limit: 10 }
                    ),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            if (!matches.length) {
                return interaction.editReply("No competitive friendly data stored yet.");
            }

            const clubId = String(club.club_id);
            const linkedMaps = buildLinkedMaps(linkedRows);
            const clubNameValue =
                info?.[clubId]?.name || "Club";
            const description =
                matches
                    .slice(0, 10)
                    .map(match => lineForMatch(match, clubId, linkedMaps))
                    .filter(Boolean)
                    .join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`Competitive Matches for ${underline(clubNameValue)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) embed.setThumbnail(crestUrl);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("compmatches error:", err);
            await interaction.editReply("Failed to load competitive matches.");
        }
    }
};
