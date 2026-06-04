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
    buildLinkedMaps,
    underline,
    number,
    displayName,
    escapeMarkdown,
    getLinkedRows
} = require("../Utils/embedStyle");
const {
    privateReply
} = require("../Utils/privateReply");

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

function perMatch(value, matches) {
    const apps = n(matches);
    return apps ? (n(value) / apps).toFixed(2) : "0.00";
}

function successRate(made, attempts) {
    const attemptCount = n(attempts);
    return attemptCount ? (n(made) / attemptCount) * 100 : 0;
}

function edge(left, right, options = {}) {
    const higherIsBetter =
        options.higherIsBetter !== false;

    if (n(left) === n(right)) {
        return ["", ""];
    }

    const leftWins =
        higherIsBetter
            ? n(left) > n(right)
            : n(left) < n(right);

    return leftWins
        ? [" \u{1F3C6}", ""]
        : ["", " \u{1F3C6}"];
}

function compareLine(label, left, right, options = {}) {
    const [leftEdge, rightEdge] =
        edge(
            options.rawLeft ?? left,
            options.rawRight ?? right,
            options
        );

    return `${label}: **${left}${leftEdge}** vs **${right}${rightEdge}**`;
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
                    return privateReply(interaction, "Use /claim first, mention a claimed user, or choose a player.");
                }

                const player =
                    await getStoredPlayer(interaction.guild.id, linked);

                if (!player) {
                    return privateReply(interaction, "No tracked stats found for that player yet.");
                }

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
                        .setTitle("\u{1F3C5} Player Achievements")
                        .setDescription(
                            [
                                `Player: ${display}`,
                                "",
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
                    return privateReply(interaction, "No club linked. Use /linkclub first.");
                }

                const linked =
                    await resolvePlayer(interaction, "player");

                if (!linked) {
                    return privateReply(interaction, "Use /claim first, mention a claimed user, or choose a player.");
                }

                const mode =
                    interaction.options.getString("mode") || "divisions";
                const last =
                    interaction.options.getInteger("matches") || 10;
                const [matches, info, crestUrl, linkedRows] =
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
                        getCrestUrl(club.club_id),
                        getLinkedRows(db, interaction.guild.id)
                    ]);
                const linkedMaps =
                    buildLinkedMaps(linkedRows);
                const display =
                    displayName(
                        linked.player_name,
                        linkedMaps,
                        linked.player_id
                    );
                const summary =
                    summarizePlayerForm(matches, club.club_id, linked, last);
                const clubName =
                    info?.[String(club.club_id)]?.name || "Club";
                const formStats =
                    aggregateFormStats(summary.rows);

                if (!summary.rows.length) {
                    return privateReply(interaction, `No ${mode} form data found for that player.`);
                }

                const recentLines =
                    summary.rows
                        .map(row =>
                            `${row.result || "?"} ${number(row.goalsFor)}-${number(row.goalsAgainst)} - ${number(row.rating, 1)} rating, ${number(row.goals)}G/${number(row.assists)}A`
                        )
                        .join("\n");

                const embed =
                    new EmbedBuilder()
                        .setColor("#ffffff")
                        .setTitle(`\u{1F4C8} Player Form for ${underline(clubName)}`)
                        .setDescription(
                            [
                                `Player: ${display}`,
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
                    return privateReply(interaction, "No club linked. Use /linkclub first.");
                }

                const first =
                    await resolvePlayer(interaction, "player1");
                const second =
                    await resolvePlayer(interaction, "player2");

                if (!first || !second) {
                    return privateReply(interaction, "Choose two claimed players to compare.");
                }

                const [playerA, playerB, crestUrl] =
                    await Promise.all([
                        getStoredPlayer(interaction.guild.id, first),
                        getStoredPlayer(interaction.guild.id, second),
                        getCrestUrl(club.club_id)
                    ]);

                if (!playerA || !playerB) {
                    return privateReply(interaction, "Both players need tracked stats before they can be compared.");
                }

                const comparison =
                    compareStoredPlayers(playerA, playerB);
                const linkedMaps =
                    buildLinkedMaps(
                        await getLinkedRows(db, interaction.guild.id)
                    );
                const displayA =
                    displayName(
                        playerA.player_name,
                        linkedMaps,
                        playerA.player_id
                    );
                const displayB =
                    displayName(
                        playerB.player_name,
                        linkedMaps,
                        playerB.player_id
                    );
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
                const recordA =
                    `${formA.wins}W ${formA.draws}D ${formA.losses}L`;
                const recordB =
                    `${formB.wins}W ${formB.draws}D ${formB.losses}L`;
                const passRateA =
                    successRate(
                        comparison.a.passes,
                        comparison.a.passAttempts
                    );
                const passRateB =
                    successRate(
                        comparison.b.passes,
                        comparison.b.passAttempts
                    );
                const tackleRateA =
                    successRate(
                        comparison.a.tackles,
                        comparison.a.tackleAttempts
                    );
                const tackleRateB =
                    successRate(
                        comparison.b.tackles,
                        comparison.b.tackleAttempts
                    );
                const shotRateA =
                    successRate(
                        comparison.a.goals,
                        comparison.a.shots
                    );
                const shotRateB =
                    successRate(
                        comparison.b.goals,
                        comparison.b.shots
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor("#f5c542")
                        .setTitle("\u2694\uFE0F Player Comparison")
                        .setDescription(
                            [
                                `${displayA} \u{1F19A} ${displayB}`,
                                "",
                                "\u{1F3C6} = stronger stat"
                            ].join("\n")
                        )
                        .addFields(
                            {
                                name: "\u{1F4CA} Overview",
                                value: [
                                    compareLine("\u{1F455} Matches", number(comparison.a.matches), number(comparison.b.matches)),
                                    compareLine("\u2B50 Avg rating", number(comparison.a.avgRating, 2), number(comparison.b.avgRating, 2)),
                                    compareLine("\u{1F3C6} Win rate", `${number(comparison.a.winRate, 1)}%`, `${number(comparison.b.winRate, 1)}%`),
                                    `\u{1F4CB} Recent record: **${recordA}** vs **${recordB}**`,
                                    compareLine("\u{1F9EA} Level", number(comparison.a.level), number(comparison.b.level)),
                                    compareLine("\u2728 XP", number(comparison.a.xp), number(comparison.b.xp))
                                ].join("\n")
                            },
                            {
                                name: "\u26BD Attack",
                                value: [
                                    compareLine("\u26BD Goals", number(comparison.a.goals), number(comparison.b.goals)),
                                    compareLine("\u{1F91D} Assists", number(comparison.a.assists), number(comparison.b.assists)),
                                    compareLine("\u{1F525} G/A", number(comparison.a.goalContributions), number(comparison.b.goalContributions)),
                                    compareLine("\u{1F4C8} Goals per match", perMatch(comparison.a.goals, comparison.a.matches), perMatch(comparison.b.goals, comparison.b.matches)),
                                    compareLine("\u{1F3AF} Shot conversion", `${number(shotRateA, 1)}%`, `${number(shotRateB, 1)}%`, { rawLeft: shotRateA, rawRight: shotRateB }),
                                    compareLine("\u{1F945} MOTM", number(comparison.a.motm), number(comparison.b.motm))
                                ].join("\n")
                            },
                            {
                                name: "\u{1F3AF} Passing",
                                value: [
                                    compareLine("\u{1F45F} Passes", number(comparison.a.passes), number(comparison.b.passes)),
                                    compareLine("\u2705 Pass success", `${number(passRateA, 1)}%`, `${number(passRateB, 1)}%`, { rawLeft: passRateA, rawRight: passRateB }),
                                    compareLine("\u{1F4C8} Passes per match", perMatch(comparison.a.passes, comparison.a.matches), perMatch(comparison.b.passes, comparison.b.matches)),
                                    compareLine("\u{1F9E0} Second assists", number(comparison.a.secondAssists), number(comparison.b.secondAssists))
                                ].join("\n")
                            },
                            {
                                name: "\u{1F6E1}\uFE0F Defence",
                                value: [
                                    compareLine("\u{1F6E1}\uFE0F Tackles", number(comparison.a.tackles), number(comparison.b.tackles)),
                                    compareLine("\u2705 Tackle success", `${number(tackleRateA, 1)}%`, `${number(tackleRateB, 1)}%`, { rawLeft: tackleRateA, rawRight: tackleRateB }),
                                    compareLine("\u{1F575}\uFE0F Interceptions", number(comparison.a.interceptions), number(comparison.b.interceptions)),
                                    compareLine("\u{1F9E4} Clean sheets", number(comparison.a.cleanSheets), number(comparison.b.cleanSheets)),
                                    compareLine("\u{1F94A} Saves", number(comparison.a.saves), number(comparison.b.saves)),
                                    compareLine("\u{1F7E5} Red cards", number(comparison.a.redCards), number(comparison.b.redCards), { higherIsBetter: false })
                                ].join("\n")
                            }
                        )
                        .setFooter(FOOTER);

                if (crestUrl) embed.setThumbnail(crestUrl);

                return interaction.editReply({ embeds: [embed] });
            }

            return privateReply(interaction, "Unknown player command.");
        } catch (err) {
            console.error("player command error:", err);
            return privateReply(interaction, "Failed to load player information.");
        }
    }
};
