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
const {
    getGuildSettings
} = require("./settingsService");

const CLEANUP_CHECK_MS = 60 * 1000;
const CLEANUP_GRACE_MS = 0;
const SESSION_TIME_ZONE = "Europe/London";
const MONTHS = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12
};

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

function fullYear(value) {
    const year = Number(value);

    return year < 100 ? 2000 + year : year;
}

function isValidDateParts(parts) {
    const date =
        new Date(
            Date.UTC(
                parts.year,
                parts.month - 1,
                parts.day
            )
        );

    return (
        date.getUTCFullYear() === parts.year &&
        date.getUTCMonth() === parts.month - 1 &&
        date.getUTCDate() === parts.day
    );
}

function getTimeZoneOffsetMs(timeZone, utcMs) {
    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }
        )
            .formatToParts(new Date(utcMs))
            .reduce(
                (acc, part) => {
                    acc[part.type] = part.value;
                    return acc;
                },
                {}
            );

    const localAsUtc =
        Date.UTC(
            Number(parts.year),
            Number(parts.month) - 1,
            Number(parts.day),
            Number(parts.hour),
            Number(parts.minute),
            Number(parts.second)
        );

    return localAsUtc - utcMs;
}

function zonedTimeToUtcMs(parts, timeZone = SESSION_TIME_ZONE) {
    const utcGuess =
        Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute
        );
    const offset = getTimeZoneOffsetMs(timeZone, utcGuess);

    return utcGuess - offset;
}

function parseTime(input) {
    const raw =
        String(input || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");

    if (!raw) {
        return {
            hour: 0,
            minute: 0
        };
    }

    let match =
        raw.match(/^(\d{1,2})(?::|\.|h)(\d{2})(?::\d{2})?(am|pm)?$/);

    if (!match) {
        match = raw.match(/^(\d{1,2})(am|pm)$/);
        if (match) {
            match.splice(2, 0, "0");
        }
    }

    if (!match) {
        match = raw.match(/^(\d{1,2})$/);
        if (match) {
            match.splice(2, 0, "0", "");
        }
    }

    if (!match) {
        match = raw.match(/^(\d{1,2})(\d{2})(am|pm)?$/);
    }

    if (!match) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = match[3] || "";

    if (minute > 59) return null;

    if (meridiem) {
        if (hour < 1 || hour > 12) return null;
        if (meridiem === "pm" && hour !== 12) hour += 12;
        if (meridiem === "am" && hour === 12) hour = 0;
    } else if (hour > 23) {
        return null;
    }

    return {
        hour,
        minute
    };
}

function parseDate(input) {
    let raw =
        String(input || "")
            .trim()
            .replace(/,/g, "")
            .replace(/\s+/g, " ");

    if (!raw) return null;

    const relativeDate = parseRelativeDate(raw);
    if (relativeDate) return relativeDate;

    raw =
        raw.replace(
            /^(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s+/i,
            ""
        );

    let match =
        raw.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);

    if (match) {
        const parts = {
            year: Number(match[1]),
            month: Number(match[2]),
            day: Number(match[3])
        };

        return isValidDateParts(parts) ? parts : null;
    }

    match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);

    if (match) {
        const first = Number(match[1]);
        const second = Number(match[2]);
        const parts = {
            year: fullYear(match[3]),
            month: second,
            day: first
        };

        if (first <= 12 && second > 12) {
            parts.month = first;
            parts.day = second;
        }

        return isValidDateParts(parts) ? parts : null;
    }

    match =
        raw.toLowerCase().match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+) (\d{2,4})$/);

    if (match && MONTHS[match[2]]) {
        const parts = {
            year: fullYear(match[3]),
            month: MONTHS[match[2]],
            day: Number(match[1])
        };

        return isValidDateParts(parts) ? parts : null;
    }

    match =
        raw.toLowerCase().match(/^([a-z]+) (\d{1,2})(?:st|nd|rd|th)? (\d{2,4})$/);

    if (match && MONTHS[match[1]]) {
        const parts = {
            year: fullYear(match[3]),
            month: MONTHS[match[1]],
            day: Number(match[2])
        };

        return isValidDateParts(parts) ? parts : null;
    }

    return null;
}

function getLondonDateParts(date = new Date()) {
    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: SESSION_TIME_ZONE,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        )
            .formatToParts(date)
            .reduce(
                (acc, part) => {
                    acc[part.type] = part.value;
                    return acc;
                },
                {}
            );

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day)
    };
}

function addDays(parts, days) {
    const date =
        new Date(
            Date.UTC(
                parts.year,
                parts.month - 1,
                parts.day + days
            )
        );

    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate()
    };
}

function parseRelativeDate(raw) {
    const value = raw.toLowerCase();

    if (value === "today") {
        return getLondonDateParts();
    }

    if (value === "tomorrow") {
        return addDays(getLondonDateParts(), 1);
    }

    return null;
}

