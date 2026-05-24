const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../Utils/db");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("linkclub")
        .setDescription("Link your EA club")
        .addStringOption(option =>
            option
                .setName("clubid")
                .setDescription("EA Club ID")
                .setRequired(true)
        ),

    async execute(interaction) {

       await interaction.deferReply({
    flags: MessageFlags.Ephemeral
});

        try {

            const clubId =
                interaction.options.getString(
                    "clubid"
                );

            await db.run(
                `
                INSERT OR REPLACE INTO clubs
                (guild_id, club_id)
                VALUES (?, ?)
                `,
                [
                    interaction.guild.id,
                    clubId
                ]
            );

            await interaction.editReply(
                `✅ Club linked: ${clubId}`
            );

        } catch (err) {

            console.error(
                "❌ linkclub error:",
                err
            );

            await interaction.editReply(
                "❌ Failed to link club."
            );
        }
    }
};