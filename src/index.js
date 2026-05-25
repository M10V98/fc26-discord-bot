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

const discordToken =
    process.env.TOKEN ||
    process.env.DISCORD_TOKEN ||
    process.env.BOT_TOKEN;

const {
    startAutoMode,
    stopAutoMode
} = require("./Services/syncMatches");

const {
    maybeReplyToFootballChat
} = require("./Services/footballAiResponder");

const {
    startAutoStatsSync
} = require("./Services/autoStatsSync");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

console.log("ENV CHECK:");
console.log("TOKEN:", !!process.env.TOKEN);
console.log("DISCORD_TOKEN:", !!process.env.DISCORD_TOKEN);
console.log("BOT_TOKEN:", !!process.env.BOT_TOKEN);

if (!discordToken) {
    console.error(
        "Missing Discord bot token. Set TOKEN, DISCORD_TOKEN, or BOT_TOKEN in Railway Variables."
    );
    process.exit(1);
}



// =========================
// LOAD COMMANDS
// =========================

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

        if (
            "data" in command &&
            "execute" in command
        ) {

            client.commands.set(
                command.data.name,
                command
            );

            console.log(
                `✅ Loaded command: ${command.data.name}`
            );

        } else {

            console.log(
                `⚠️ Invalid command file: ${file}`
            );
        }

    } catch (err) {

        console.error(
            `❌ Failed loading ${file}`,
            err
        );
    }
}



// =========================
// CLIENT READY
// =========================

client.once(
    Events.ClientReady,
    async readyClient => {

        console.log(
            `✅ Logged in as ${readyClient.user.tag}`
        );

        await db.init();

        startAutoStatsSync();

        // =========================
        // START AUTOMODE FOR SAVED GUILDS
        // =========================

        try {

            const guilds =
                await db.all(
                    `SELECT * FROM automode`
                );

            for (const row of guilds) {

                try {

                    const guild =
                        client.guilds.cache.get(
                            row.guild_id
                        );

                    if (!guild) continue;

                    const channel =
                        guild.channels.cache.get(
                            row.channel_id
                        );

                    if (!channel) continue;

                    startAutoMode(
                        row.guild_id,
                        channel,
                        { postLatest: false }
                    );

                    console.log(
                        `🔥 Restored automode for ${guild.name}`
                    );

                } catch (err) {

                    console.error(
                        "❌ automode restore error:",
                        err
                    );
                }
            }

        } catch (err) {

            console.error(
                "❌ Failed loading automodes:",
                err
            );
        }
    }
);



// =========================
// INTERACTIONS
// =========================

client.on(
    Events.InteractionCreate,
    async interaction => {

        try {

            // =========================
            // SLASH COMMANDS
            // =========================

            if (
                interaction.isChatInputCommand()
            ) {

                const command =
                    client.commands.get(
                        interaction.commandName
                    );

                if (!command) return;

                await command.execute(
                    interaction
                );
            }

            // =========================
            // DROPDOWN CLAIM MENU
            // =========================

            if (
                interaction.isStringSelectMenu()
            ) {

                if (
                    interaction.customId !==
                    "claim_player"
                ) return;

                await interaction.deferReply({
                    ephemeral: true
                });

                const playerName =
                    interaction.values[0];

                // Prevent double claims

                const existing =
                    await db.get(
                        `
                        SELECT * FROM linked_players
                        WHERE player_name = ?
                        `,
                        [playerName]
                    );

                if (
                    existing &&
                    existing.discord_id !==
                    interaction.user.id
                ) {

                    return interaction.editReply(
                        "❌ That player is already claimed."
                    );
                }

                // Save claim

                await db.run(
                    `
                    INSERT OR REPLACE INTO linked_players
                    (discord_id, player_name)
                    VALUES (?, ?)
                    `,
                    [
                        interaction.user.id,
                        playerName
                    ]
                );

                await interaction.editReply(
                    `✅ Successfully linked to **${playerName}**`
                );

                console.log(
                    `✅ ${interaction.user.tag} claimed ${playerName}`
                );
            }

            // =========================
            // AUTOMODE STOP BUTTON
            // =========================

            if (
                interaction.isButton()
            ) {

                if (
                    !interaction.customId.startsWith(
                        "automode_stop:"
                    )
                ) return;

                const guildId =
                    interaction.customId.split(":")[1];

                if (
                    guildId !== interaction.guild.id
                ) {
                    return interaction.reply({
                        content:
                            "That AutoMode button belongs to another server.",
                        ephemeral: true
                    });
                }

                await stopAutoMode(
                    guildId
                );

                await interaction.reply({
                    content:
                        "AutoMode stopped.",
                    ephemeral: true
                });
            }

        } catch (err) {

            console.error(
                "❌ Interaction error:",
                err
            );

            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply({
                        content:
                            "❌ Something went wrong."
                    });

                } else {

                    await interaction.reply({
                        content:
                            "❌ Something went wrong.",
                        ephemeral: true
                    });
                }

            } catch (e) {

                console.error(
                    "❌ Reply fail:",
                    e
                );
            }
        }
    }
);



// =========================
// AI FOOTBALL CHAT
// =========================

client.on(
    Events.MessageCreate,
    async message => {

        await maybeReplyToFootballChat(
            message,
            client
        );
    }
);



// =========================
// LOGIN
// =========================

client.login(discordToken);
