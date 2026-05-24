const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const { startAutoMode } = require("../Services/syncMatches");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("automode")
        .setDescription("Automatically posts latest match stats"),

    async execute(interaction) {

        try {

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("⚡ AutoMode Enabled")
                        .setDescription(
                            "✅ Live match tracking enabled.\n\n" +
                            "• Posts latest completed match\n" +
                            "• Includes player stats\n" +
                            "• XP updates automatically\n" +
                            "• Checks every 60 seconds"
                        )
                ]
            });

            startAutoMode(
                interaction.guild.id,
                interaction.channel
            );

        } catch (err) {

            console.error("❌ automode error:", err);

            if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ Failed to start automode.",
                    flags: 64
                });
            }
        }
    }
};
