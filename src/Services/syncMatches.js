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
    formatScoreboard,
    getClubName
} = require("../Utils/scoreboard");
const {
    buildLinkedMaps,
    displayName,
    getLinkedRows
} = require("../Utils/embedStyle");
const {
    saves: saveCount
} = require("../Utils/apiStats");
const {
    enrichPlayerStats,
    hasAnyEventAggregateData
} = require("../Utils/matchEvents");

const {
    processMatchXP
} = require("./processMatchXP");

const {
    generateMatchInfographic
} = require("./matchInfographic");

const activeGuilds = new Map();
const syncingGuilds = new Set();

const CHECK_INTERVAL_MS =
    Math.max(
        30 * 1000,
        Number(process.env.AUTOMODE_CHECK_INTERVAL_MS || 2 * 60 * 1000)
    );
const SYNC_FETCH_COUNT =
    Math.max(
        5,
        Number(process.env.AUTOMODE_FETCH_COUNT || 10)
    );
const INACTIVITY_LIMIT_MS =
    Math.max(
        45 * 60 * 1000,
        Number(process.env.AUTOMODE_INACTIVITY_LIMIT_MS || 90 * 60 * 1000)
    );
const DIAGNOSTIC_INTERVAL_MS =
    10 * 60 * 1000;

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

async function buildFallbackEmbed(match, ourClubId, guildId) {

    const clubsObj = match.clubs || {};
    const clubIds = Object.keys(clubsObj);

    if (clubIds.length < 2) {
        return null;
    }

    const ourId = String(ourClubId || clubIds[0]);
    const oppId = clubIds.find(id => id !== ourId) || clubIds[1];

    const home = {
        clubId: ourId,
        ...clubsObj[ourId]
    };

    const away = {
        clubId: oppId,
        ...clubsObj[oppId]
    };

    const ourPlayers =
        match.players?.[ourId] || {};
    const opponentPlayerCount =
        Object.keys(match.players?.[oppId] || {}).length;
    const opponent =
        String(home.clubId) === String(ourId)
            ? away
            : home;
    const hiddenStatsAvailable =
        hasAnyEventAggregateData(ourPlayers);
    const linkedMaps =
        buildLinkedMaps(
            await getLinkedRows(db, guildId)
        );

    const playerLines =
        Object.entries(ourPlayers)
            .map(([playerId, rawPlayer]) => {

                const p =
                    enrichPlayerStats(rawPlayer);

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
                const hiddenLine =
                    hiddenStatsAvailable
                        ? `${p.secondassists || p.secondAssists || 0} second assists | ` +
                            `${p.dribbles || 0} dribbles | ` +
                            `${p.interceptions || 0} interceptions\n`
                        : "";

                return (
                    `${mom}${displayName(p.playername, linkedMaps, playerId)} (${archetype})\n` +
                    `Rating ${p.rating} | Goals ${p.goals} | Assists ${p.assists} | Saves ${saveCount(p)}\n` +
                    `${p.passesmade}/${p.passattempts} passes\n` +
                    `${p.tacklesmade}/${p.tackleattempts} tackles\n` +
                    hiddenLine +
                    `${cleanSheet ? "Clean Sheet" : "No CS"}`
                );
            });

    return new EmbedBuilder()
        .setColor("#00ff99")
        .setTitle(getClubName(home) + " vs " + getClubName(away))
        .setDescription(
            `${formatScoreboard(home, away)}\n\n${getResult(home, away)}` +
            `\n${getClubName(opponent)} had ${opponentPlayerCount} ` +
            `player${opponentPlayerCount === 1 ? "" : "s"}`
        )
        .addFields({
            name: "Player Performances",
            value:
                playerLines.join("\n\n").slice(0, 1024) ||
                "No player stats found."
        })
        .setFooter({
            text: `Match ID: ${match.matchId}`
        })
        .setTimestamp(
            match.timestamp
                ? new Date(Number(match.timestamp) * 1000)
                : null
        );
}

async function ensureMatchProcessed(match, guildId, clubId, overallStats = null) {

    return processMatchXP(match, guildId, {
        clubId,
        overallStats
    });
}

