const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const archetypes = require("../Utils/archetypes");
const {
    getLevelFromXP,
    getTotalXPForLevel
} = require("../Utils/xpSystem");

function formatPositionCounts(value) {
    let counts = {};

    try {
        counts = JSON.parse(value || "{}");
    } catch {
        counts = {};
    }

    const lines =
        Object.entries(counts)
            .filter(([, count]) => Number(count) > 0)
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .map(([position, count]) => `${position}: **${count}**`);

    return lines.length ? lines.join("\n") : "No position data tracked yet.";
}

function buildProfileEmbed(player) {
    const currentLevel =
        getLevelFromXP(player.xp || 0);
    const nextLevelXP =
        getTotalXPForLevel(currentLevel + 1);
    const avgRating =
        Number(player.matches || 0) > 0
            ? (
                Number(player.total_rating || 0) /
                Math.max(Number(player.matches || 0), 1)
            ).toFixed(2)
            : "0.00";
    const archetype =
        archetypes[player.archetype] ||
        player.archetype ||
        "Unknown";
    const position =
        player.position &&
        String(player.position).toLowerCase() !== "null"
            ? player.position
            : archetype;

    const EMOJIS = {
        POSITION: "\u{1F4CD}",
        ARCHETYPE: "\u{1F3AF}",
        LEVEL: "\u{1F3C6}",
        XP: "\u{1F4C8}",
        MATCHES: "\u26BD",
        GOALS: "\u{1F945}",
        ASSISTS: "\u{1F45F}",
        RATING: "\u2B50"
    };

    return new EmbedBuilder()
        .setColor("#ffaa00")
        .setTitle(player.player_name || "Player Profile")
        .setDescription(
            `${EMOJIS.POSITION} **Position:** ${position}\n` +
            `${EMOJIS.ARCHETYPE} **Archetype:** ${archetype}`
        )
        .addFields(
            {
                name: `${EMOJIS.LEVEL} Level`,
                value: `${currentLevel}`,
                inline: true
            },
            {
                name: `${EMOJIS.XP} XP`,
                value: `${player.xp || 0} / ${nextLevelXP}`,
                inline: true
            },
            {
                name: `${EMOJIS.MATCHES} Matches`,
                value: `${player.matches || 0}`,
                inline: true
            },
            {
                name: `${EMOJIS.GOALS} Goals`,
                value: `${player.goals || 0}`,
                inline: true
            },
            {
                name: `${EMOJIS.ASSISTS} Assists`,
                value: `${player.assists || 0}`,
                inline: true
            },
            {
                name: `${EMOJIS.RATING} Avg Rating`,
                value: `${avgRating}`,
                inline: true
            },
            {
                name: "Positions Played",
                value: formatPositionCounts(player.position_counts),
                inline: false
            }
        )
        .setFooter({
            text: `Level ${currentLevel} Player Profile`
        });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    async execute(interaction) {
        await interaction.deferReply();

        const linked =
            await db.get(
                `SELECT * FROM linked_players
                 WHERE guild_id = ?
                 AND discord_id = ?`,
                [
                    interaction.guild.id,
                    interaction.user.id
                ]
            );

        if (!linked) {
            return interaction.editReply(
                "Use /claim first."
            );
        }

        const player =
            await db.get(
                `SELECT * FROM players
                 WHERE guild_id = ?
                 AND (
                    player_id = ?
                    OR player_name = ?
                 )`,
                [
                    interaction.guild.id,
                    linked.player_id,
                    linked.player_name
                ]
            );

        return interaction.editReply({
            embeds: [
                buildProfileEmbed(
                    player || {
                        player_id: linked.player_id,
                        player_name: linked.player_name,
                        xp: 0,
                        matches: 0,
                        goals: 0,
                        assists: 0,
                        total_rating: 0,
                        position: "Unknown",
                        archetype: "Unknown",
                        position_counts: "{}"
                    }
                )
            ]
        });
    }
};
