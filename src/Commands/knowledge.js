const {
    PermissionFlagsBits,
    SlashCommandBuilder
} = require("discord.js");

const db = require("../Utils/db");

function adminOnly() {
    return {
        content: "Only administrators can manage learned knowledge.",
        ephemeral: true
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("knowledge")
        .setDescription("Review and manage learned bot knowledge")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(command =>
            command
                .setName("pending")
                .setDescription("Show pending knowledge suggestions")
        )
        .addSubcommand(command =>
            command
                .setName("approve")
                .setDescription("Approve a pending knowledge suggestion")
                .addIntegerOption(option =>
                    option
                        .setName("id")
                        .setDescription("Knowledge ID")
                        .setRequired(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName("reject")
                .setDescription("Reject a pending knowledge suggestion")
                .addIntegerOption(option =>
                    option
                        .setName("id")
                        .setDescription("Knowledge ID")
                        .setRequired(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName("remove")
                .setDescription("Remove learned knowledge")
                .addIntegerOption(option =>
                    option
                        .setName("id")
                        .setDescription("Knowledge ID")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (
            !interaction.memberPermissions?.has(
                PermissionFlagsBits.Administrator
            )
        ) {
            return interaction.reply(adminOnly());
        }

        const action =
            interaction.options.getSubcommand();

        if (action === "pending") {
            const rows =
                await db.all(
                    `
                    SELECT *
                    FROM learned_knowledge
                    WHERE guild_id = ?
                    AND status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT 15
                    `,
                    [interaction.guild.id]
                );

            return interaction.reply({
                content:
                    rows.length
                        ? rows.map(row =>
                            `**#${row.id}** ${row.question}\n${row.answer}${row.source_url ? `\n${row.source_url}` : ""}`
                        ).join("\n\n").slice(0, 1900)
                        : "There are no pending knowledge suggestions.",
                ephemeral: true
            });
        }

        const id =
            interaction.options.getInteger("id");

        if (action === "remove") {
            const result =
                await db.run(
                    `
                    DELETE FROM learned_knowledge
                    WHERE guild_id = ?
                    AND id = ?
                    `,
                    [
                        interaction.guild.id,
                        id
                    ]
                );

            return interaction.reply({
                content:
                    result.changes
                        ? `Removed knowledge #${id}.`
                        : `Knowledge #${id} was not found.`,
                ephemeral: true
            });
        }

        const status =
            action === "approve"
                ? "approved"
                : "rejected";
        const result =
            await db.run(
                `
                UPDATE learned_knowledge
                SET status = ?,
                    approved_by = ?,
                    updated_at = ?
                WHERE guild_id = ?
                AND id = ?
                AND status = 'pending'
                `,
                [
                    status,
                    interaction.user.id,
                    Date.now(),
                    interaction.guild.id,
                    id
                ]
            );

        return interaction.reply({
            content:
                result.changes
                    ? `${status === "approved" ? "Approved" : "Rejected"} knowledge #${id}.`
                    : `Pending knowledge #${id} was not found.`,
            ephemeral: true
        });
    }
};
