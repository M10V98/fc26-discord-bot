const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db =
    require("../Utils/db");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("playerstats")
        .setDescription(
            "View your lifetime stats"
        ),

    async execute(interaction) {

        await interaction.deferReply();

        try {

            const linked =
                await db.get(
                    `
                    SELECT * FROM linked_players
                    WHERE discord_id = ?
                    `,
                    [interaction.user.id]
                );

            if (!linked) {

                return interaction.editReply(
                    "❌ Use /claim first."
                );
            }

            const player =
                await db.get(
                    `
                    SELECT * FROM players
                    WHERE player_name = ?
                    `,
                    [linked.player_name]
                );

            if (!player) {

                return interaction.editReply(
                    "❌ No stats found yet."
                );
            }

            const avgRating =
                player.matches > 0
                    ? (
                        player.total_rating /
                        player.matches
                    ).toFixed(2)
                    : "0.00";

            const passPercent =
                player.pass_attempts > 0
                    ? (
                        (player.passes /
                            player.pass_attempts) * 100
                    ).toFixed(1)
                    : "0";

            const tacklePercent =
                player.tackle_attempts > 0
                    ? (
                        (player.tackles /
                            player.tackle_attempts) * 100
                    ).toFixed(1)
                    : "0";

            const embed =
                new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    `📈 ${player.player_name}`
                )

                .addFields(

                    {
                        name: "🏟️ Matches",
                        value: `${player.matches}`,
                        inline: true
                    },

                    {
                        name: "⚽ Goals",
                        value: `${player.goals}`,
                        inline: true
                    },

                    {
                        name: "🅰️ Assists",
                        value: `${player.assists}`,
                        inline: true
                    },

                    {
                        name: "⭐ Avg Rating",
                        value: `${avgRating}`,
                        inline: true
                    },

                    {
                        name: "🎯 Passes",
                        value:
                            `${player.passes}/${player.pass_attempts}\n(${passPercent}%)`,
                        inline: true
                    },

                    {
                        name: "🛡️ Tackles",
                        value:
                            `${player.tackles}/${player.tackle_attempts}\n(${tacklePercent}%)`,
                        inline: true
                    },

                    {
                        name: "🧠 Interceptions",
                        value: `${player.interceptions}`,
                        inline: true
                    },

                    {
                        name: "🔄 Dribbles",
                        value: `${player.dribbles}`,
                        inline: true
                    },

                    {
                        name: "🥅 Clean Sheets",
                        value: `${player.clean_sheets}`,
                        inline: true
                    },

                    {
                        name: "🏅 MOTM",
                        value: `${player.motm}`,
                        inline: true
                    },

                    {
                        name: "🟥 Red Cards",
                        value: `${player.red_cards}`,
                        inline: true
                    }
                );

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(
                "❌ playerstats error:",
                err
            );

            await interaction.editReply(
                "❌ Failed to load stats."
            );
        }
    }
};