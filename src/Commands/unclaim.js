const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../Utils/db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unclaim")
        .setDescription("Unclaim your linked player"),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const result =
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

        await interaction.editReply(
            result.changes > 0
                ? "Your player claim has been removed."
                : "You do not have a claimed player in this server."
        );
    }
};