function splitDateTime(input) {
    const raw =
        String(input || "")
            .trim()
            .replace(/[T@]/g, " ");

    if (!raw) return null;

    const words = raw.split(/\s+/);

    const match =
        raw.match(
            /^(.+?)\s+(?:at\s+)?(\d{1,2}(?:(?::|\.|h)\d{2})?\s*(?:am|pm)?|\d{3,4})$/i
        );

    if (match) {
        return {
            dateText: match[1],
            timeText: match[2]
        };
    }

    if (words.length > 1) {
        return {
            dateText: words.slice(0, -1).join(" "),
            timeText: words[words.length - 1]
        };
    }

    return {
        dateText: raw,
        timeText: ""
    };
}

function parseDateTime(input) {
    const split = splitDateTime(input);

    if (!split) return null;

    const date = parseDate(split.dateText);
    const time = parseTime(split.timeText);

    if (!date || !time) return null;

    return zonedTimeToUtcMs({
        ...date,
        ...time
    });
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
    const loadUpAt =
        Number(session.load_up_at || 0) ||
        Number(session.starts_at);
    const endsAt =
        Number(session.ends_at || 0) ||
        Number(session.starts_at);
    const title =
        session.title ||
        `${guild?.name || "Club"} Scheduled Session`;

    const embed =
        new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle(`${underline(title)} - Kick-off ${formatRelativeTime(session.starts_at)}`)
        .setDescription(
            [
                `<@${session.creator_id}> has scheduled a Pro Clubs session. Use the buttons below: ✅ (can play), ❌ (cannot), ❔ (maybe).`,
                "",
                "**Load Up**",
                `${formatDiscordTime(loadUpAt)} (${formatRelativeTime(loadUpAt)})`,
                "",
                "**Kick-Off**",
                `${formatDiscordTime(session.starts_at)} (${formatRelativeTime(session.starts_at)})`,
                "",
                "**End**",
                `${formatDiscordTime(endsAt)} (${formatRelativeTime(endsAt)})`,
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
    const loadUpAt =
        options.loadUpTimeText
            ? parseDateTime(options.loadUpTimeText)
            : startsAt;
    const endsAt =
        options.endTimeText
            ? parseDateTime(options.endTimeText)
            : startsAt;

    if (!startsAt) {
        throw new Error("I could not understand that time/date. Try `2026-06-01 20:00` or `01/06/2026 20:00`.");
    }

    if (!loadUpAt) {
        throw new Error("I could not understand the load-up time. Try `19:45`, `7.45pm`, or `1945`.");
    }

    if (!endsAt) {
        throw new Error("I could not understand the end time. Try `22:00`, `10pm`, or `2230`.");
    }

    if (loadUpAt >= startsAt) {
        throw new Error("Load-up time must be before kick-off time.");
    }

    if (endsAt <= startsAt) {
        throw new Error("End time must be after kick-off time.");
    }

    if (startsAt <= Date.now()) {
        throw new Error("That kick-off time is in the past.");
    }

    if (loadUpAt <= Date.now()) {
        throw new Error("That load-up time is in the past.");
    }

    if (endsAt <= Date.now()) {
        throw new Error("That end time is in the past.");
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
    const settings =
        await getGuildSettings(interaction.guild.id);

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
        load_up_text: options.loadUpTimeText,
        league: options.league,
        load_up_at: loadUpAt,
        starts_at: startsAt,
        ends_at: endsAt,
        pre_tag_minutes: settings.schedulePreTagMinutes,
        pre_tag_sent_at: null,
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
            load_up_text,
            league,
            crest_url,
            load_up_at,
            ends_at,
            pre_tag_minutes,
            pre_tag_sent_at,
            starts_at,
            can_play,
            cannot_play,
            maybe_play,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            options.loadUpTimeText,
            options.league,
            crestUrl,
            loadUpAt,
            endsAt,
            settings.schedulePreTagMinutes,
            null,
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

    await sendDuePreTags(client);

    const rows =
        await db.all(
            `
            SELECT *
            FROM scheduled_sessions
            WHERE COALESCE(ends_at, starts_at) <= ?
            `,
            [Date.now() - CLEANUP_GRACE_MS]
        );

    for (const row of rows) {
        await cleanupSession(client, row);
    }
}

async function sendDuePreTags(client) {
    const now =
        Date.now();
    const rows =
        await db.all(
            `
            SELECT *
            FROM scheduled_sessions
            WHERE role_id IS NOT NULL
            AND pre_tag_sent_at IS NULL
            AND starts_at > ?
            AND (? >= starts_at - (COALESCE(pre_tag_minutes, 30) * 60 * 1000))
            `,
            [
                now,
                now
            ]
        );

    for (const session of rows) {
        const guild =
            await client.guilds.fetch(session.guild_id).catch(() => null);
        const channel =
            guild
                ? await guild.channels.fetch(session.channel_id).catch(() => null)
                : null;

        if (!channel) {
            continue;
        }

        await channel.send(
            `<@&${session.role_id}> ${escapeMarkdown(session.title || "Session")} starts ${formatRelativeTime(session.starts_at)}. Load up ${formatRelativeTime(session.load_up_at || session.starts_at)}.`
        ).catch(() => null);

        await db.run(
            `
            UPDATE scheduled_sessions
            SET pre_tag_sent_at = ?
            WHERE session_id = ?
            `,
            [
                now,
                session.session_id
            ]
        );
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
