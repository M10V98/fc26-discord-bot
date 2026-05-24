const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi =
    require("../Services/eaApi");

const db =
    require("../Utils/db");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription(
            "Club statistics"
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
                    "❌ No club linked."
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

            let wins = 0;
            let draws = 0;
            let losses = 0;

            let goalsFor = 0;
            let goalsAgainst = 0;

            let cleanSheets = 0;

            // =========================
            // PROCESS MATCHES
            // =========================

            matches.forEach(match => {

                const clubs =
                    match.match_data?.clubs || {};

                const teams =
                    Object.values(clubs);

                if (
                    teams.length < 2
                ) return;

                const home =
                    teams[0];

                const away =
                    teams[1];

                let ourClub;
                let opponent;

                if (
                    String(match.club_id) ===
                    String(Object.keys(clubs)[0])
                ) {

                    ourClub = home;
                    opponent = away;

                } else {

                    ourClub = away;
                    opponent = home;
                }

                const gf =
                    Number(ourClub.goals);

                const ga =
                    Number(opponent.goals);

                goalsFor += gf;
                goalsAgainst += ga;

                if (gf > ga) wins++;
                else if (gf < ga) losses++;
                else draws++;

                if (ga === 0) {
                    cleanSheets++;
                }
            });

            const total =
                wins +
                draws +
                losses;

            const winRate =
                total > 0
                    ? (
                        (wins / total) * 100
                    ).toFixed(1)
                    : "0";

            const avgGoals =
                total > 0
                    ? (
                        goalsFor / total
                    ).toFixed(2)
                    : "0";

            // =========================
            // EMBED
            // =========================

            const embed =
                new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "📊 Club Statistics"
                )

                .addFields(

                    {
                        name: "🏟️ Matches",
                        value: `${total}`,
                        inline: true
                    },

                    {
                        name: "✅ Wins",
                        value: `${wins}`,
                        inline: true
                    },

                    {
                        name: "❌ Losses",
                        value: `${losses}`,
                        inline: true
                    },

                    {
                        name: "🤝 Draws",
                        value: `${draws}`,
                        inline: true
                    },

                    {
                        name: "⚽ Goals For",
                        value: `${goalsFor}`,
                        inline: true
                    },

                    {
                        name: "🥅 Goals Against",
                        value: `${goalsAgainst}`,
                        inline: true
                    },

                    {
                        name: "🧤 Clean Sheets",
                        value: `${cleanSheets}`,
                        inline: true
                    },

                    {
                        name: "📈 Win Rate",
                        value: `${winRate}%`,
                        inline: true
                    },

                    {
                        name: "🔥 Avg Goals/Game",
                        value: `${avgGoals}`,
                        inline: true
                    }
                );

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "❌ Failed to load stats."
            );
        }
    }
};