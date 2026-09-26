const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const db = require("../Utils/db");
const {
    FOOTER,
    escapeMarkdown,
    underline
} = require("../Utils/embedStyle");
const {
    getGuildSettings
} = require("./settingsService");
const { canUseAdminCommands } = require("../Utils/permissions");
const {
    FORMATIONS,
    recommendLineup,
    renderLineupPng
} = require("./recommendedLineup");

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

function parseDurationMinutes(input) {
    const raw = String(input || "").trim().toLowerCase();

    if (!raw) return null;

    if (/^\d+(?:\.\d+)?$/.test(raw)) {
        const hours = Number(raw);
        return hours > 0 ? Math.round(hours * 60) : null;
    }

    const normalized = raw
        .replace(/hours?|hrs?/g, "h")
        .replace(/minutes?|mins?/g, "m")
        .replace(/\s+/g, "");
    const match = normalized.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/);

    if (!match || (!match[1] && !match[2])) return null;

    const minutes = Math.round(
        Number(match[1] || 0) * 60 + Number(match[2] || 0)
    );

    return minutes > 0 ? minutes : null;
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
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`session_more_options:${sessionId}`)
                    .setLabel("More Options")
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
    const durationMinutes = parseDurationMinutes(options.durationText);
    const endsAt = startsAt && durationMinutes
        ? startsAt + durationMinutes * 60 * 1000
        : null;

    if (!startsAt) {
        throw new Error("I could not understand that time/date. Try `2026-06-01 20:00` or `01/06/2026 20:00`.");
    }

    if (!loadUpAt) {
        throw new Error("I could not understand the load-up time. Try `19:45`, `7.45pm`, or `1945`.");
    }

    if (!durationMinutes) {
        throw new Error("I could not understand the event duration. Try `3 hours`, `2h 30m`, or `180 minutes`.");
    }

    if (loadUpAt >= startsAt) {
        throw new Error("Load-up time must be before kick-off time.");
    }

    if (startsAt <= Date.now()) {
        throw new Error("That kick-off time is in the past.");
    }

    if (loadUpAt <= Date.now()) {
        throw new Error("That load-up time is in the past.");
    }

    const sessionId =
        `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const club =
        await db.get(
            `SELECT * FROM clubs WHERE guild_id = ?`,
            [interaction.guild.id]
        );
    const savedClub =
        club
            ? await db.get(
                `SELECT club_name FROM guild_clubs
                 WHERE guild_id = ? AND club_id = ?`,
                [interaction.guild.id, club.club_id]
            )
            : null;
    const clubName =
        savedClub?.club_name
            ? savedClub.club_name
            : interaction.guild.name;
    // Do not make session creation wait for EA. The API can take tens of
    // seconds to respond or retry, which leaves Discord showing “thinking”.
    const crestUrl = null;
    const roleName =
        `${String(options.league || "League").trim()} Match Squad`.slice(0, 100);
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
    session.message_id = message.id;

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

    // Invitations run in the background so a large server never leaves the
    // creator waiting on Discord while individual DMs are delivered.
    notifySessionMembers(interaction.guild, session, [
        ...interaction.guild.members.cache.values()
    ]).catch(err => console.error("scheduled session invite error:", err));

    return {
        sessionId,
        role,
        message
    };
}

function sessionUrl(session) {
    return `https://discord.com/channels/${session.guild_id}/${session.channel_id}/${session.message_id}`;
}

async function sendSessionInvite(member, session) {
    if (!member || member.user?.bot || !session.message_id) return false;
    const inserted = await db.run(
        `INSERT OR IGNORE INTO scheduled_session_notices
         (session_id, user_id, notice_type, sent_at) VALUES (?, ?, 'invite', ?)`,
        [session.session_id, member.id, Date.now()]
    );
    if (!inserted.changes) return false;

    await member.send(
        `Hi! **${session.title || session.league || "A club session"}** has been scheduled. ` +
        `Please set your availability here: ${sessionUrl(session)}`
    ).catch(() => null);
    return true;
}

