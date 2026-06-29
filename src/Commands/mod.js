const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
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
const INFRACTIONS_PAGE_SIZE = 8;
const ACADEMY_MANAGER_ROLE_NAME = "academy manager";
const ACADEMY_MANAGER_MOD_SUBCOMMANDS =
    new Set([
        "warn",
        "infractions",
        "warnings",
        "timeout"
    ]);

const ACTION_LABELS = {
    warn: "Warning",
    timeout: "Timeout",
    ban: "Ban"
};

function isAdministrator(interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function hasAcademyManagerRole(interaction) {
    const roles =
        interaction.member?.roles?.cache;

    return Boolean(
        roles?.some(role =>
            role.name.toLowerCase() === ACADEMY_MANAGER_ROLE_NAME
        )
    );
}

function canUseModSubcommand(interaction, subcommand) {
    return (
        isAdministrator(interaction) ||
        (
            hasAcademyManagerRole(interaction) &&
            ACADEMY_MANAGER_MOD_SUBCOMMANDS.has(subcommand)
        )
    );
}

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

function formatInfractionRow(row, index) {
    return [
        `**${index}. ${row.type.toUpperCase()}**`,
        `User: <@${row.user_id}>`,
        `Reason: ${escapeMarkdown(row.reason || "No reason")}`,
        `Moderator: <@${row.moderator_id}>`
    ].join("\n");
}

function infractionPageButtons(scope, targetUserId, page, totalPages) {
    const target =
        targetUserId || "all";

    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`mod_infractions_page:${scope}:${target}:${page - 1}`)
                    .setLabel("Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 0),

                new ButtonBuilder()
                    .setCustomId(`mod_infractions_page:${scope}:${target}:${page + 1}`)
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            )
    ];
}

async function buildInfractionsPage(interaction, options = {}) {
    const page =
        Math.max(0, Number(options.page || 0));
    const targetUserId =
        options.userId || null;
    const params =
        targetUserId
            ? [interaction.guild.id, targetUserId]
            : [interaction.guild.id];
    const where =
        targetUserId
            ? "WHERE guild_id = ? AND user_id = ?"
            : "WHERE guild_id = ?";
    const [{ total = 0 } = {}] =
        await db.all(
            `
            SELECT COUNT(*) AS total
            FROM mod_infractions
            ${where}
            `,
            params
        );
    const totalPages =
        Math.max(
            1,
            Math.ceil(Number(total || 0) / INFRACTIONS_PAGE_SIZE)
        );
    const safePage =
        Math.min(page, totalPages - 1);
    const rows =
        await db.all(
            `
            SELECT *
            FROM mod_infractions
            ${where}
            ORDER BY created_at DESC
            LIMIT ?
            OFFSET ?
            `,
            [
                ...params,
                INFRACTIONS_PAGE_SIZE,
                safePage * INFRACTIONS_PAGE_SIZE
            ]
        );
    const counts =
        await db.get(
            `
            SELECT
                SUM(CASE WHEN type = 'warn' THEN 1 ELSE 0 END) AS warns,
                SUM(CASE WHEN type = 'timeout' THEN 1 ELSE 0 END) AS timeouts,
                SUM(CASE WHEN type = 'ban' THEN 1 ELSE 0 END) AS bans
            FROM mod_infractions
            ${where}
            `,
            params
        );
    const heading =
        targetUserId
            ? `Infractions for <@${targetUserId}>`
            : "Server moderation records";
    const lines =
        rows.length
            ? rows.map((row, index) =>
                formatInfractionRow(
                    row,
                    safePage * INFRACTIONS_PAGE_SIZE + index + 1
                )
            )
            : ["No infractions recorded."];
    const embed =
        new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle(`${heading}:`)
            .setDescription(
                [
                    `Total records: **${number(total)}**`,
                    `Warnings: **${number(counts?.warns || 0)}** | Timeouts: **${number(counts?.timeouts || 0)}** | Bans: **${number(counts?.bans || 0)}**`,
                    "",
                    lines.join("\n\n")
                ].join("\n").slice(0, 4096)
            )
            .setFooter({
                ...FOOTER,
                text:
                    `${FOOTER.text} - Page ${safePage + 1}/${totalPages}`
            });

    return {
        embeds: [embed],
        components:
            totalPages > 1
                ? infractionPageButtons(
                    "records",
                    targetUserId,
                    safePage,
                    totalPages
                )
                : []
    };
}

async function handleInfractionsPageButton(interaction) {
    if (!canUseModSubcommand(interaction, "infractions")) {
        return interaction.reply({
            content: "Only administrators or Academy Managers can use moderation buttons.",
            ephemeral: true
        });
    }

    const [, , target, page] =
        interaction.customId.split(":");
    const payload =
        await buildInfractionsPage(
            interaction,
            {
                userId:
                    target === "all"
                        ? null
                        : target,
                page
            }
        );

    return interaction.update(payload);
}

