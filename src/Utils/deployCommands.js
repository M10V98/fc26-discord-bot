
const fs = require("fs");
const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

const {
    REST,
    Routes,
    PermissionFlagsBits
} = require("discord.js");

const ADMIN_COMMANDS = new Set([
    "adminclaim", "club", "eventcodes", "knowledge", "linkclub",
    "mod", "resetstats", "schedule", "settings", "syncstats", "unlink"
]);

async function deployCommands() {

    const token =
        process.env.TOKEN ||
        process.env.DISCORD_TOKEN ||
        process.env.BOT_TOKEN;

    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    const deployScope =
        String(
            process.env.DEPLOY_SCOPE || "global"
        ).toLowerCase();

    console.log("ENV CHECK:");
    console.log("TOKEN:", !!token);
    console.log("DISCORD_TOKEN:", !!process.env.DISCORD_TOKEN);
    console.log("BOT_TOKEN:", !!process.env.BOT_TOKEN);
    console.log("CLIENT_ID:", !!clientId);
    console.log("GUILD_ID:", !!guildId);
    console.log("DEPLOY_SCOPE:", deployScope);

    if (!token || !clientId) {
        throw new Error(
            "Missing TOKEN/DISCORD_TOKEN/BOT_TOKEN or CLIENT_ID"
        );
    }

    const commands = [];

    const commandsPath =
        path.join(__dirname, "../Commands");

    const commandFiles =
        fs.readdirSync(commandsPath)
            .filter(file =>
                file.endsWith(".js") &&
                file !== "playerbuilder.js" &&
                file !== "worldcup.js" &&
                file !== "legacy.js"
            );

    console.log(
        `Found ${commandFiles.length} command files.`
    );

    for (const file of commandFiles) {

        try {

            const command =
                require(
                    path.join(commandsPath, file)
                );

            if (!command?.data) {
                console.log(
                    `Skipped invalid command: ${file}`
                );
                continue;
            }

            if (command.hidden) {
                console.log(
                    `Skipped hidden command: ${command.data.name}`
                );
                continue;
            }

            const definition = command.data.toJSON();

            // Discord hides these controls from regular members. Managers who
            // should use them must have the Discord Administrator permission,
            // matching their admin-equivalent bot access.
            if (ADMIN_COMMANDS.has(definition.name)) {
                definition.default_member_permissions =
                    String(PermissionFlagsBits.Administrator);
            }

            commands.push(definition);

            console.log(
                `Loaded command: ${command.data.name}`
            );

        } catch (err) {

            console.error(
                `Failed loading ${file}`
            );

            console.error(err);
        }
    }

    const rest =
        new REST({ version: "10" })
            .setToken(token);

    console.log(
        "Deploying slash commands..."
    );

    let result;

    if (
        deployScope === "guild" &&
        guildId
    ) {

        result = await rest.put(
            Routes.applicationGuildCommands(
                clientId,
                guildId
            ),
            {
                body: commands
            }
        );

        console.log(
            `✅ Guild commands deployed (${result.length})`
        );

    } else {

        result = await rest.put(
            Routes.applicationCommands(
                clientId
            ),
            {
                body: commands
            }
        );

        console.log(
            `✅ Global commands deployed (${result.length})`
        );

        if (guildId) {

            await rest.put(
                Routes.applicationGuildCommands(
                    clientId,
                    guildId
                ),
                {
                    body: []
                }
            );

            console.log(
                "Cleared guild-specific commands."
            );
        }
    }

    console.log(
        "\n========== REGISTERED COMMANDS =========="
    );

    for (const cmd of result) {
        console.log(`/${cmd.name}`);
    }

    console.log(
        "========================================\n"
    );
}

if (require.main === module) {

    deployCommands()
        .catch(err => {

            console.error(
                "Deployment failed:"
            );

            console.error(err);

            process.exitCode = 1;
        });
}

module.exports = {
    deployCommands
};
