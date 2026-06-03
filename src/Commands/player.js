const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    getCrestUrl
} = require("../Services/crests");
const eaApi = require("../Services/eaApi");
const {
    findLinkedPlayer,
    getStoredPlayer,
    getModeMatches,
    summarizePlayerForm,
    aggregateFormStats,
    compareStoredPlayers
} = require("../Services/playerAnalytics");
const {
    FOOTER,
    underline,
    number,
    escapeMarkdown,
    getLinkedRows
} = require("../Utils/embedStyle");

function achievementDefinitions(player) {
    const matches = Number(player.matches || 0);
    const goals = Number(player.goals || 0);
    const assists = Number(player.assists || 0);
    const cleanSheets = Number(player.clean_sheets || 0);
    const motm = Number(player.motm || 0);
    const saves = Number(player.saves || 0);
    const tackles = Number(player.tackles || 0);
    const passes = Number(player.passes || 0);
    const rating =
        matches
            ? Number(player.total_rating || 0) / matches
            : 0;

    return [
        ["Hat Trick Hero", goals >= 3, "Score 3+ tracked goals"],
        ["Goal Machine", goals >= 25, "Score 25 tracked goals"],
        ["Centurion Striker", goals >= 100, "Score 100 tracked goals"],
        ["Playmaker", assists >= 10, "Record 10 assists"],
        ["Creative Spark", assists >= 25, "Record 25 assists"],
        ["Assist Architect", assists >= 75, "Record 75 assists"],
        ["Clean Sheet King", cleanSheets >= 10, "Record 10 clean sheets"],
        ["Wall Builder", cleanSheets >= 25, "Record 25 clean sheets"],
        ["Safe Hands", saves >= 50, "Make 50 saves"],
        ["Shot Stopper", saves >= 150, "Make 150 saves"],
        ["Tackle Titan", tackles >= 100, "Make 100 tackles"],
        ["Defensive General", tackles >= 300, "Make 300 tackles"],
        ["Pass Master", passes >= 500, "Complete 500 passes"],
        ["Tempo Setter", passes >= 1500, "Complete 1,500 passes"],
        ["Main Character", motm >= 5, "Win 5 MOTM awards"],
        ["Player of the Month Energy", motm >= 15, "Win 15 MOTM awards"],
        ["Reliable Starter", matches >= 25, "Play 25 tracked matches"],
        ["Club Regular", matches >= 50, "Play 50 tracked matches"],
        ["Dressing Room Legend", matches >= 100, "Play 100 tracked matches"],
        ["Elite Standard", rating >= 8, "Average an 8.0+ rating"],
        ["Consistent Class", rating >= 7.5 && matches >= 20, "Average 7.5+ over 20 matches"]
    ];
}

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

async function resolvePlayer(interaction, baseName) {
    const user =
        interaction.options.getUser(baseName) ||
        interaction.options.getUser(`${baseName}_user`) ||
        interaction.options.getUser("user");
    const playerName =
        interaction.options.getString(`${baseName}_name`) ||
        interaction.options.getString("player");

    return findLinkedPlayer(
        interaction.guild.id,
        {
            userId: user?.id || (!playerName ? interaction.user.id : null),
            playerName:
                playerName ||
                (!user ? null : undefined) ||
                null
        }
    );
}

function n(value) {
    return Number(value || 0);
}

function goalRatio(player) {
    const games = n(player?.gamesPlayed);
    if (!games) return "0.00";
    return (n(player.goals) / games).toFixed(2);
}