function warningsEmbed(user, rows) {
    const lines =
        rows.length
            ? rows.map((row, index) =>
                [
                    `**Warning ${index + 1}**`,
                    `Reason: ${escapeMarkdown(row.reason || "No reason")}`,
                    `Moderator: <@${row.moderator_id}>`
                ].join("\n")
            )
            : ["No warnings recorded."];

    return new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("Warning records:")
        .setDescription(
            [
                `User: **${escapeMarkdown(user.tag)}**`,
                `Total warnings: **${number(rows.length)}**`,
                "",
                lines.join("\n\n")
            ].join("\n").slice(0, 4096)
        )
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
        return `Warned ${user.username}. Total warnings: **${number(options.warns)}**.`;
    }

    if (action === "resetwarnings") {
        return `Reset ${number(options.removed)} warning${options.removed === 1 ? "" : "s"} for ${user.username}.`;
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
        action === "resetwarnings"
            ? "Reset Warnings"
            : ACTION_LABELS[action] || "Moderation";
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
                `**${action === "timeout" ? "Timed out" : action === "ban" ? "Banned" : action === "resetwarnings" ? "Warnings reset" : "Warned"}:**`,
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
    const noticeLabel =
        action === "warn"
            ? "warning"
            : label.toLowerCase();
    const duration =
        action === "timeout"
            ? `\n⏱️ Duration: ${number(options.minutes)} minute${options.minutes === 1 ? "" : "s"}`
            : "";

    return new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`${label} notice`)
        .setDescription(
            [
                `You have received a **${noticeLabel}** in **${interaction.guild.name}**.`,
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
                .setDescription("Show server infractions or a user's infractions")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("User to inspect")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("resetwarnings")
                .setDescription("Reset a user's warning count")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("User to reset warnings for")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reset")
                        .setDescription("How many warnings to remove")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "Complete reset",
                                value: "all"
                            },
                            {
                                name: "Remove 1 warning",
                                value: "1"
                            },
                            {
                                name: "Remove 2 warnings",
                                value: "2"
                            }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason for resetting warnings")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("warnings")
                .setDescription("Show a user's warnings only")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("User to inspect warnings for")
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
        await interaction.deferReply();

        try {
            const subcommand =
                interaction.options.getSubcommand();

            if (!canUseModSubcommand(interaction, subcommand)) {
                return interaction.editReply(
                    ACADEMY_MANAGER_MOD_SUBCOMMANDS.has(subcommand)
                        ? "Only administrators or Academy Managers can use this moderation command."
                        : "Only administrators can use this moderation command."
                );
            }

            const user =
                interaction.options.getUser("user");
            const reason =
                interaction.options.getString("reason") ||
                "No reason provided";

            if (subcommand === "infractions") {
                const payload =
                    await buildInfractionsPage(
                        interaction,
                        {
                            userId: user?.id || null,
                            page: 0
                        }
                    );

                return interaction.editReply(payload);
            }

            if (subcommand === "warnings") {
                const rows =
                    await db.all(
                        `
                        SELECT *
                        FROM mod_infractions
                        WHERE guild_id = ?
                        AND user_id = ?
                        AND type = 'warn'
                        ORDER BY created_at DESC
                        LIMIT 25
                        `,
                        [interaction.guild.id, user.id]
                    );

                return interaction.editReply({
                    embeds: [warningsEmbed(user, rows)]
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

            if (subcommand === "resetwarnings") {
                const reset =
                    interaction.options.getString("reset") || "all";
                const amount =
                    reset === "all"
                        ? null
                        : Number(reset);
                let result;

                if (amount) {
                    result =
                        await db.run(
                            `
                            DELETE FROM mod_infractions
                            WHERE id IN (
                                SELECT id
                                FROM mod_infractions
                                WHERE guild_id = ?
                                AND user_id = ?
                                AND type = 'warn'
                                ORDER BY created_at DESC
                                LIMIT ?
                            )
                            `,
                            [
                                interaction.guild.id,
                                user.id,
                                amount
                            ]
                        );
                } else {
                    result =
                        await db.run(
                            `
                            DELETE FROM mod_infractions
                            WHERE guild_id = ?
                            AND user_id = ?
                            AND type = 'warn'
                            `,
                            [
                                interaction.guild.id,
                                user.id
                            ]
                        );
                }

                const removed =
                    Number(result.changes || 0);

                return interaction.editReply({
                    content: actionSummary(
                        "resetwarnings",
                        user,
                        { removed }
                    ),
                    embeds: [
                        actionEmbed(
                            interaction,
                            "resetwarnings",
                            user,
                            reason,
                            {
                                removed,
                                dmSent: false
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
    },
    handleInfractionsPageButton
};