async function notifySessionMembers(guild, session, members) {
    await Promise.allSettled(
        members.map(member => sendSessionInvite(member, session))
    );
}

async function notifyMemberOfActiveSessions(member) {
    if (!member?.guild || member.user?.bot) return 0;
    const sessions = await db.all(
        `SELECT * FROM scheduled_sessions
         WHERE guild_id = ? AND COALESCE(ends_at, starts_at) > ?`,
        [member.guild.id, Date.now()]
    );
    let sent = 0;
    for (const session of sessions) {
        if (await sendSessionInvite(member, session)) sent += 1;
    }
    return sent;
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

async function getAdminSession(interaction, prefix) {
    if (!canManageSessions(interaction)) {
        await interaction.reply({
            content: "Only server administrators or Managers can use this event control.",
            ephemeral: true
        });
        return null;
    }

    const sessionId =
        interaction.customId.slice(prefix.length);
    const session =
        await db.get(
            `SELECT * FROM scheduled_sessions WHERE session_id = ? AND guild_id = ?`,
            [sessionId, interaction.guild.id]
        );

    if (!session) {
        await interaction.reply({
            content: "This scheduled event no longer exists.",
            ephemeral: true
        });
        return null;
    }

    return session;
}

function buildMoreOptionsMenu(sessionId) {
    return new StringSelectMenuBuilder()
        .setCustomId(`session_more_action:${sessionId}`)
        .setPlaceholder("Choose an event option")
        .addOptions(
            {
                label: "Recommended XI",
                value: "lineup",
                description: "Create a recommended lineup"
            },
            {
                label: "Edit Event",
                value: "edit",
                description: "Edit the title, league, date, and times"
            },
            {
                label: "Make Recurring",
                value: "recurring",
                description: "Set repeat, posting, and cleanup timings"
            },
            {
                label: "Delete Event",
                value: "delete",
                description: "Delete the event and Match Squad role"
            }
        );
}

function buildRecurringModal(session) {
    return new ModalBuilder()
        .setCustomId(`session_recurring_submit:${session.session_id}`)
        .setTitle("Recurring Event Settings")
        .addComponents(
            modalInput("repeat_days", "Repeat every (days)", session.recurrence_days || "7"),
            modalInput("post_before", "Post next event before (hours/days)", formatRecurringDelay(session.recurrence_post_minutes, "1 day")),
            modalInput("delete_after", "Delete event after it ends (hours/days)", formatRecurringDelay(session.recurrence_delete_minutes, "1 hour"))
        );
}

async function handleMoreOptionsButton(interaction) {
    const session =
        await getAdminSession(interaction, "session_more_options:");

    if (!session) return;

    return interaction.reply({
        content: "Event options",
        components: [
            new ActionRowBuilder()
                .addComponents(buildMoreOptionsMenu(session.session_id))
        ],
        ephemeral: true
    });
}

function londonValue(timestamp, options) {
    return new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: SESSION_TIME_ZONE,
            ...options
        }
    ).format(new Date(Number(timestamp)));
}

function modalInput(customId, label, value) {
    return new ActionRowBuilder()
        .addComponents(
            new TextInputBuilder()
                .setCustomId(customId)
                .setLabel(label)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(String(value || "").slice(0, 100))
        );
}

function buildEditSessionModal(session) {
    const date =
        londonValue(
            session.starts_at,
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        );
    const time = timestamp =>
        londonValue(
            timestamp,
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        );

    return new ModalBuilder()
        .setCustomId(`session_edit_submit:${session.session_id}`)
        .setTitle("Edit Scheduled Event")
        .addComponents(
            modalInput("title", "Event title", session.title),
            modalInput("league", "League or competition", session.league),
            modalInput("date", "Date (DD/MM/YYYY)", date),
            modalInput(
                "times",
                "Load up | Kick-off | Duration",
                `${time(session.load_up_at)} | ${time(session.starts_at)} | ${Math.round((session.ends_at - session.starts_at) / 60000)} minutes`
            )
        );
}

