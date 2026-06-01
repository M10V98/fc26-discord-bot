const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../Utils/db");
const eaApi = require("./eaApi");
const {
    getCrestUrl
} = require("./crests");
const {
    FOOTER,
    escapeMarkdown,
    underline
} = require("../Utils/embedStyle");

const CLEANUP_CHECK_MS = 60 * 1000;
const CLEANUP_GRACE_MS = 0;

let clientRef = null;
let interval = null;

function readList(value) {
    try {
        const parsed = JSON.parse(value || "[]");
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
}

function writeList(values) {
    return JSON.stringify([...new Set(values.map(String))]);
}

function parseDateTime(input) {
    const raw = String(input || "").trim();

    if (!raw) return null;

    const direct = Date.parse(raw);
    if (!Number.isNaN(direct)) return direct;

    const match =
        raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);

    if (!match) return null;

    const [, day, month, year, hour = "0", minute = "0"] = match;
    const fullYear =
        Number(year) < 100
            ? Number(`20${year}`)
            : Number(year);
    const parsed =
        new Date(
            fullYear,
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute)
        ).getTime();

    return Number.isNaN(parsed) ? null : parsed;
}

function formatDiscordTime(startsAt) {
    const unix = Math.floor(Number(startsAt) / 1000);
    return `<t:${unix}:F>`;
}

function formatRelativeTime(startsAt) {
    const unix = Math.floor(Number(startsAt) / 1000);
    return `<t:${unix}:R>`;
}

function mentionList(ids) {
    if (!ids.length) return "No one yet";
    return ids.map(id => `<@${id}>`).join("\n").slice(0, 1024);
}

function buildSessionEmbed(session, guild) {
    const canPlay = readList(session.can_play);
    const cannotPlay = readList(session.cannot_play);
    const maybePlay = readList(session.maybe_play);
    const title =
        session.title ||
        `${guild?.name || "Club"} Scheduled Session`;

    const embed =
        new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle(`${underline(title)} - ${formatRelativeTime(session.starts_at)}`)
        .setDescription(
            [
                `<@${session.creator_id}> has scheduled a Pro Clubs session. Use the buttons below: ✅ (can play), ❌ (cannot), ❔ (maybe).`,
                "",
                "**Time & Date**",
                formatDiscordTime(session.starts_at),
                "",
                "**League**",
                escapeMarkdown(session.league || "Not set"),
                "",
                "**Session Role**",
                session.role_id ? `<@&${session.role_id}>` : "Role unavailable"
            ].join("\n")
        )
        .addFields(
            {
                name: `✅ Can Play (${canPlay.length})`,
                value: mentionList(canPlay),
                inline: true
            },
            {
                name: `❌ Cannot Play (${cannotPlay.length})`,
                value: mentionList(cannotPlay),
                inline: true
            },
            {
                name: `❔ Maybe (${maybePlay.length})`,
                value: mentionList(maybePlay),
                inline: true
            }
        )
        .setFooter(FOOTER);

    if (session.crest_url) {
        embed.setThumbnail(session.crest_url);
    }

    return embed;
}

function buildSessionButtons(sessionId) {
    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`session_rsvp:${sessionId}:can`)
                    .setEmoji("✅")
                    .setLabel("Can Play")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`session_rsvp:${sessionId}:cannot`)
                    .setEmoji("❌")
                    .setLabel("Cannot Play")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`session_rsvp:${sessionId}:maybe`)
                    .setEmoji("❔")
                    .setLabel("Maybe")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

async function createSession(interaction, options) {
    const startsAt = parseDateTime(options.timeText);

    if (!startsAt) {
        throw new Error("I could not understand that time/date. Try `2026-06-01 20:00` or `01/06/2026 20:00`.");
    }

    if (startsAt <= Date.now()) {
        throw new Error("That session time is in the past.");
    }

    const sessionId =
        `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const club =
        await db.get(
            `SELECT * FROM clubs WHERE guild_id = ?`,
            [interaction.guild.id]
        );
    const [info, crestUrl, existingSessions] =
        await Promise.all([
            club ? eaApi.getClubInfo(club.club_id).catch(() => null) : null,
            club ? getCrestUrl(club.club_id).catch(() => null) : null,
            db.all(
                `
                SELECT session_id
                FROM scheduled_sessions
                WHERE guild_id = ?
                `,
                [interaction.guild.id]
            )
        ]);
    const clubName =
        club && info?.[String(club.club_id)]?.name
            ? info[String(club.club_id)].name
            : interaction.guild.name;
    const sessionNumber =
        existingSessions.length + 1;
    const roleName =
        `Session ${sessionNumber}`.slice(0, 100);

    const role =
        await interaction.guild.roles.create({
            name: roleName,
            mentionable: true,
            reason: `Scheduled session ${sessionId}`
        });

    const session = {
        session_id: sessionId,
        guild_id: interaction.guild.id,
        channel_id: interaction.channel.id,
        message_id: null,
        role_id: role.id,
        creator_id: interaction.user.id,
        title:
            options.title ||
            `${clubName} Scheduled Session`,
        time_text: options.timeText,
        league: options.league,
        starts_at: startsAt,
        crest_url: crestUrl,
        can_play: "[]",
        cannot_play: "[]",
        maybe_play: "[]",
        created_at: Date.now()
    };

    const message =
        await interaction.channel.send({
            embeds: [
                buildSessionEmbed(session, interaction.guild)
            ],
            components: buildSessionButtons(sessionId)
        });

    await db.run(
        `
        INSERT INTO scheduled_sessions
        (
            session_id,
            guild_id,
            channel_id,
            message_id,
            role_id,
            creator_id,
            title,
            time_text,
            league,
            crest_url,
            starts_at,
            can_play,
            cannot_play,
            maybe_play,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            sessionId,
            interaction.guild.id,
            interaction.channel.id,
            message.id,
            role.id,
            interaction.user.id,
            session.title,
            options.timeText,
            options.league,
            crestUrl,
            startsAt,
            "[]",
            "[]",
            "[]",
            Date.now()
        ]
    );

    return {
        sessionId,
        role,
        message
    };
}