async function sendMatchPost(guildId, channel, match, clubId) {

    let infographic = null;

    try {
        infographic =
            await generateMatchInfographic(match, clubId);
    } catch (err) {
        console.error("infographic error:", err.message);
    }

    const components = [
        buildStopButtonRow(guildId)
    ];

    if (infographic) {

        const attachment =
            new AttachmentBuilder(
                infographic,
                {
                    name: `match-${match.matchId}.png`
                }
        );

        await channel.send({
            files: [attachment],
            components
        });

        return;
    }

    const embed =
        await buildFallbackEmbed(match, clubId, guildId);

    await channel.send({
        content: embed
            ? undefined
            : `Match ID: ${match.matchId}`,
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
            SELECT automode.*, guild_clubs.club_id
            FROM automode
            JOIN guild_clubs
                ON guild_clubs.guild_id = automode.guild_id
                AND guild_clubs.is_default = 1
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
                    "Stopped automatically after 90 minutes with no new match from EA."
            });
            return {
                status: "stopped_inactive"
            };
        }

        const matches =
            await eaApi.getRecentMatches(
                row.club_id,
                {
                    forceRefresh: true,
                    limit: 1,
                    maxResultCount: SYNC_FETCH_COUNT,
                    onFetchError: (matchType, err) => {
                        console.error(
                            `AutoMode ${matchType} fetch failed for guild ${guildId}:`,
                            err?.message || err
                        );
                    }
                }
            );

        if (!matches?.length) {
            console.log(
                `AutoMode skipped for ${guildId}: EA returned no matches for club ${row.club_id}`
            );
            return {
                status: "no_matches"
            };
        }

        const latestMatch = matches[0];
        const overallStats =
            await eaApi.getOverallStats(
                row.club_id,
                {
                    forceRefresh: true
                }
            ).catch(err => {
                console.error(
                    `overall stats fetch failed for guild ${guildId}:`,
                    err
                );
                return null;
            });
        const latestMatchId = String(latestMatch.matchId);
        const lastPostedMatchId =
            row.last_match_id
                ? String(row.last_match_id)
                : null;

        const lastPostedClubId =
            row.last_club_id
                ? String(row.last_club_id)
                : null;
        const currentClubId = String(row.club_id);

        const shouldPost =
            options.forcePostLatest ||
            currentClubId !== lastPostedClubId ||
            latestMatchId !== lastPostedMatchId;

        if (!shouldPost) {
            const active =
                activeGuilds.get(guildId);

            if (
                active &&
                now - Number(active.lastDiagnosticAt || 0) >=
                    DIAGNOSTIC_INTERVAL_MS
            ) {
                active.lastDiagnosticAt = now;

                console.log(
                    `AutoMode waiting for EA for guild ${guildId}: latest remains ${latestMatchId} (${latestMatch.matchType || "unknown"}, ${latestMatch.timestamp || "no timestamp"})`
                );
            }

            return {
                status: "not_new",
                matchId: latestMatchId
            };
        }

        await ensureMatchProcessed(
            latestMatch,
            guildId,
            row.club_id,
            overallStats
        );

        await sendMatchPost(
            guildId,
            channel,
            latestMatch,
            row.club_id
        );

        await updateAutoModeState(
            guildId,
            {
                last_match_id: latestMatchId,
                last_club_id: currentClubId,
                last_activity_at: now
            }
        );

        console.log(
            `Synced match ${latestMatchId}`
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

        if (err?.code === 50001) {
            await stopAutoMode(guildId).catch(stopErr => {
                console.error(
                    "failed to stop inaccessible automode:",
                    stopErr
                );
            });

            return {
                status: "missing_access",
                error: err
            };
        }

        return {
            status: "error",
            error: err
        };
    }
}

async function runGuildSync(guildId, channel, options = {}) {

    if (syncingGuilds.has(guildId)) {
        return {
            status: "busy"
        };
    }

    syncingGuilds.add(guildId);

    try {
        return await syncGuild(guildId, channel, options);
    } finally {
        syncingGuilds.delete(guildId);
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
        runGuildSync(
        guildId,
        channel,
        { forcePostLatest: Boolean(options.postLatest) }
    );

    const interval = setInterval(() => {

        runGuildSync(
            guildId,
            channel
        );

    }, CHECK_INTERVAL_MS);

    activeGuilds.set(
        guildId,
        {
            interval,
            channelId: channel.id,
            lastDiagnosticAt: Date.now()
        }
    );

    return firstSync;
}

module.exports = {
    buildStopButtonRow,
    startAutoMode,
    stopAutoMode
};
