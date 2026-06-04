const {
    EmbedBuilder,
    SlashCommandBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    XP_WEIGHTS,
    calculateXPBreakdown
} = require("../Utils/xpSystem");
const {
    FOOTER,
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    number
} = require("../Utils/embedStyle");
const {
    privateReply
} = require("../Utils/privateReply");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("xptracking")
        .setDescription("Show where your tracked XP has come from"),

    async execute(interaction) {
        await interaction.deferReply();

        const linked =
            await db.get(
                `
                SELECT *
                FROM linked_players
                WHERE guild_id = ?
                AND discord_id = ?
                `,
                [
                    interaction.guild.id,
                    interaction.user.id
                ]
            );

        if (!linked) {
            return privateReply(interaction, "Use /claim first.");
        }

        const player =
            await db.get(
                `
                SELECT *
                FROM players
                WHERE guild_id = ?
                AND (
                    player_id = ?
                    OR player_name = ?
                )
                `,
                [
                    interaction.guild.id,
                    linked.player_id,
                    linked.player_name
                ]
            );

        if (!player) {
            return privateReply(
                interaction,
                "No tracked XP found yet. XP is added when live matches are picked up by auto sync or match commands."
            );
        }

        const breakdown =
            calculateXPBreakdown(player);
        const linkedMaps =
            buildLinkedMaps(
                await getLinkedRows(db, interaction.guild.id)
            );
        const display =
            displayName(
                player.player_name,
                linkedMaps,
                player.player_id
            );
        const embed =
            new EmbedBuilder()
                .setColor("#f5c542")
                .setTitle("XP Tracking")
                .setDescription(
                    [
                        `Player: ${display}`,
                        `Total tracked XP: **${number(player.xp)}**`,
                        `Breakdown total from current weights: **${number(breakdown.total)}**`,
                        "",
                        "XP is awarded only from live match data the bot has processed and stored over time."
                    ].join("\n")
                )
                .addFields(
                    {
                        name: "Appearances",
                        value: `${number(player.matches)} x ${XP_WEIGHTS.appearance} = **${number(breakdown.appearances)}**`,
                        inline: true
                    },
                    {
                        name: "Goals",
                        value: `${number(player.goals)} x ${XP_WEIGHTS.goal} = **${number(breakdown.goals)}**`,
                        inline: true
                    },
                    {
                        name: "Assists",
                        value: `${number(player.assists)} x ${XP_WEIGHTS.assist} = **${number(breakdown.assists)}**`,
                        inline: true
                    },
                    {
                        name: "Passes",
                        value: `${number(player.passes)} x ${XP_WEIGHTS.pass} = **${number(breakdown.passes)}**`,
                        inline: true
                    },
                    {
                        name: "Tackles",
                        value: `${number(player.tackles)} x ${XP_WEIGHTS.tackle} = **${number(breakdown.tackles)}**`,
                        inline: true
                    },
                    {
                        name: "Saves",
                        value: `${number(player.saves)} x ${XP_WEIGHTS.save} = **${number(breakdown.saves)}**`,
                        inline: true
                    },
                    {
                        name: "Clean Sheets",
                        value: `${number(player.clean_sheets)} x ${XP_WEIGHTS.cleanSheet} = **${number(breakdown.cleanSheets)}**`,
                        inline: true
                    },
                    {
                        name: "MOTM",
                        value: `${number(player.motm)} x ${XP_WEIGHTS.motm} = **${number(breakdown.motm)}**`,
                        inline: true
                    },
                    {
                        name: "Red Cards",
                        value: `${number(player.red_cards)} x ${XP_WEIGHTS.redCards} = **${number(breakdown.redCards)}**`,
                        inline: true
                    }
                )
                .setFooter(FOOTER);

        await interaction.editReply({
            embeds: [embed]
        });
    }
};
