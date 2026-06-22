require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    PermissionFlagsBits,
    Events
} = require("discord.js");

const db = require("./Utils/db");
const eaApi = require("./Services/eaApi");

const discordToken =
    process.env.TOKEN ||
    process.env.DISCORD_TOKEN ||
    process.env.BOT_TOKEN;

const {
    startAutoMode,
    stopAutoMode
} = require("./Services/syncMatches");

const {
    startAutoStatsSync
} = require("./Services/autoStatsSync");

const {
    handleDeleteSessionButton,
    handleEditSessionModal,
    handleLineupFormationSelect,
    handleMoreOptionsAction,
    handleMoreOptionsButton,
    handleRecommendedXiButton,
    handleSessionButton,
    startScheduleSessionCleanup
} = require("./Services/scheduleSessions");
const {
    isRealPlayerName
} = require("./Utils/embedStyle");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

console.log("ENV CHECK:");
console.log("TOKEN:", Boolean(process.env.TOKEN));
console.log("DISCORD_TOKEN:", Boolean(process.env.DISCORD_TOKEN));
console.log("BOT_TOKEN:", Boolean(process.env.BOT_TOKEN));

if (!discordToken) {
    console.error(
        "Missing Discord bot token. Set TOKEN, DISCORD_TOKEN, or BOT_TOKEN in Railway Variables."
    );
    process.exit(1);
}

const commandsPath =
    path.join(__dirname, "Commands");

const commandFiles =
    fs.readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    try {
        const filePath =
            path.join(commandsPath, file);

        const command =
            require(filePath);

        if (command.hidden) {
            console.log(`Skipped hidden command: ${command.data?.name || file}`);
            continue;
        }

        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`Invalid command file: ${file}`);
        }
    } catch (err) {
        console.error(`Failed loading ${file}`, err);
    }
}

client.once(
    Events.ClientReady,
    async readyClient => {
        console.log(`Logged in as ${readyClient.user.tag}`);

        await db.init();

        try {
            const linkedClubs =
                await db.all(
                    `SELECT club_id FROM clubs LIMIT 1`
                );

            if (linkedClubs[0]?.club_id) {
                await eaApi.getClubInfo(
                    linkedClubs[0].club_id,
                    { forceRefresh: true }
                );
                console.log("EA self-test: ok");
            } else {
                console.log("EA self-test: skipped (no linked clubs)");
            }
        } catch (err) {
            console.error("EA self-test: failed", err.message);
        }

        startAutoStatsSync();
        startScheduleSessionCleanup(readyClient);
        await client.commands
            .get("quiz")
            ?.restoreActiveQuizzes?.(readyClient);
        client.commands
            .get("quiz")
            ?.startQuizWatchdog?.(readyClient);

        try {
            const guilds =
                await db.all(
                    `SELECT * FROM automode`
                );

            for (const row of guilds) {
                try {
                    const guild =
                        client.guilds.cache.get(row.guild_id);

                    if (!guild) continue;

                    const channel =
                        guild.channels.cache.get(row.channel_id);

                    if (!channel) continue;

                    startAutoMode(
                        row.guild_id,
                        channel,
                        { postLatest: false }
                    );

                    console.log(`Restored automode for ${guild.name}`);
                } catch (err) {
                    console.error("automode restore error:", err);
                }
            }
        } catch (err) {
            console.error("Failed loading automodes:", err);
        }
    }
);
       