function formStatsLines(player) {
    if (!player) {
        return [
            "No recent stat profile found for this player."
        ];
    }

    return [
        `\u{1F455} Games Played: **${number(player.gamesPlayed)}**`,
        `\u{1F3C5} Man of the Match: **${number(player.manOfTheMatch)}**`,
        `\u2B50 Average Rating: **${number(player.ratingAve, 2)}**`,
        `\u{1F3C6} Win Rate: **${number(player.winRate)}%**`,
        `\u{1F3AF} Shot Conversion Rate: **${number(player.shotSuccessRate)}%**`,
        "",
        `\u26BD Goals: **${number(player.goals)}**`,
        `xG Per Game: **${goalRatio(player)}**`,
        `\u{1F91D} Assists: **${number(player.assists)}**`,
        `xA Per Game: **${n(player.gamesPlayed) ? (n(player.assists) / n(player.gamesPlayed)).toFixed(2) : "0.00"}**`,
        `\u{1F45F} Passes Made: **${number(player.passesMade)}** (${number(player.passSuccessRate)}% success)`,
        `xP Per Game: **${n(player.gamesPlayed) ? (n(player.passesMade) / n(player.gamesPlayed)).toFixed(2) : "0.00"}**`,
        `\u{1F6E1}\uFE0F Tackles Made: **${number(player.tacklesMade)}** (${number(player.tackleSuccessRate)}% success)`,
        `xT Per Game: **${n(player.gamesPlayed) ? (n(player.tacklesMade) / n(player.gamesPlayed)).toFixed(2) : "0.00"}**`,
        "",
        `\u{1F6AB} Defender Clean Sheets: **${number(player.cleanSheetsDef)}**`,
        `\u{1F945} Goalkeeper Clean Sheets: **${number(player.cleanSheetsGK)}**`,
        `\u{1F7E5} Red Cards: **${number(player.redCards)}**`
    ];
}

