require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events
} = require("discord.js");

const db = require("./Utils/db");
const { startFc27Season } = require("./Services/fc27Cutover");
const { canUseAdminCommands } = require("./Utils/permissions");
const eaApi = require("./Services/eaApi");
const { startSpotifyCallbackServer } = require("./Services/spotify");
const {
    repairStoredClubIds
} = require("./Services/clubLinks");

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
    notifyMemberOfActiveSessions,
    removeMemberFromScheduledSessions,
    startScheduleSessionCleanup
} = require("./Services/scheduleSessions");
const {
    isRealPlayerName
} = require("./Utils/embedStyle");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
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
        .filter(file =>
            file.endsWith(".js") &&
            file !== "worldcup.js" &&
            file !== "legacy.js"
        );

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
        startSpotifyCallbackServer();
        await startFc27Season();
        await repairStoredClubIds();

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
    Events.GuildMemberRemove,
    async member => {
        try {
            const updatedCount =
                await removeMemberFromScheduledSessions(member);

            if (updatedCount) {
                console.log(
                    `Removed departed member ${member.id} from ${updatedCount} scheduled session(s) in ${member.guild.name}.`
                );
            }
        } catch (err) {
            console.error(
                `Failed to remove departed member ${member.id} from scheduled sessions:`,
                err
            );
        }
    }
);

client.on(Events.GuildMemberAdd, async member => {
    try {
        const sent = await notifyMemberOfActiveSessions(member);
        if (sent) console.log(`Sent ${sent} active-event reminder(s) to new member ${member.id}.`);
    } catch (err) {
        console.error("Failed to notify new member about active sessions:", err);
    }
});

client.on(Events.GuildMemberUpdate, async (previous, member) => {
    try {
        const hadTrialRole = previous.roles.cache.some(role => /trial/i.test(role.name));
        const hasTrialRole = member.roles.cache.some(role => /trial/i.test(role.name));
        if (!hadTrialRole && hasTrialRole) {
            await notifyMemberOfActiveSessions(member);
        }
    } catch (err) {
        console.error("Failed to notify Trialist about active sessions:", err);
    }
});

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
                if (interaction.customId === "music_playlist_select") {
                    const command = client.commands.get("music");
                    await command?.handlePlaylistSelect?.(interaction);
                    return;
                }

                // --- NEW TRACK STREAMING INTERCEPTOR HOOK INJECTED HERE ---
                if (interaction.customId === "music_track_menu_selection") {
                    await interaction.deferReply({ ephemeral: true });
                    
                    try {
                        const musicCommand = require("./Commands/music"); 
                        // Passes the array element ['Track Name Artist Name'] down to our audio player
                        await musicCommand.replyWithSearch(interaction, interaction.values[0]);
                    } catch (err) {
                        console.error("Playback execution failure:", err);
                        await interaction.editReply("❌ Could not connect to audio streaming engine.");
                    }
                    return;
                }
                // ----------------------------------------------------------

                if (interaction.customId.startsWith("pb:")) {
                    const command = client.commands.get("playerbuilds");
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
                    interaction.customId.startsWith("session_more_action:")
                ) {