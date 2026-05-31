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

const archetypes =
    require("../Utils/archetypes");

const {
    formatScoreboard
} = require("../Utils/scoreboard");

function formatMatchType(value) {

    return String(value || "Match")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = {

    data: new SlashCommandBuilder()
        .setName("matches")
        .setDescription("Show recent matches"),

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
                    "❌ No club linked. Use /linkclub"
                );
            }

            const [matches, crestUrl] =
                await Promise.all([
                    eaApi.getRecentMatches(club.club_id, { limit: 5 }),
                    getCrestUrl(club.club_id)
                ]);

            if (!matches?.length) {
                return interaction.editReply(
                    "❌ No matches found."
                );
            }

            const embed =
                new EmbedBuilder()
                    .setColor("#00b0f4")
                    .setTitle("📊 Recent Matches")
                    .setDescription(
                        `Showing latest ${matches.length} matches (league + playoff + friendly)`
                    );

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            const ourId = String(club.club_id);

            for (const match of matches) {

                const clubsObj = match.clubs || {};
                const ids = Object.keys(clubsObj);

                if (ids.length < 2) continue;

                const oppId = ids.find(id => id !== ourId) || ids[1];

                const home = {
                    clubId: ourId,
                    ...clubsObj[ourId]
                };

                const away = {
                    clubId: oppId,
                    ...clubsObj[oppId]
                };

                const matchType =
                    formatMatchType(home.matchType || away.matchType);

                const date =
                    match.timestamp
                        ? new Date(Number(match.timestamp) * 1000).toLocaleString()
                        : "Unknown";

                const dnf =
                    home.winnerByDnf === "1" ||
                    away.winnerByDnf === "1"
                        ? "\n⚠️ DNF Win"
                        : "";

                const scoreboard =
                    formatScoreboard(home, away);

                const ourPlayers =
                    match.players?.[ourId] || {};

                const playerLines =
                    Object.values(ourPlayers)
                        .sort(
                            (a, b) =>
                                Number(b.rating || 0) - Number(a.rating || 0)
                        )
                        .slice(0, 11)
                        .map(p => {

                            const archetype =
                                archetypes[p.archetypeid] || "Unknown";

                            const cleanSheet =
                                p.cleansheetsdef === "1" ||
                                p.cleansheetsgk === "1";

                            const redCard =
                                p.redcards === "1";

                            const mom =
                                p.mom === "1" ? "🏅 " : "";

                            return (
                                `${mom}**${p.playername}** (${archetype})\n` +
                                `⭐ ${p.rating || "0.0"} | ⚽ ${p.goals || 0} | 🅰️ ${p.assists || 0} | 🥅 ${p.saves || 0}\n` +
                                `🎯 ${p.passesmade || 0}/${p.passattempts || 0} passes\n` +
                                `🛡️ ${p.tacklesmade || 0}/${p.tackleattempts || 0} tackles\n` +
                                `${cleanSheet ? "🥅 Clean Sheet " : ""}${redCard ? "🟥 Red Card" : ""}`.trim()
                            );
                        })
                        .join("\n\n");

                embed.addFields({
                    name: scoreboard,
                    value:
                        (
                            `📅 ${date}\n` +
                            `🎮 ${matchType}${dnf}\n\n` +
                            playerLines
                        ).slice(0, 1024)
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error("matches error:", err);

            await interaction.editReply(
                "❌ Failed to load matches."
            );
        }
    }
};