async function deleteSessionFromInteraction(interaction, session) {
    if (interaction.isStringSelectMenu()) {
        await interaction.update({
            content: "Deleting scheduled event...",
            components: []
        });
    } else {
        await interaction.reply({
            content: "Deleting scheduled event...",
            ephemeral: true
        });
    }

    if (session.role_id) {
        const role =
            await interaction.guild.roles.fetch(session.role_id).catch(() => null);
        if (role?.editable) {
            await role.delete("Scheduled event deleted by administrator").catch(() => null);
        }
    }

    await db.run(
        `DELETE FROM scheduled_sessions WHERE session_id = ?`,
        [session.session_id]
    );
    await db.run(
        `DELETE FROM scheduled_session_notices WHERE session_id = ?`,
        [session.session_id]
    );

    const channel =
        await interaction.guild.channels.fetch(session.channel_id).catch(() => null);
    const message =
        channel && session.message_id
            ? await channel.messages.fetch(session.message_id).catch(() => null)
            : null;

    await message?.delete().catch(() => null);

    return interaction.editReply("Scheduled event, reminders, and Match Squad role deleted.");
}

async function handleMoreOptionsAction(interaction) {
    const session =
        await getAdminSession(interaction, "session_more_action:");

    if (!session) return;

    const action =
        interaction.values[0];

    if (action === "edit") {
        return interaction.showModal(
            buildEditSessionModal(session)
        );
    }

    if (action === "delete") {
        return deleteSessionFromInteraction(interaction, session);
    }

    if (action === "recurring") {
        return interaction.showModal(buildRecurringModal(session));
    }

    const select =
        new StringSelectMenuBuilder()
            .setCustomId(`session_lineup_formation:${session.session_id}`)
            .setPlaceholder("Choose the formation")
            .addOptions(
                Object.keys(FORMATIONS).map(formation => ({
                    label: formation,
                    value: formation
                }))
            );

    return interaction.update({
        content: "Choose a formation for the recommended XI.",
        components: [
            new ActionRowBuilder().addComponents(select)
        ]
    });
}

function readWholeNumber(interaction, field, minimum, maximum) {
    const value = Number(interaction.fields.getTextInputValue(field).trim());
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${field.replace("_", " ")} must be a whole number from ${minimum} to ${maximum}.`);
    }
    return value;
}

function formatRecurringDelay(minutes, fallback) {
    if (minutes === null || minutes === undefined || minutes === "") {
        return fallback;
    }
    const value = Number(minutes);
    if (!Number.isFinite(value) || value < 0) return fallback;
    if (value > 0 && value % 1440 === 0) {
        return `${value / 1440} day${value === 1440 ? "" : "s"}`;
    }
    if (value % 60 === 0) {
        return `${value / 60} hour${value === 60 ? "" : "s"}`;
    }
    return `${value} minutes`;
}

function readRecurringDelay(interaction, field, minimumMinutes) {
    const raw = interaction.fields.getTextInputValue(field).trim().toLowerCase();
    const match = raw.match(/^(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|days?|d)?$/);

    if (!match) {
        throw new Error(`${field.replaceAll("_", " ")} must be a number of hours or days, for example \`12 hours\` or \`1 day\`.`);
    }

    const amount = Number(match[1]);
    const unit = match[2] || "hours";
    const minutes = Math.round(amount * (/^d/.test(unit) ? 1440 : 60));

    if (!Number.isFinite(minutes) || minutes < minimumMinutes || minutes > 10080) {
        throw new Error(`${field.replaceAll("_", " ")} must be between ${minimumMinutes ? "1 hour" : "0 hours"} and 7 days.`);
    }

    return minutes;
}

