const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    findLinkedPlayer,
    getModeMatches,
    chemistry
} = require("../Services/playerAnalytics");
const {
    FOOTER,
    number,
    escapeMarkdown,
    getLinkedRows
} = require("../Utils/embedStyle");

async function autocomplete(interaction) {
    const focused =
        interaction.options.getFocused().toLowerCase();
    const rows =
        await getLinkedRows(db, interaction.guild.id);

    await interaction.respond(
        rows
            .filter(row =>
                row.player_name?.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(row => ({
                name: row.player_name,
                value: row.player_name
            }))
    );
}

async function resolve(interaction, prefix) {
    return findLinkedPlayer(
        interaction.guild.id,
        {
            userId:
                interaction.options.getUser(`${prefix}_user`)?.id,
            playerName:
                interaction.options.getString(`${prefix}_name`)
        }
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chemistry")
        .setDescription("Show chemistry between two players")
        .addUserOption(option =>
            option
                .setName("player1_user")
                .setDescription("First Discord user")
        )
        .addStringOption(option =>
            option
                .setName("player1_name")
                .setDescription("First claimed player name")
                .setAutocomplete(true)
        )
        .addUserOption(option =>
            option
                .setName("player2_user")
                .setDescription("Second Discord user")
        )
        .addStringOption(option =>
            option
                .setName("player2_name")
                .setDescription("Second claimed player name")
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Stat source")
                .addChoices(
                    { name: "Divisions", value: "divisions" },
                    { name: "Competitive", value: "competitive" }
                )
        ),

    autocomplete,

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

            const [first, second] =
                await Promise.all([
                    resolve(interaction, "player1"),
                    resolve(interaction, "player2")
                ]);

            if (!first || !second) {
                return interaction.editReply("Choose two claimed players.");
            }

            const mode =
                interaction.options.getString("mode") || "divisions";
            const matches =
                await getModeMatches(
                    interaction.guild.id,
                    club.club_id,
                    mode,
                    {
                        forceRefresh: true,
                        limit: 100
                    }
                );
            const summary =
                chemistry(matches, club.club_id, first, second);

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`\u{1F9EA} ${escapeMarkdown(first.player_name)} + ${escapeMarkdown(second.player_name)}`)
                    .setDescription(
                        [
                            `Mode: **${mode === "competitive" ? "Competitive friendlies" : "Divisions"}**`,
                            "",
                            `Matches played together: **${number(summary.matches)}**`,
                            `Win rate together: **${number(summary.winRate, 1)}%**`,
                            `Avg rating together: **${number(summary.avgRating, 2)}**`,
                            `Chemistry Score: **${number(summary.score)}/100**`
                        ].join("\n")
                    )
                    .setFooter(FOOTER);

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("chemistry error:", err);
            return interaction.editReply("Failed to load chemistry.");
        }
    }
};
