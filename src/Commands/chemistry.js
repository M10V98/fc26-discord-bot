const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    getCrestUrl
} = require("../Services/crests");
const {
    findLinkedPlayer,
    getModeMatchesForClubs,
    chemistry
} = require("../Services/playerAnalytics");
const {
    getLinkedClubs
} = require("../Services/clubLinks");
const {
    FOOTER,
    buildLinkedMaps,
    displayName,
    number,
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
                interaction.options.getUser(prefix)?.id
        }
    );
}

function chemistryTier(score) {
    const value = Number(score || 0);

    if (value >= 90) return "\u{1F525} Elite link";
    if (value >= 75) return "\u{1F4AA} Strong link";
    if (value >= 60) return "\u2705 Reliable link";
    if (value >= 40) return "\u{1F9EA} Developing link";
    return "\u{1F527} Needs minutes";
}

function perMatch(value, matches) {
    const apps = Number(matches || 0);
    return apps ? (Number(value || 0) / apps).toFixed(2) : "0.00";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chemistry")
        .setDescription("Show chemistry between two players")
        .addUserOption(option =>
            option
                .setName("player1")
                .setDescription("First Discord user")
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName("player2")
                .setDescription("Second Discord user")
                .setRequired(true)
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
            const clubs =
                await getLinkedClubs(interaction.guild.id);

            if (!clubs.length) {
                return interaction.editReply("No club linked. Use /linkclub first.");
            }

            const defaultClub =
                clubs.find(club => Number(club.is_default)) ||
                clubs[0];

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
            const [matches, linkedRows, crestUrl] =
                await Promise.all([
                    getModeMatchesForClubs(
                        interaction.guild.id,
                        clubs,
                        mode,
                        {
                            forceRefresh: true,
                            limit: 100
                        }
                    ),
                    getLinkedRows(db, interaction.guild.id),
                    getCrestUrl(defaultClub.club_id).catch(() => null)
                ]);
            const linkedMaps =
                buildLinkedMaps(linkedRows);
            const displayFirst =
                displayName(
                    first.player_name,
                    linkedMaps,
                    first.player_id
                );
            const displaySecond =
                displayName(
                    second.player_name,
                    linkedMaps,
                    second.player_id
                );
            const summary =
                chemistry(matches, defaultClub.club_id, first, second);
            const modeLabel =
                mode === "competitive"
                    ? "Competitive friendlies"
                    : "Divisions";
            const clubScope =
                clubs.length === 1
                    ? clubs[0].club_name || clubs[0].club_id
                    : `${clubs.length} linked clubs`;

            const embed =
                new EmbedBuilder()
                    .setColor("#41f5b3")
                    .setTitle("\u{1F9EA} Player Chemistry")
                    .setDescription(
                        [
                            `${displayFirst} \u{1F91D} ${displaySecond}`,
                            "",
                            `Mode: **${modeLabel}**`,
                            `Clubs: **${clubScope}**`,
                            `Chemistry Score: **${number(summary.score)}/100** - ${chemistryTier(summary.score)}`
                        ].join("\n")
                    )
                    .setFooter(FOOTER);

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            embed.addFields(
                {
                    name: "\u{1F4CA} Together",
                    value: [
                        `\u{1F455} Matches together: **${number(summary.matches)}**`,
                        `\u{1F3C6} Record together: **${summary.wins}W ${summary.draws}D ${summary.losses}L**`,
                        `\u{1F4C8} Win rate: **${number(summary.winRate, 1)}%**`,
                        `\u2B50 Avg pair rating: **${number(summary.avgRating, 2)}**`,
                        `\u{1F525} Best pair rating: **${number(summary.bestCombinedRating, 2)}**`,
                        `\u{1F4CB} Recent pair form: **${summary.formLine}**`
                    ].join("\n")
                },
                {
                    name: "\u26BD Pair Output",
                    value: [
                        `\u26BD Combined goals: **${number(summary.goals)}**`,
                        `\u{1F91D} Combined assists: **${number(summary.assists)}**`,
                        `\u{1F517} Combined second assists: **${number(summary.secondAssists)}**`,
                        `\u{1F525} Combined G/A: **${number(summary.goalContrib)}**`,
                        `\u2728 Creative output: **${number(summary.creativeContrib)}**`,
                        `\u{1F4C8} G/A per match: **${perMatch(summary.goalContrib, summary.matches)}**`,
                        `\u{1F945} MOTM between them: **${number(summary.motm)}**`
                    ].join("\n")
                },
                {
                    name: "\u{1F3DF}\uFE0F Team Impact When Both Play",
                    value: [
                        `\u{1F7E2} Team goals: **${number(summary.goalsFor)}** (${number(summary.goalsForPerMatch, 2)} per match)`,
                        `\u{1F534} Goals conceded: **${number(summary.goalsAgainst)}** (${number(summary.goalsAgainstPerMatch, 2)} per match)`,
                        `\u{1F4A8} Pair dribbles: **${number(summary.dribbles)}**`,
                        `\u{1F9E0} Pair interceptions: **${number(summary.interceptions)}**`,
                        `\u{1F9E4} Clean sheets together: **${number(summary.cleanSheets)}**`,
                        `\u2705 Clean sheet rate: **${number(summary.cleanSheetRate, 1)}%**`
                    ].join("\n")
                }
            );

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("chemistry error:", err);
            return interaction.editReply("Failed to load chemistry.");
        }
    }
};
