const {
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../Utils/db");
const {
    clearCrestMemo
} = require("../Services/crests");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlink")
        .setDescription("Unlink this server's EA club")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // ✅ Admin-only visibility

    async execute(interaction) {
        // ✅ Runtime admin check (consistent with your other commands)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "Only administrators can unlink the club.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const result = await db.run(
                `DELETE FROM clubs WHERE guild_id = ?`,
                [interaction.guild.id]
            );

            await db.run(
                `DELETE FROM automode WHERE guild_id = ?`,
                [interaction.guild.id]
            );

            await db.run(
                `DELETE FROM linked_players WHERE guild_id = ?`,
                [interaction.guild.id]
            );

            await db.run(
                `DELETE FROM players WHERE guild_id = ?`,
                [interaction.guild.id]
            );

            await db.run(
                `DELETE FROM comp_matches WHERE guild_id = ?`,
                [interaction.guild.id]
            );

            clearCrestMemo();

            await interaction.editReply(
                result.changes > 0
                    ? "Club unlinked and server club stats/claims cleared. You can now use `/linkclub` with a new Club ID."
                    : "No club is currently linked for this server."
            );

        } catch (err) {
            console.error("unlink error:", err);

            await interaction.editReply(
                "Failed to unlink club. Check bot logs for details."
            );
        }
    }
};