client.on(
    Events.InteractionCreate,
    async interaction => {
        try {
            if (interaction.isAutocomplete()) {
                const command =
                    client.commands.get(interaction.commandName);

                if (command?.autocomplete) {
                    await command.autocomplete(interaction);
                }

                return;
            }

            if (interaction.isChatInputCommand()) {
                const command =
                    client.commands.get(interaction.commandName);

                if (!command) return;

                const quizCommand =
                    client.commands.get("quiz");
                const quizSubcommand =
                    interaction.commandName === "quiz"
                        ? interaction.options.getSubcommand(false)
                        : null;
                const allowDuringQuiz =
                    interaction.commandName === "quiz" &&
                    quizSubcommand === "leaderboard";
                const activeQuiz =
                    !allowDuringQuiz &&
                    quizCommand?.hasActiveQuiz
                        ? await quizCommand.hasActiveQuiz(interaction.guild.id)
                        : false;

                if (activeQuiz) {
                    return interaction.reply({
                        content:
                            "A quiz is active right now. Other commands are locked until someone presses Stop. `/quiz leaderboard` still works.",
                        ephemeral: true
                    });
                }

                await command.execute(interaction);
                return;
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith("pb:")) {
                    const command = client.commands.get("playerbuilder");
                    await command?.handleComponent?.(interaction);
                    return;
                }

                if (interaction.customId === "unlink_club") {
                    const command =
                        client.commands.get("unlink");

                    if (command?.handleSelect) {
                        await command.handleSelect(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId ===
                    "worldcup_mynation_link"
                ) {
                    const command =
                        client.commands.get("worldcup");

                    if (command?.handleMyNationSelect) {
                        await command.handleMyNationSelect(
                            interaction
                        );
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("session_more_action:")
                ) {
                    await handleMoreOptionsAction(interaction);
                    return;
                }

                if (
                    interaction.customId.startsWith("session_lineup_formation:")
                ) {
                    await handleLineupFormationSelect(interaction);
                    return;
                }

                const isClaimMenu =
    interaction.customId === "claim_player";

const isAdminClaimMenu =
    interaction.customId.startsWith("adminclaim_player:");

if (!isClaimMenu && !isAdminClaimMenu) {
    return;
}

                await interaction.deferReply({
                    ephemeral: true
                });
let targetDiscordId =
    interaction.user.id;

if (isAdminClaimMenu) {

    if (
        !interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return interaction.editReply(
            "Only administrators can manually link players."
        );
    }

    targetDiscordId =
        interaction.customId.split(":")[1];
}
                const rawValue =
                    interaction.values[0];

                const [playerId, ...nameParts] =
                    rawValue.split("|");

                const playerName =
                    nameParts.join("|") || rawValue;

                if (!isRealPlayerName(playerName)) {
                    return interaction.editReply(
                        "EA did not provide a real player name for that entry yet. Try again after the player appears properly in-game."
                    );
                }

                const existing =
                    await db.get(
                        `
                        SELECT * FROM linked_players
                        WHERE guild_id = ?
                        AND (
                            player_name = ?
                            OR (
                                ? IS NOT NULL
                                AND player_id = ?
                            )
                        )
                        `,
                        [
                            interaction.guild.id,
                            playerName,
                            playerId || null,
                            playerId || null
                        ]
                    );

                if (
    existing &&
    existing.discord_id !== targetDiscordId &&
    !isAdminClaimMenu
) {
    return interaction.editReply(
        "That player is already claimed."
    );
}

                await db.run(
    `
    DELETE FROM linked_players
    WHERE guild_id = ?
    AND (
        discord_id = ?
        OR player_name = ?
        OR (
            ? IS NOT NULL
            AND player_id = ?
        )
    )
    `,
    [
        interaction.guild.id,
        targetDiscordId,
        playerName,
        playerId || null,
        playerId || null
    ]
);

                await db.run(
                    `
                    INSERT INTO linked_players
                    (discord_id, guild_id, player_id, player_name)
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        targetDiscordId,
                        interaction.guild.id,
                        playerId || null,
                        playerName
                    ]
                );

                await interaction.editReply(
                    `Successfully linked to **${playerName}**`
                );

                console.log(
    isAdminClaimMenu
        ? `${interaction.user.tag} manually linked ${playerName} to ${targetDiscordId}`
        : `${interaction.user.tag} claimed ${playerName}`
);

                return;
            }

            if (interaction.isButton()) {
                if (interaction.customId.startsWith("pb:")) {
                    const command = client.commands.get("playerbuilder");
                    await command?.handleComponent?.(interaction);
                    return;
                }

                if (
                    interaction.customId.startsWith("poll_vote:")
                ) {
                    const command =
                        client.commands.get("poll");

                    if (command?.handleVote) {
                        await command.handleVote(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("quiz_answer:")
                ) {
                    const command =
                        client.commands.get("quiz");

                    if (command?.handleAnswer) {
                        await command.handleAnswer(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("quiz_stop_confirm:")
                ) {
                    const command =
                        client.commands.get("quiz");

                    if (command?.handleStopConfirm) {
                        await command.handleStopConfirm(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("quiz_stop:")
                ) {
                    const command =
                        client.commands.get("quiz");

                    if (command?.handleStop) {
                        await command.handleStop(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("quiz_results:")
                ) {
                    const command =
                        client.commands.get("quiz");

                    if (command?.handleResultsPage) {
                        await command.handleResultsPage(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("members_page:")
                ) {
                    const command =
                        client.commands.get("members");

                    if (command?.handleMembersPageButton) {
                        await command.handleMembersPageButton(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("worldcup_page:")
                ) {
                    const command =
                        client.commands.get("worldcup");

                    if (command?.handleWorldCupPageButton) {
                        await command.handleWorldCupPageButton(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("mod_infractions_page:")
                ) {
                    const command =
                        client.commands.get("mod");

                    if (command?.handleInfractionsPageButton) {
                        await command.handleInfractionsPageButton(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("leaderboard_page:")
                ) {
                    const command =
                        client.commands.get("leaderboard");

                    if (command?.handleLeaderboardPageButton) {
                        await command.handleLeaderboardPageButton(interaction);
                    }

                    return;
                }

                 if (
                      interaction.customId.startsWith("resetstats_")
                ) {
                     const command =
                         client.commands.get("resetstats");

                     if (command?.handleResetButtons) {
                         await command.handleResetButtons(interaction);
                    }

                    return;
              }
                if (
                    interaction.customId.startsWith("ratings_page:")
                ) {
                    const command =
                        client.commands.get("ratings");

                    if (command?.handleRatingsPageButton) {
                        await command.handleRatingsPageButton(interaction);
                    }

                    return;
                }

                if (
                    interaction.customId.startsWith("session_rsvp:")
                ) {
                    await handleSessionButton(interaction);
                    return;
                }

                if (
                    interaction.customId.startsWith("session_more_options:")
                ) {
                    await handleMoreOptionsButton(interaction);
                    return;
                }

                if (
                    interaction.customId.startsWith("session_recommended_xi:")
                ) {
                    await handleRecommendedXiButton(interaction);
                    return;
                }

                if (
                    interaction.customId.startsWith("session_delete:")
                ) {
                    await handleDeleteSessionButton(interaction);
                    return;
                }

                if (
                    !interaction.customId.startsWith("automode_stop:")
                ) {
                    return;
                }

                const guildId =
                    interaction.customId.split(":")[1];

                if (guildId !== interaction.guild.id) {
                    return interaction.reply({
                        content:
                            "That AutoMode button belongs to another server.",
                        ephemeral: true
                    });
                }

                const automode =
                    await db.get(
                        `
                        SELECT started_by
                        FROM automode
                        WHERE guild_id = ?
                        `,
                        [guildId]
                    );
                const isStarter =
                    automode?.started_by &&
                    String(automode.started_by) === String(interaction.user.id);
                const isAdmin =
                    interaction.member.permissions.has(
                        PermissionFlagsBits.Administrator
                    );

                if (!isStarter && !isAdmin) {
                    return interaction.reply({
                        content:
                            "Only the person who started AutoMode or an administrator can stop it.",
                        ephemeral: true
                    });
                }

                await stopAutoMode(guildId);

                await interaction.reply({
                    content: "AutoMode stopped.",
                    ephemeral: true
                });

                return;
            }

            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith("pb:")) {
                    const command = client.commands.get("playerbuilder");
                    await command?.handleModal?.(interaction);
                    return;
                }

                if (interaction.customId === "schedule_guided_submit") {
                    const command = client.commands.get("schedule");
                    await command?.handleGuidedModal?.(interaction);
                    return;
                }

                if (interaction.customId === "poll_guided_submit") {
                    const command = client.commands.get("poll");
                    await command?.handleGuidedModal?.(interaction);
                    return;
                }

                if (
                    interaction.customId.startsWith("session_edit_submit:")
                ) {
                    await handleEditSessionModal(interaction);
                }
            }
        } catch (err) {
            console.error("Interaction error:", err);

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        content: "Something went wrong."
                    });
                } else {
                    await interaction.reply({
                        content: "Something went wrong.",
                        ephemeral: true
                    });
                }
            } catch (replyErr) {
                console.error("Reply fail:", replyErr);
            }
        }
    }
);

client.login(discordToken);
