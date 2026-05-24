const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi =
    require("../Services/eaApi");

const db =
    require("../Utils/db");

const archetypes =
    require("../Utils/archetypes");

const {
    formatScoreboard
} = require("../Utils/scoreboard");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("matches")
        .setDescription(
            "Show recent matches"
        ),

    async execute(interaction) {

        await interaction.deferReply();

        try {

            // =========================
            // GET CLUB
            // =========================

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

            // =========================
            // FETCH MATCHES
            // =========================

            const matches =
                await eaApi.getMatches(
                    club.club_id
                );

            if (
                !matches ||
                matches.length === 0
            ) {

                return interaction.editReply(
                    "❌ No matches found."
                );
            }

            // =========================
            // EMBED
            // =========================

            const embed =
                new EmbedBuilder()
                .setColor("#00b0f4")
                .setTitle(
                    "📊 Recent Matches"
                )
                .setDescription(
                    `Showing latest ${Math.min(matches.length, 5)} matches`
                );

            // =========================
            // BUILD MATCH BLOCKS
            // =========================

            matches
                .slice(0, 5)
                .forEach(match => {

                    const clubs =
                        match.match_data?.clubs || {};

                    const teams =
                        Object.entries(clubs);

                    if (
                        teams.length < 2
                    ) return;

                    const home =
                        {
                            clubId: teams[0][0],
                            ...teams[0][1]
                        };

                    const away =
                        {
                            clubId: teams[1][0],
                            ...teams[1][1]
                        };

                    const matchType =
                        match.match_type ||
                        "Unknown";

                    const date =
                        new Date(
                            match.match_date * 1000
                        )
                        .toLocaleString();

                    const dnf =
                        home.winnerByDnf === "1" ||
                        away.winnerByDnf === "1"
                            ? "\n⚠️ DNF Win"
                            : "";

                    const scoreboard =
                        formatScoreboard(home, away);

                    // =========================
                    // PLAYER LINES
                    // =========================

                    const playerLines =
                        Object.entries(
                            match.player_data || {}
                        )
                        .map(([name, player]) => {

                            const archetype =
                                archetypes[
                                    player.archetypeid
                                ] || "Unknown";

                            const rating =
                                player.rating || "0.0";

                            const goals =
                                player.goals || 0;

                            const assists =
                                player.assists || 0;

                            const passes =
                                player.passesmade || 0;

                            const attempts =
                                player.passattempts || 0;

                            const tackles =
                                player.tacklesmade || 0;

                            const interceptions =
                                player.interceptions || 0;

                            const dribbles =
                                player.dribbles || 0;

                            const saves =
                                player.saves || 0;

                            const shots =
                                player.shots || 0;

                            const cleanSheet =
                                player.cleansheetsdef === "1" ||
                                player.cleansheetsgk === "1";

                            const redCard =
                                player.redcards === "1";

                            const mom =
                                player.mom === "1"
                                    ? "🏅 "
                                    : "";

                            return (
                                `${mom}**${name}** (${archetype})\n` +
                                `⭐ ${rating} | ⚽ ${goals} | 🅰️ ${assists} | 🥅 ${saves}\n` +
                                `🎯 ${passes}/${attempts} passes\n` +
                                `🛡️ ${tackles} tackles | 🧠 ${interceptions} interceptions\n` +
                                `🔄 ${dribbles} dribbles | 🎯 ${shots} shots\n` +
                                `${cleanSheet ? "🥅 Clean Sheet" : ""} ${redCard ? "🟥 Red Card" : ""}`
                            );

                        })
                        .join("\n\n");

                    // =========================
                    // ADD MATCH FIELD
                    // =========================

                    embed.addFields({
                        name:
                            scoreboard,

                        value:
                            `📅 ${date}\n` +
                            `🎮 ${matchType}${dnf}\n\n` +
                            playerLines
                    });
                });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(
                "❌ matches error:",
                err
            );

            await interaction.editReply(
                "❌ Failed to load matches."
            );
        }
    }
};
