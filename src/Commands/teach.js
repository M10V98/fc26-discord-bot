const {
    SlashCommandBuilder
} = require("discord.js");

const db = require("../Utils/db");
const { canUseAdminCommands } = require("../Utils/permissions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("teach")
        .setDescription("Teach the bot a fact or submit one for approval")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("A question people may ask")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("answer")
                .setDescription("The correct answer")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("aliases")
                .setDescription("Alternative questions separated by |")
        )
        .addStringOption(option =>
            option
                .setName("source_url")
                .setDescription("Optional source URL")
        ),

    async execute(interaction) {
        const question =
            interaction.options.getString("question").trim();
        const answer =
            interaction.options.getString("answer").trim();
        const sourceUrl =
            interaction.options.getString("source_url")?.trim() || null;
        const aliases =
            (interaction.options.getString("aliases") || "")
                .split("|")
                .map(value => value.trim())
                .filter(Boolean)
                .slice(0, 20);
        const isAdmin = canUseAdminCommands(interaction);
        const status =
            isAdmin
                ? "approved"
                : "pending";
        const duplicate =
            await db.get(
                `
                SELECT id, status
                FROM learned_knowledge
                WHERE guild_id = ?
                AND lower(question) = lower(?)
                LIMIT 1
                `,
                [
                    interaction.guild.id,
                    question
                ]
            );

        if (duplicate) {
            return interaction.reply({
                content:
                    `That question already exists as knowledge #${duplicate.id} (${duplicate.status}).`,
                ephemeral: true
            });
        }

        const result =
            await db.run(
                `
                INSERT INTO learned_knowledge
                (
                    guild_id,
                    question,
                    answer,
                    aliases_json,
                    source_url,
                    status,
                    submitted_by,
                    approved_by,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    interaction.guild.id,
                    question,
                    answer,
                    JSON.stringify(aliases),
                    sourceUrl,
                    status,
                    interaction.user.id,
                    isAdmin
                        ? interaction.user.id
                        : null,
                    Date.now(),
                    Date.now()
                ]
            );

        return interaction.reply({
            content:
                isAdmin
                    ? `Learned knowledge #${result.lastID}. It is active in /ask and auto-AI now.`
                    : `Submitted knowledge #${result.lastID} for administrator approval.`,
            ephemeral: true
        });
    }
};
