const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../Utils/db");
const {
    FOOTER,
    escapeMarkdown,
    number
} = require("../Utils/embedStyle");

const DEFAULT_TIMEOUT_MINUTES = 60;

const ACTION_LABELS = {
    warn: "Warn",
    timeout: "Timeout",
    ban: "Ban"
};

async function warnCount(guildId, userId) {
    const row =
        await db.get(
            `
            SELECT COUNT(*) AS total
            FROM mod_infractions
            WHERE guild_id = ?
            AND user_id = ?
            AND type = 'warn'
            `,
            [guildId, userId]
        );

    return Number(row?.total || 0);
}

function infractionEmbed(user, rows) {
    const lines =
        rows.length
            ? rows.map(row =>
                `**${row.type.toUpperCase()}** - ${escapeMarkdown(row.reason || "No reason")} (<@${row.moderator_id}>)`
            )
            : ["No infractions recorded."];

    return new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle(`\u2696\uFE0F Infractions for ${user.tag}`)
        .setDescription(lines.join("\n").slice(0, 4096))
        .setFooter(FOOTER);
}

async function recordInfraction(interaction, type, user, reason) {
    await db.run(
        `
        INSERT INTO mod_infractions
        (guild_id, user_id, moderator_id, type, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            interaction.guild.id,
            user.id,
            interaction.user.id,
            type,
            reason || null,
            Date.now()
        ]
    );
}

function targetLine(action, user) {
    return `✅ ${user.username} [${user.id}]`;
}

function actionSummary(action, user, options = {}) {
    if (action === "warn") {
        return `Warned ${user.username}. Total warns: **${number(options.warns)}**.`;
    }

    if (action === "timeout") {
        return `Timed out ${user.username} for **${number(options.minutes)}** minute${options.minutes === 1 ? "" : "s"}.`;
    }

    if (action === "ban") {
        return `Banned ${user.username}.`;
    }

    return `${ACTION_LABELS[action] || "Moderation"} action completed for ${user.username}.`;
}

function actionEmbed(interaction, action, user, reason, options = {}) {
    const label =
        ACTION_LABELS[action] || "Moderation";
    const dmStatus =
        options.dmSent
            ? "✅ User notified by DM"
            : "⚠️ Could not DM user";
    const escalation =
        options.escalation
            ? "\n🚩 Auto-escalation flag: this user has 3+ warnings."
            : "";
    const duration =
        action === "timeout"
            ? `\n⏱️ Duration: ${number(options.minutes)} minute${options.minutes === 1 ? "" : "s"}`
            : "";

    return new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`${label} result:`)
        .setDescription(
            [
                `📋 **Reason:** ${escapeMarkdown(reason || "No reason provided")}`,
                `👥 **Moderator:** <@${interaction.user.id}>`,
                duration.trim(),
                "",
                `**${action === "timeout" ? "Timed out" : action === "ban" ? "Banned" : "Warned"}:**`,
                targetLine(action, user),
                "",
                dmStatus,
                escalation
            ]
                .filter(line => line !== "")
                .join("\n")
                .slice(0, 4096)
        )
        .setFooter(FOOTER);
}

function dmEmbed(interaction, action, reason, options = {}) {
    const label =
        ACTION_LABELS[action] || "Moderation";
    const duration =
        action === "timeout"
            ? `\n⏱️ Duration: ${number(options.minutes)} minute${options.minutes === 1 ? "" : "s"}`
            : "";

    return new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`${label} notice`)
        .setDescription(
            [
                `You have received a **${label.toLowerCase()}** in **${interaction.guild.name}**.`,
                "",
                `📋 **Reason:** ${escapeMarkdown(reason || "No reason provided")}`,
                `👥 **Moderator:** ${interaction.user.tag}`,
                duration.trim()
            ]
                .filter(Boolean)
                .join("\n")
        )
        .setFooter(FOOTER);
}

async function notifyUser(interaction, user, action, reason, options = {}) {
    try {
        await user.send({
            embeds: [
                dmEmbed(
                    interaction,
                    action,
                    reason,
                    options
                )
            ]
        });

        return true;
    } catch {
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mod")
        .setDescription("Moderation tools")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName("warn")
                .setDescription("Warn a user")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("User to warn")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("infractions")
                .setDescription("Show a user's infractions")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("User to inspect")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("timeout")
                .setDescription("Timeout a user")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("User to timeout")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("minutes")
                        .setDescription("Timeout length in minutes")
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("ban")
                .setDescription("Ban a user")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("User to ban")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason")
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const subcommand =
                interaction.options.getSubcommand();
            const user =
                interaction.options.getUser("user");
            const reason =
                interaction.options.getString("reason") ||
                "No reason provided";

            if (subcommand === "infractions") {
                const rows =
                    await db.all(
                        `
                        SELECT *
                        FROM mod_infractions
                        WHERE guild_id = ?
                        AND user_id = ?
                        ORDER BY created_at DESC
                        LIMIT 15
                        `,
                        [interaction.guild.id, user.id]
                    );

                return interaction.editReply({
                    embeds: [infractionEmbed(user, rows)]
                });
            }

            if (subcommand === "warn") {
                await recordInfraction(interaction, "warn", user, reason);

                const warns =
                    await warnCount(interaction.guild.id, user.id);
                const dmSent =
                    await notifyUser(
                        interaction,
                        user,
                        "warn",
                        reason,
                        { warns }
                    );
                const escalation =
                    warns >= 3;

                return interaction.editReply({
                    content: actionSummary(
                        "warn",
                        user,
                        { warns }
                    ),
                    embeds: [
                        actionEmbed(
                            interaction,
                            "warn",
                            user,
                            reason,
                            {
                                warns,
                                dmSent,
                                escalation
                            }
                        )
                    ]
                });
            }

            const member =
                await interaction.guild.members.fetch(user.id)
                    .catch(() => null);

            if (!member) {
                return interaction.editReply("That user is not in this server.");
            }

            if (subcommand === "timeout") {
                const minutes =
                    Math.max(
                        1,
                        interaction.options.getInteger("minutes") ||
                        DEFAULT_TIMEOUT_MINUTES
                    );
                const dmSent =
                    await notifyUser(
                        interaction,
                        user,
                        "timeout",
                        reason,
                        { minutes }
                    );

                await member.timeout(
                    minutes * 60 * 1000,
                    reason
                );
                await recordInfraction(interaction, "timeout", user, reason);

                return interaction.editReply({
                    content: actionSummary(
                        "timeout",
                        user,
                        { minutes }
                    ),
                    embeds: [
                        actionEmbed(
                            interaction,
                            "timeout",
                            user,
                            reason,
                            {
                                minutes,
                                dmSent
                            }
                        )
                    ]
                });
            }

            if (subcommand === "ban") {
                const dmSent =
                    await notifyUser(
                        interaction,
                        user,
                        "ban",
                        reason
                    );

                await recordInfraction(interaction, "ban", user, reason);
                await member.ban({
                    reason
                });

                return interaction.editReply({
                    content: actionSummary("ban", user),
                    embeds: [
                        actionEmbed(
                            interaction,
                            "ban",
                            user,
                            reason,
                            { dmSent }
                        )
                    ]
                });
            }

            return interaction.editReply("Unknown moderation action.");
        } catch (err) {
            console.error("mod error:", err);
            return interaction.editReply("Failed to run moderation action. Check my role permissions.");
        }
    }
};
