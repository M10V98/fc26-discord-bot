const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const eaApi = require("./eaApi");
const db = require("../Utils/db");

const archetypes = require("../Utils/archetypes");

const {
    formatScoreboard
} = require("../Utils/scoreboard");

const {
    processMatchXP
} = require("./processMatchXP");

const {
    generateMatchInfographic
} = require("./matchInfographic");

const activeGuilds = new Map();

const CHECK_INTERVAL_MS = 60 * 1000;
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

function buildStopButtonRow(guildId) {

    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`automode_stop:${guildId}`)
                .setLabel("Stop AutoMode")
                .setStyle(ButtonStyle.Danger)
        );
}

function getResult(home, away) {

    return Number(home.goals) > Number(away.goals)
        ? "Win"
        : Number(home.goals) < Number(away.goals)
        ? "Loss"
        : "Draw";
}

function buildFallbackEmbed(match) {

    const clubs = match.match_data?.clubs || {};
    const teams = Object.entries(clubs);

    if (teams.length < 2) {
        return null;
    }

    const home = {
        clubId: teams[0][0],
        ...teams[0][1]
    };

    const away = {
        clubId: teams[1][0],
        ...teams[1][1]
    };

    const playerLines =
        Object.entries(match.player_data || {})
            .map(([name, p]) => {

                const archetype =
                    archetypes[p.archetypeid] ||
                    "Unknown";

                const cleanSheet =
                    p.cleansheetsdef === "1" ||
                    p.cleansheetsgk === "1";

                const mom =
                    p.mom === "1"
                        ? "MOTM "
                        : "";

                return (
                    `${mom}**${name}** (${archetype})\n` +
                    `Rating ${p.rating} | Goals ${p.goals} | Assists ${p.assists}\n` +
                    `${p.passesmade}/${p.passattempts} passes\n` +
                    `${p.tacklesmade}/${p.tackleattempts} tackles\n` +
                    `${p.interceptions} interceptions\n` +
                    `${p.dribbles} dribbles\n` +
                    `${cleanSheet ? "Clean Sheet" : "No CS"}`
                );
            });

    return new EmbedBuilder()
        .setColor("#00ff99")
        .setTitle(`${match.match_type}`)
        .setDescription(
            `${formatScoreboard(home, away)}\n\n${getResult(home, away)}`
        )
        .addFields({
            name: "Player Performances",
            value:
                playerLines.join("\n\n").slice(0, 1024) ||
                "No player stats found."
        })
        .setFooter({
            text: `Match ID: ${match.id}`
        })
        .setTimestamp();
}

async function ensureMatchProcessed(match, guildId) {

    const processed =
        await db.get(
            `SELECT * FROM processed_matches
             WHERE match_id = ?`,
            [match.id]
        );

    if (processed) {
        return false;
    }

    await processMatchXP(match, guildId);

    return true;
}

async function sendMatchPost(guildId, channel, match) {

    const infographic =
        await generateMatchInfographic(match);

    const components = [
        buildStopButtonRow(guildId)
    ];

    if (infographic) {

        const attachment =
            new AttachmentBuilder(
                infographic,
                {
                    name: `match-${match.id}.png`
                }
        );

        await channel.send({
            files: [attachment],
            components
        });

        return;
    }

    const embed = buildFallbackEmbed(match);

    await channel.send({
        content: embed
            ? undefined
            : `Match ID: ${match.id}`,
        embeds: embed ? [embed] : [],
        components
    });
}

async function updateAutoModeState(guildId, fields) {

    const sets = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
        sets.push(`${key} = ?`);
        values.push(value);
    }

    if (!sets.length) {
        return;
    }

    values.push(guildId);

    await db.run(
        `UPDATE automode
         SET ${sets.join(", ")}
         WHERE guild_id = ?`,
        values
    );
}

async function stopAutoMode(guildId, options = {}) {

    const existing = activeGuilds.get(guildId);

    if (existing) {
        clearInterval(existing.interval);
        activeGuilds.delete(guildId);
    }

    await db.run(
        `DELETE FROM automode
         WHERE guild_id = ?`,
        [guildId]
    );

    if (options.channel && options.reason) {
        await options.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("AutoMode Stopped")
                    .setDescription(options.reason)
            ]
        });
    }
}

async function syncGuild(guildId, channel, options = {}) {

    try {

        const row = await db.get(
            `
            SELECT automode.*, clubs.club_id
            FROM automode
            JOIN clubs ON clubs.guild_id = automode.guild_id
            WHERE automode.guild_id = ?
            `,
            [guildId]
        );

        if (!row) {
            console.log(
                `AutoMode skipped for ${guildId}: no linked club or automode row`
            );
            return {
                status: "no_club"
            };
        }

        const now = Date.now();
        const lastActivityAt =
            Number(row.last_activity_at || row.started_at || now);

        if (
            !options.forcePostLatest &&
            now - lastActivityAt >= INACTIVITY_LIMIT_MS
        ) {
            await stopAutoMode(guildId, {
                channel,
                reason:
                    "Stopped automatically after 30 minutes with no new match from the backend."
            });
            return {
                status: "stopped_inactive"
            };
        }

        const matches =
            await eaApi.getMatches(
                row.club_id,
                { forceRefresh: true }
            );

        if (!matches?.length) {
            console.log(
                `AutoMode skipped for ${guildId}: backend returned no matches for club ${row.club_id}`
            );
            return {
                status: "no_matches"
            };
        }

        const latestMatch = matches[0];
        const latestMatchId = String(latestMatch.id);
        const lastPostedMatchId =
            row.last_match_id
                ? String(row.last_match_id)
                : null;

        const shouldPost =
            options.forcePostLatest ||
            latestMatchId !== lastPostedMatchId;

        if (!shouldPost) {
            return {
                status: "not_new",
                matchId: latestMatchId
            };
        }

        await ensureMatchProcessed(
            latestMatch,
            guildId
        );

        await sendMatchPost(
            guildId,
            channel,
            latestMatch
        );

        await updateAutoModeState(
            guildId,
            {
                last_match_id: latestMatchId,
                last_activity_at: now
            }
        );

        console.log(
            `Synced match ${latestMatch.id}`
        );

        return {
            status: "posted",
            matchId: latestMatchId
        };

    } catch (err) {

        console.error(
            "sync error:",
            err
        );

        return {
            status: "error",
            error: err
        };
    }
}

function startAutoMode(
    guildId,
    channel,
    options = {}
) {

    const existing = activeGuilds.get(guildId);

    if (existing) {
        clearInterval(existing.interval);
    }

    console.log(
        `AutoMode started for ${guildId}`
    );

    const firstSync =
        syncGuild(
        guildId,
        channel,
        { forcePostLatest: Boolean(options.postLatest) }
    );

    const interval = setInterval(() => {

        syncGuild(
            guildId,
            channel
        );

    }, CHECK_INTERVAL_MS);

    activeGuilds.set(
        guildId,
        {
            interval,
            channelId: channel.id
        }
    );

    return firstSync;
}

module.exports = {
    buildStopButtonRow,
    startAutoMode,
    stopAutoMode
};