async function handleSessionButton(interaction) {
    const [, sessionId, choice] =
        interaction.customId.split(":");

    const session =
        await db.get(
            `
            SELECT *
            FROM scheduled_sessions
            WHERE session_id = ?
            `,
            [sessionId]
        );

    if (!session) {
        return interaction.reply({
            content: "This session has ended or no longer exists.",
            ephemeral: true
        });
    }

    const userId = interaction.user.id;
    const canPlay =
        readList(session.can_play).filter(id => id !== userId);
    const cannotPlay =
        readList(session.cannot_play).filter(id => id !== userId);
    const maybePlay =
        readList(session.maybe_play).filter(id => id !== userId);

    if (choice === "can") canPlay.push(userId);
    if (choice === "cannot") cannotPlay.push(userId);
    if (choice === "maybe") maybePlay.push(userId);

    const member =
        interaction.member;

    if (member && session.role_id) {
        if (choice === "can") {
            await member.roles.add(session.role_id).catch(() => {});
        } else {
            await member.roles.remove(session.role_id).catch(() => {});
        }
    }

    const updated = {
        ...session,
        can_play: writeList(canPlay),
        cannot_play: writeList(cannotPlay),
        maybe_play: writeList(maybePlay)
    };

    await db.run(
        `
        UPDATE scheduled_sessions
        SET can_play = ?,
            cannot_play = ?,
            maybe_play = ?
        WHERE session_id = ?
        `,
        [
            updated.can_play,
            updated.cannot_play,
            updated.maybe_play,
            sessionId
        ]
    );

    await interaction.update({
        embeds: [
            buildSessionEmbed(updated, interaction.guild)
        ],
        components: buildSessionButtons(sessionId)
    });
}

async function cleanupSession(client, session) {
    const guild =
        await client.guilds.fetch(session.guild_id).catch(() => null);

    if (!guild) {
        await db.run(
            `DELETE FROM scheduled_sessions WHERE session_id = ?`,
            [session.session_id]
        );
        return;
    }

    const channel =
        await guild.channels.fetch(session.channel_id).catch(() => null);

    if (channel && session.message_id) {
        const message =
            await channel.messages.fetch(session.message_id).catch(() => null);

        if (message) {
            await message.edit({
                components: []
            }).catch(() => {});
        }
    }

    if (session.role_id) {
        const role =
            await guild.roles.fetch(session.role_id).catch(() => null);

        if (role && role.editable) {
            await role.delete("Scheduled session ended").catch(() => {});
        }
    }

    await db.run(
        `DELETE FROM scheduled_sessions WHERE session_id = ?`,
        [session.session_id]
    );
}

async function cleanupExpiredSessions(client = clientRef) {
    if (!client) return;

    const rows =
        await db.all(
            `
            SELECT *
            FROM scheduled_sessions
            WHERE starts_at <= ?
            `,
            [Date.now() - CLEANUP_GRACE_MS]
        );

    for (const row of rows) {
        await cleanupSession(client, row);
    }
}

function startScheduleSessionCleanup(client) {
    clientRef = client;

    if (interval) clearInterval(interval);

    cleanupExpiredSessions(client).catch(err => {
        console.error("schedule cleanup error:", err);
    });

    interval =
        setInterval(
            () => {
                cleanupExpiredSessions(client).catch(err => {
                    console.error("schedule cleanup error:", err);
                });
            },
            CLEANUP_CHECK_MS
        );
}

function canManageSessions(interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

module.exports = {
    buildSessionButtons,
    buildSessionEmbed,
    canManageSessions,
    createSession,
    handleSessionButton,
    parseDateTime,
    startScheduleSessionCleanup
};
