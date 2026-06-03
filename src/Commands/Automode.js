const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const {
    buildStopButtonRow,
    startAutoMode
} = require("../Services/syncMatches");
const db = require("../Utils/db");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("automode")
        .setDescription("Automatically posts latest match stats"),

    async execute(interaction) {

        try {

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            await db.run(
                `
                INSERT OR REPLACE INTO automode
                (
                    guild_id,
                    channel_id,
                    last_match_id,
                    started_at,
                    last_activity_at
                )
                VALUES (?, ?, NULL, ?, ?)
                `,
                [
                    interaction.guild.id,
                    interaction.channel.id,
                    Date.now(),
                    Date.now()
                ]
            );

            const firstSync =
                startAutoMode(
                interaction.guild.id,
                interaction.channel,
                { postLatest: true }
            );

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("AutoMode Enabled")
                        .setDescription(
                            "Live match tracking enabled.\n\n" +
                            "- Posts latest completed match\n" +
                            "- Includes player stats\n" +
                            "- XP updates automatically\n" +
                            "- Checks every 15 seconds\n" +
                            "- Stops after 30 minutes without a new backend result"
                        )
                ],
                components: [
                    buildStopButtonRow(interaction.guild.id)
                ]
            });

            const result =
                await firstSync;

            if (result?.status === "no_club") {
                await interaction.followUp({
                    content:
                        "AutoMode is on, but I could not post a result because no club is linked for this server. Use `/linkclub` first.",
                    ephemeral: true
                });
            }

            if (result?.status === "no_matches") {
                await interaction.followUp({
                    content:
                        "AutoMode is on, but the backend did not return any matches for the linked club yet.",
                    ephemeral: true
                });
            }

            if (result?.status === "error") {
                await interaction.followUp({
                    content:
                        "AutoMode is on, but the first backend check failed. I will keep checking every 15 seconds.",
                    ephemeral: true
                });
            }

        } catch (err) {

            console.error("automode error:", err);

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: "Failed to start automode.",
                    embeds: [],
                    components: []
                });
            } else {
                await interaction.reply({
                    content: "Failed to start automode.",
                    flags: 64
                });
            }
        }
    }
};
