const fs = require("fs");
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

const { REST, Routes } = require("discord.js");

async function deployCommands() {
    const token =
        process.env.TOKEN ||
        process.env.DISCORD_TOKEN ||
        process.env.BOT_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;
    const deployScope =
        String(process.env.DEPLOY_SCOPE || "global").toLowerCase();

    console.log("ENV CHECK:");
    console.log("TOKEN:", !!token);
    console.log("DISCORD_TOKEN:", !!process.env.DISCORD_TOKEN);
    console.log("BOT_TOKEN:", !!process.env.BOT_TOKEN);
    console.log("CLIENT_ID:", !!clientId);
    console.log("GUILD_ID:", !!guildId);
    console.log("DEPLOY_SCOPE:", deployScope);

    if (!token || !clientId) {
        throw new Error(
            "Missing TOKEN/DISCORD_TOKEN/BOT_TOKEN or CLIENT_ID in .env"
        );
    }

    const commands = [];
    const commandsPath = path.join(__dirname, "../Commands");
    const commandFiles =
        fs.readdirSync(commandsPath)
            .filter(file => file.endsWith(".js"));

    console.log(`Found ${commandFiles.length} command files.`);

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);

        try {
            const command = require(filePath);

            if (!command?.data) {
                console.log(`Skipped invalid command: ${file}`);
                continue;
            }

            commands.push(command.data.toJSON());
            console.log(`Loaded command: ${command.data.name}`);

        } catch (err) {
            console.log(`Failed to load command: ${file}`);
            console.error(err);
        }
    }

    const rest = new REST({ version: "10" }).setToken(token);

    console.log("Deploying slash commands...");

    if (deployScope === "guild" && guildId) {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log("Commands deployed to guild.");
        return;
    }

    await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
    );

    console.log("Commands deployed globally.");

    if (guildId) {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [] }
        );

        console.log("Cleared guild-specific commands so global commands are used.");
    }
}

if (require.main === module) {
    deployCommands()
        .catch(err => {
            console.error("Deployment failed:");

            if (err.status === 401) {
                console.error(
                    "Discord rejected the bot token. Check that your local .env token is current and belongs to the same application as CLIENT_ID."
                );
            }

            console.error(err);
            process.exitCode = 1;
        })
        .finally(async () => {
            try {
                const db = require("./db");
                await db.close();
            } catch (err) {
                // Ignore cleanup errors; deployment already reported the useful result.
            }
        });
}

module.exports = {
    deployCommands
};