async function getClub(interaction) {
    return db.get(
        `SELECT * FROM clubs WHERE guild_id = ?`,
        [interaction.guild.id]
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("player")
        .setDescription("Player tools")
        .addSubcommand(subcommand =>
            subcommand
                .setName("achievements")
                .setDescription("Show player achievements")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Discord user with a claimed player")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("form")
                .setDescription("Show recent personal form")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Discord user with a claimed player")
                )
                .addStringOption(option =>
                    option
                        .setName("mode")
                        .setDescription("Stat source")
                        .addChoices(
                            { name: "Divisions", value: "divisions" },
                            { name: "Competitive", value: "competitive" }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName("matches")
                        .setDescription("Recent match window")
                        .addChoices(
                            { name: "Last 10", value: 10 },
                            { name: "Last 5", value: 5 }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("compare")
                .setDescription("Compare two claimed players")
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
        ),

    autocomplete,

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand =
                interaction.options.getSubcommand();

            if (subcommand === "achievements") {
                const linked =
                    await resolvePlayer(interaction, "player");

                if (!linked) {
                    return interaction.editReply("Use /claim first, mention a claimed user, or choose a player.");
                }

                const player =
                    await getStoredPlayer(interaction.guild.id, linked);

                if (!player) {
                    return interaction.editReply("No tracked stats found for that player yet.");
                }

                const achievements =
                    achievementDefinitions(player);
                const earned =
                    achievements.filter(([, unlocked]) => unlocked);
                const locked =
                    achievements.filter(([, unlocked]) => !unlocked);
                const earnedLines =
                    earned.length
                        ? earned.map(([name, , detail]) => `\u2705 **${name}** - ${detail}`)
                        : ["No achievements unlocked yet."];
                const lockedLines =
                    locked.slice(0, 8)
                        .map(([name, , detail]) => `\u2B1C **${name}** - ${detail}`);

                const embed =
                    new EmbedBuilder()
                        .setColor("#ffffff")
                        .setTitle(`\u{1F3C5} ${escapeMarkdown(player.player_name)} Achievements`)
                        .setDescription(
                            [
                                `Unlocked **${earned.length}/${achievements.length}** achievements.`,
                                "",
                                earnedLines.join("\n"),
                                "",
                                "**Next Up**",
                                lockedLines.join("\n") || "Everything unlocked."
                            ].join("\n").slice(0, 4096)
                        )
                        .setFooter(FOOTER);

                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === "form") {
                const club =
                    await getClub(interaction);

                if (!club) {
                    return interaction.editReply("No club linked. Use /linkclub first.");
                }

                const linked =
                    await resolvePlayer(interaction, "player");

                if (!linked) {
                    return interaction.editReply("Use /claim first, mention a claimed user, or choose a player.");
                }

                const mode =
                    interaction.options.getString("mode") || "divisions";
                const last =
                    interaction.options.getInteger("matches") || 10;
                const [matches, info, crestUrl] =
                    await Promise.all([
                        getModeMatches(
                            interaction.guild.id,
                            club.club_id,
                            mode,
                            {
                                forceRefresh: true,
                                limit: 100
                            }
                        ),
                        eaApi.getClubInfo(club.club_id),
                        getCrestUrl(club.club_id)
                    ]);
                const summary =
                    summarizePlayerForm(matches, club.club_id, linked, last);
                const clubName =
                    info?.[String(club.club_id)]?.name || "Club";
                const formStats =
                    aggregateFormStats(summary.rows);

                if (!summary.rows.length) {
                    return interaction.editReply(`No ${mode} form data found for that player.`);
                }

                const recentLines =
                    summary.rows
                        .map(row =>
                            `${row.result || "?"} - ${number(row.rating, 1)} rating, ${number(row.goals)}G/${number(row.assists)}A`
                        )
                        .join("\n");

                const embed =
                    new EmbedBuilder()
                        .setColor("#ffffff")
                        .setTitle(`\u{1F4C8} ${escapeMarkdown(linked.player_name)} Form for ${underline(clubName)}`)
                        .setDescription(
                            [
                                `Mode: **${mode === "competitive" ? "Competitive friendlies" : "Divisions"}**`,
                                `Window: **Last ${summary.rows.length} matches**`,
                                "",
                                `Rating trend: **${summary.trend} ${number(summary.avgRating, 2)} avg**`,
                                `Recent record: **${summary.wins}W ${summary.draws}D ${summary.losses}L**`,
                                `Form: **${summary.formLine}**`,
                                "",
                                recentLines,
                                "",
                                `**Stats From These ${summary.rows.length} Matches**`,
                                formStatsLines(formStats).join("\n")
                            ].join("\n").slice(0, 4096)
                        )
                        .setFooter(FOOTER);

                if (crestUrl) embed.setThumbnail(crestUrl);

                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === "compare") {
                const club =
                    await getClub(interaction);

                if (!club) {
                    return interaction.editReply("No club linked. Use /linkclub first.");
                }

                const first =
                    await resolvePlayer(interaction, "player1");
                const second =
                    await resolvePlayer(interaction, "player2");

                if (!first || !second) {
                    return interaction.editReply("Choose two claimed players to compare.");
                }

                const [playerA, playerB] =
                    await Promise.all([
                        getStoredPlayer(interaction.guild.id, first),
                        getStoredPlayer(interaction.guild.id, second)
                    ]);

                if (!playerA || !playerB) {
                    return interaction.editReply("Both players need tracked stats before they can be compared.");
                }

                const comparison =
                    compareStoredPlayers(playerA, playerB);
                const recentMatches =
                    await eaApi.getRecentMatches(
                        club.club_id,
                        {
                            forceRefresh: true,
                            limit: 100
                        }
                    );
                const formA =
                    summarizePlayerForm(recentMatches, club.club_id, first, 100);
                const formB =
                    summarizePlayerForm(recentMatches, club.club_id, second, 100);
                comparison.a.winRate =
                    formA.rows.length
                        ? (formA.wins / formA.rows.length) * 100
                        : comparison.a.winRate;
                comparison.b.winRate =
                    formB.rows.length
                        ? (formB.wins / formB.rows.length) * 100
                        : comparison.b.winRate;
                const line = (label, a, b) =>
                    `**${label}:** ${a} vs ${b}`;

                const embed =
                    new EmbedBuilder()
                        .setColor("#ffffff")
                        .setTitle(`\u2694\uFE0F ${escapeMarkdown(playerA.player_name)} vs ${escapeMarkdown(playerB.player_name)}`)
                        .setDescription(
                            [
                                line("Goals", number(comparison.a.goals), number(comparison.b.goals)),
                                line("Assists", number(comparison.a.assists), number(comparison.b.assists)),
                                line("Avg rating", number(comparison.a.avgRating, 2), number(comparison.b.avgRating, 2)),
                                line("Win rate", `${number(comparison.a.winRate, 1)}%`, `${number(comparison.b.winRate, 1)}%`),
                                line("Matches", number(comparison.a.matches), number(comparison.b.matches))
                            ].join("\n")
                        )
                        .setFooter(FOOTER);

                return interaction.editReply({ embeds: [embed] });
            }

            return interaction.editReply("Unknown player command.");
        } catch (err) {
            console.error("player command error:", err);
            return interaction.editReply("Failed to load player information.");
        }
    }
};
