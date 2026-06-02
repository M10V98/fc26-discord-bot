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
    handleSessionButton,
    startScheduleSessionCleanup
} = require("./Services/scheduleSessions");

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
client.once(
    Events.ClientReady,
    async readyClient => {

        console.log(
            `Logged in as ${readyClient.user.tag}`
        );

        try {

            await deployCommands();

            console.log(
                "✅ Slash commands deployed."
            );

        } catch (err) {

            console.error(
                "❌ Slash command deployment failed:",
                err
            );
        }

        await db.init();

        ...
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

                await command.execute(interaction);
                return;
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId !== "claim_player") {
                    return;
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                const rawValue =
                    interaction.values[0];

                const [playerId, ...nameParts] =
                    rawValue.split("|");

                const playerName =
                    nameParts.join("|") || rawValue;

                const existing =
                    await db.get(
                        `
                        SELECT * FROM linked_players
                        WHERE guild_id = ?
                        AND player_name = ?
                        `,
                        [
                            interaction.guild.id,
                            playerName
                        ]
                    );

                if (
                    existing &&
                    existing.discord_id !== interaction.user.id
                ) {
                    return interaction.editReply(
                        "That player is already claimed."
                    );
                }

                await db.run(
                    `
                    DELETE FROM linked_players
                    WHERE guild_id = ?
                    AND discord_id = ?
                    `,
                    [
                        interaction.guild.id,
                        interaction.user.id
                    ]
                );

                await db.run(
                    `
                    INSERT INTO linked_players
                    (discord_id, guild_id, player_id, player_name)
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        interaction.user.id,
                        interaction.guild.id,
                        playerId || null,
                        playerName
                    ]
                );

                await interaction.editReply(
                    `Successfully linked to **${playerName}**`
                );

                console.log(
                    `${interaction.user.tag} claimed ${playerName}`
                );

                return;
            }

            if (interaction.isButton()) {
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

                await stopAutoMode(guildId);

                await interaction.reply({
                    content: "AutoMode stopped.",
                    ephemeral: true
                });
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

const footballAI =
    require("./Events/messageCreate");

client.on(
    "messageCreate",
    footballAI
);
client.login(discordToken);
