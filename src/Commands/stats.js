const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi =
    require("../Services/eaApi");

const {
    getCrestUrl
} = require("../Services/crests");

const db =
    require("../Utils/db");

// EA encodes "lastMatch0..9" with: 1 = Win, 2 = Loss, 3 = Tie, -1 = none.
const RESULT_LETTER = {
    "1": "W",
    "2": "L",
    "3": "D"
};

function formatRecentForm(stats) {

    const letters = [];

    for (let i = 0; i < 10; i++) {

        const code = String(stats[`lastMatch${i}`]);

        if (code === "-1" || code === "undefined") {
            continue;
        }

        letters.push(RESULT_LETTER[code] || "?");
    }

    return letters.join(" ") || "-";
}

module.exports = {

    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Club statistics"),

    async execute(interaction) {

        await interaction.deferReply();

        try {

            const club =
                await db.get(
                    `
                    SELECT * FROM clubs
                    WHERE guild_id = ?
                    `,
                    [interaction.guild.id]
                );

            if (!club) {
                return interaction.editReply(
                    "❌ No club linked. Use /linkclub"
                );
            }

            const [overallArr, info, crestUrl] =
                await Promise.all([
                    eaApi.getOverallStats(club.club_id),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id)
                ]);

            const stats =
                Array.isArray(overallArr) && overallArr[0]
                    ? overallArr[0]
                    : null;

            if (!stats) {
                return interaction.editReply(
                    "❌ No stats available."
                );
            }

            const clubName =
                info?.[String(club.club_id)]?.name ||
                "Club";

            const wins   = Number(stats.wins        || 0);
            const losses = Number(stats.losses      || 0);
            const ties   = Number(stats.ties        || 0);
            const total  = Number(stats.gamesPlayed || (wins + losses + ties));
            const gf     = Number(stats.goals        || 0);
            const ga     = Number(stats.goalsAgainst || 0);

            const winRate =
                total > 0
                    ? ((wins / total) * 100).toFixed(1)
                    : "0.0";

            const avgGoals =
                total > 0
                    ? (gf / total).toFixed(2)
                    : "0.00";

            const goalDiff = gf - ga;

            const embed =
                new EmbedBuilder()
                    .setColor("#00ff99")
                    .setTitle(`📊 ${clubName} — Club Statistics`)
                    .addFields(
                        { name: "🏟️ Games",         value: `${total}`,                           inline: true },
                        { name: "✅ Wins",           value: `${wins}`,                            inline: true },
                        { name: "❌ Losses",         value: `${losses}`,                          inline: true },
                        { name: "🤝 Draws",          value: `${ties}`,                            inline: true },
                        { name: "⚽ Goals For",      value: `${gf}`,                              inline: true },
                        { name: "🥅 Goals Against",  value: `${ga}`,                              inline: true },
                        { name: "📊 Goal Diff",      value: `${goalDiff >= 0 ? "+" : ""}${goalDiff}`, inline: true },
                        { name: "📈 Win Rate",       value: `${winRate}%`,                        inline: true },
                        { name: "🔥 Avg Goals/Game", value: `${avgGoals}`,                        inline: true },
                        { name: "🏆 Skill Rating",   value: `${stats.skillRating || "-"}`,        inline: true },
                        { name: "🔥 Win Streak",     value: `${stats.wstreak || 0}`,              inline: true },
                        { name: "🛡️ Unbeaten",       value: `${stats.unbeatenstreak || 0}`,       inline: true },
                        { name: "📅 Recent Form",    value: formatRecentForm(stats),              inline: false }
                    );

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error("stats error:", err);

            await interaction.editReply(
                "❌ Failed to load stats."
            );
        }
    }
};