async function handleRecurringSessionModal(interaction) {
    const session = await getAdminSession(interaction, "session_recurring_submit:");
    if (!session) return;

    try {
        const repeatDays = readWholeNumber(interaction, "repeat_days", 1, 365);
        const postBefore = readRecurringDelay(interaction, "post_before", 60);
        const deleteAfter = readRecurringDelay(interaction, "delete_after", 0);
        const nextAt = Number(session.starts_at) + repeatDays * 24 * 60 * 60 * 1000;

        await db.run(
            `UPDATE scheduled_sessions
             SET recurrence_days = ?, recurrence_post_minutes = ?,
                 recurrence_delete_minutes = ?, next_recurrence_at = ?
             WHERE session_id = ?`,
            [repeatDays, postBefore, deleteAfter, nextAt, session.session_id]
        );
        return interaction.reply({
            content: `This event will repeat every ${repeatDays} day(s). The next event will post ${formatRecurringDelay(postBefore)} before kick-off and each event will be removed ${formatRecurringDelay(deleteAfter)} after it ends.`,
            ephemeral: true
        });
    } catch (err) {
        return interaction.reply({ content: err.message, ephemeral: true });
    }
}

async function createRecurringSession(client, source) {
    const guild = await client.guilds.fetch(source.guild_id).catch(() => null);
    const channel = guild && await guild.channels.fetch(source.channel_id).catch(() => null);
    if (!guild || !channel) return;
    const intervalMs = Number(source.recurrence_days) * 24 * 60 * 60 * 1000;
    const startsAt = Number(source.next_recurrence_at);
    const sessionId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const role = await guild.roles.create({
        name: `${source.league || "League"} Match Squad`.slice(0, 100),
        mentionable: true,
        reason: `Recurring scheduled session ${sessionId}`
    });
    const session = {
        ...source,
        session_id: sessionId,
        role_id: role.id,
        message_id: null,
        starts_at: startsAt,
        load_up_at: startsAt - (Number(source.starts_at) - Number(source.load_up_at)),
        ends_at: startsAt + (Number(source.ends_at) - Number(source.starts_at)),
        next_recurrence_at: startsAt + intervalMs,
        pre_tag_sent_at: null,
        can_play: "[]",
        cannot_play: "[]",
        maybe_play: "[]",
        created_at: Date.now()
    };
    const message = await channel.send({
        embeds: [buildSessionEmbed(session, guild)],
        components: buildSessionButtons(sessionId)
    });
    session.message_id = message.id;
    await db.run(`INSERT INTO scheduled_sessions
        (session_id,guild_id,channel_id,message_id,role_id,creator_id,title,time_text,load_up_text,league,crest_url,load_up_at,ends_at,pre_tag_minutes,pre_tag_sent_at,starts_at,can_play,cannot_play,maybe_play,recurrence_days,recurrence_post_minutes,recurrence_delete_minutes,next_recurrence_at,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [session.session_id,session.guild_id,session.channel_id,session.message_id,session.role_id,session.creator_id,session.title,session.time_text,session.load_up_text,session.league,session.crest_url,session.load_up_at,session.ends_at,session.pre_tag_minutes,null,session.starts_at,"[]","[]","[]",session.recurrence_days,session.recurrence_post_minutes,session.recurrence_delete_minutes,session.next_recurrence_at,session.created_at]);
    await db.run(`UPDATE scheduled_sessions SET recurrence_days = NULL, recurrence_post_minutes = NULL, recurrence_delete_minutes = NULL, next_recurrence_at = NULL WHERE session_id = ?`, [source.session_id]);
    guild.members.fetch()
        .then(members => notifySessionMembers(guild, session, [...members.values()]))
        .catch(err => console.error("recurring session invite error:", err));
}

async function handleRecommendedXiButton(interaction) {
    const session =
        await getAdminSession(interaction, "session_recommended_xi:");

    if (!session) return;

    const select =
        new StringSelectMenuBuilder()
            .setCustomId(`session_lineup_formation:${session.session_id}`)
            .setPlaceholder("Choose the formation")
            .addOptions(
                Object.keys(FORMATIONS).map(formation => ({
                    label: formation,
                    value: formation
                }))
            );

    return interaction.reply({
        content: "Choose a formation for the recommended XI.",
        components: [
            new ActionRowBuilder().addComponents(select)
        ],
        ephemeral: true
    });
}

async function handleLineupFormationSelect(interaction) {
    const session =
        await getAdminSession(interaction, "session_lineup_formation:");

    if (!session) return;

    await interaction.deferUpdate();

    const formation =
        interaction.values[0];
    const lineup =
        await recommendLineup(interaction.guild, session, formation);
    const png =
        await renderLineupPng(
            lineup,
            formation,
            session.title || `${session.league} Match Squad`
        );
    const unfilled =
        lineup.selected.filter(slot => !slot.player).length;

    return interaction.editReply({
        content:
            `Recommended from ${lineup.candidateCount} eligible linked player(s), weighted 70% to the latest ${lineup.recentMatchCount} combined COMP matches and 30% to all tracked COMP matches.${unfilled ? ` ${unfilled} position(s) could not be filled from player position roles.` : ""}`,
        components: [],
        files: [
            new AttachmentBuilder(png, {
                name: `recommended-xi-${formation}.png`
            })
        ]
    });
}

async function handleDeleteSessionButton(interaction) {
    const session =
        await getAdminSession(interaction, "session_delete:");

    if (!session) return;

    return deleteSessionFromInteraction(interaction, session);
}

async function handleEditSessionModal(interaction) {
    const session =
        await getAdminSession(interaction, "session_edit_submit:");

    if (!session) return;

    const title =
        interaction.fields.getTextInputValue("title").trim();
    const league =
        interaction.fields.getTextInputValue("league").trim();
    const date =
        interaction.fields.getTextInputValue("date").trim();
    const times =
        interaction.fields.getTextInputValue("times")
            .split("|")
            .map(value => value.trim());

    if (times.length !== 3 || times.some(value => !value)) {
        return interaction.reply({
            content: "Enter values as `Load up | Kick-off | Duration`, for example `22:30 | 23:00 | 3 hours`.",
            ephemeral: true
        });
    }

    const [loadUpTime, kickoffTime, durationText] = times;
    const loadUpAt = parseDateTime(`${date} ${loadUpTime}`);
    const startsAt = parseDateTime(`${date} ${kickoffTime}`);
    const durationMinutes = parseDurationMinutes(durationText);
    const endsAt = startsAt && durationMinutes
        ? startsAt + durationMinutes * 60 * 1000
        : null;

    if (!loadUpAt || !startsAt || !endsAt) {
        return interaction.reply({
            content: "I could not understand the edited date, times, or duration. Use `DD/MM/YYYY`, `HH:MM`, and a duration such as `3 hours`.",
            ephemeral: true
        });
    }

    if (loadUpAt >= startsAt) {
        return interaction.reply({
            content: "Load up must be before kick-off.",
            ephemeral: true
        });
    }

    if (loadUpAt <= Date.now()) {
        return interaction.reply({
            content: "The edited load-up time must be in the future.",
            ephemeral: true
        });
    }

    await interaction.deferReply({
        ephemeral: true
    });

    const updated = {
        ...session,
        title,
        league,
        time_text: `${date} ${kickoffTime}`,
        load_up_text: `${date} ${loadUpTime}`,
        load_up_at: loadUpAt,
        starts_at: startsAt,
        ends_at: endsAt,
        pre_tag_sent_at: null
    };

    await db.run(
        `
        UPDATE scheduled_sessions
        SET title = ?,
            league = ?,
            time_text = ?,
            load_up_text = ?,
            load_up_at = ?,
            starts_at = ?,
            ends_at = ?,
            pre_tag_sent_at = NULL
        WHERE session_id = ?
        `,
        [
            title,
            league,
            updated.time_text,
            updated.load_up_text,
            loadUpAt,
            startsAt,
            endsAt,
            session.session_id
        ]
    );

    if (session.role_id) {
        const role =
            await interaction.guild.roles.fetch(session.role_id).catch(() => null);

        if (role?.editable) {
            await role.setName(
                `${league || "League"} Match Squad`.slice(0, 100),
                "Scheduled event edited"
            ).catch(() => null);
        }
    }

    const channel =
        await interaction.guild.channels.fetch(session.channel_id).catch(() => null);
    const message =
        channel && session.message_id
            ? await channel.messages.fetch(session.message_id).catch(() => null)
            : null;

    await message?.edit({
        embeds: [
            buildSessionEmbed(updated, interaction.guild)
        ],
        components: buildSessionButtons(session.session_id)
    }).catch(() => null);

    return interaction.editReply("Scheduled event updated.");
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
    await sendAvailabilityReminders(client);

    const recurring = await db.all(`SELECT * FROM scheduled_sessions WHERE recurrence_days IS NOT NULL AND next_recurrence_at - recurrence_post_minutes * 60000 <= ?`, [Date.now()]);
    for (const session of recurring) {
        await createRecurringSession(client, session).catch(err => console.error("recurring session error:", err));
    }

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
        if (Date.now() >= Number(row.ends_at || row.starts_at) + Number(row.recurrence_delete_minutes || 0) * 60000) {
            await cleanupSession(client, row);
        }
    }
}

async function sendAvailabilityReminders(client) {
    const now = Date.now();
    const sessions = await db.all(
        `SELECT * FROM scheduled_sessions
         WHERE starts_at > ? AND starts_at <= ?`,
        [now, now + (8 * 60 * 60 * 1000)]
    );

    for (const session of sessions) {
        const channel = await client.channels.fetch(session.channel_id).catch(() => null);
        if (!channel?.send) continue;

        if (!session.response_reminder_sent_at) {
            const responded = new Set([
                ...readList(session.can_play),
                ...readList(session.cannot_play),
                ...readList(session.maybe_play)
            ]);
            const members = await channel.guild.members.fetch().catch(() => null);
            const unanswered = members
                ? [...members.values()]
                    .filter(member => !member.user.bot && !responded.has(member.id))
                    .map(member => `<@${member.id}>`)
                : [];

            if (unanswered.length) {
                const chunks = [];
                for (let index = 0; index < unanswered.length; index += 80) {
                    chunks.push(unanswered.slice(index, index + 80));
                }
                await Promise.all(chunks.map(chunk =>
                    channel.send(
                        `${chunk.join(" ")} please check your availability for **${escapeMarkdown(session.title || session.league || "the upcoming session")}**: ${sessionUrl(session)}`
                    ).catch(() => null)
                ));
            }

            await db.run(
                `UPDATE scheduled_sessions SET response_reminder_sent_at = ? WHERE session_id = ?`,
                [now, session.session_id]
            );
        }

        if (
            !session.maybe_reminder_sent_at &&
            Number(session.starts_at) <= now + (4 * 60 * 60 * 1000)
        ) {
            const maybeIds = readList(session.maybe_play);
            const guild = channel.guild;
            await Promise.allSettled(maybeIds.map(async userId => {
                const member = await guild.members.fetch(userId).catch(() => null);
                await member?.send(
                    `Hi! You are currently marked **Maybe** for **${session.title || session.league || "the upcoming session"}**. ` +
                    `Could you please share an update if you can? The line-up should be out in the next two hours. ` +
                    `${sessionUrl(session)}`
                ).catch(() => null);
            }));
            await db.run(
                `UPDATE scheduled_sessions SET maybe_reminder_sent_at = ? WHERE session_id = ?`,
                [now, session.session_id]
            );
        }
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
            AND COALESCE(load_up_at, starts_at) > ?
            AND (? >= COALESCE(load_up_at, starts_at) - (45 * 60 * 1000))
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
            `<@&${session.role_id}> ${escapeMarkdown(session.title || "Session")} load-up is ${formatRelativeTime(session.load_up_at || session.starts_at)}. Kick-off is ${formatRelativeTime(session.starts_at)}.`
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

async function refreshLiveSessionMessages(client = clientRef) {
    if (!client) return;

    const sessions =
        await db.all(
            `
            SELECT *
            FROM scheduled_sessions
            WHERE COALESCE(ends_at, starts_at) > ?
            `,
            [Date.now()]
        );

    let refreshed = 0;

    for (const session of sessions) {
        const guild =
            await client.guilds.fetch(session.guild_id).catch(() => null);
        const channel =
            guild
                ? await guild.channels.fetch(session.channel_id).catch(() => null)
                : null;
        const message =
            channel && session.message_id
                ? await channel.messages.fetch(session.message_id).catch(() => null)
                : null;

        if (!guild || !message) continue;

        if (session.role_id) {
            const role =
                await guild.roles.fetch(session.role_id).catch(() => null);

            if (role?.editable) {
                await role.setName(
                    `${session.league || "League"} Match Squad`.slice(0, 100),
                    "Refresh live scheduled event"
                ).catch(() => null);
            }
        }

        await message.edit({
            embeds: [
                buildSessionEmbed(session, guild)
            ],
            components: buildSessionButtons(session.session_id)
        }).catch(() => null);
        refreshed += 1;
    }

    if (refreshed) {
        console.log(`Refreshed ${refreshed} live scheduled event message(s).`);
    }
}

async function removeMemberFromScheduledSessions(member) {
    const guild = member?.guild;
    const userId = member?.id;

    if (!guild?.id || !userId) return 0;

    const sessions =
        await db.all(
            `
            SELECT *
            FROM scheduled_sessions
            WHERE guild_id = ?
            AND COALESCE(ends_at, starts_at) > ?
            `,
            [
                guild.id,
                Date.now()
            ]
        );

    let updatedCount = 0;

    for (const session of sessions) {
        const originalCanPlay = readList(session.can_play);
        const originalCannotPlay = readList(session.cannot_play);
        const originalMaybePlay = readList(session.maybe_play);
        const canPlay =
            originalCanPlay.filter(id => id !== userId);
        const cannotPlay =
            originalCannotPlay.filter(id => id !== userId);
        const maybePlay =
            originalMaybePlay.filter(id => id !== userId);
        const wasRemoved =
            canPlay.length !== originalCanPlay.length ||
            cannotPlay.length !== originalCannotPlay.length ||
            maybePlay.length !== originalMaybePlay.length;

        if (!wasRemoved) continue;

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
                session.session_id
            ]
        );

        const channel =
            await guild.channels.fetch(session.channel_id).catch(() => null);
        const message =
            channel && session.message_id
                ? await channel.messages.fetch(session.message_id).catch(() => null)
                : null;

        await message?.edit({
            embeds: [
                buildSessionEmbed(updated, guild)
            ],
            components: buildSessionButtons(session.session_id)
        }).catch(() => null);

        updatedCount += 1;
    }

    return updatedCount;
}

function startScheduleSessionCleanup(client) {
    clientRef = client;

    if (interval) clearInterval(interval);

    cleanupExpiredSessions(client).catch(err => {
        console.error("schedule cleanup error:", err);
    });
    refreshLiveSessionMessages(client).catch(err => {
        console.error("schedule live-message refresh error:", err);
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
    return canUseAdminCommands(interaction);
}

module.exports = {
    buildSessionButtons,
    buildSessionEmbed,
    canManageSessions,
    createSession,
    handleDeleteSessionButton,
    handleEditSessionModal,
    handleLineupFormationSelect,
    handleMoreOptionsAction,
    handleMoreOptionsButton,
    handleRecurringSessionModal,
    handleRecommendedXiButton,
    handleSessionButton,
    parseDateTime,
    parseDurationMinutes,
    refreshLiveSessionMessages,
    notifyMemberOfActiveSessions,
    removeMemberFromScheduledSessions,
    startScheduleSessionCleanup
};
