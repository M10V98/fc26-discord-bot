const {
    AttachmentBuilder,
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

async function syncGuild(guildId, channel) {

    try {

        const row = await db.get(
            `SELECT club_id FROM clubs WHERE guild_id = ?`,
            [guildId]
        );

        if (!row) return;

        const matches =
            await eaApi.getMatches(row.club_id);

        if (!matches?.length) return;

        const latestMatch = matches[0];

        const processed =
            await db.get(
                `SELECT * FROM processed_matches
                 WHERE match_id = ?`,
                [latestMatch.id]
            );

        if (processed) return;

        await processMatchXP(
            latestMatch,
            guildId
        );

        const clubs =
            latestMatch.match_data?.clubs || {};

        const teams =
            Object.entries(clubs);

        if (teams.length < 2) return;

        const home = {
            clubId: teams[0][0],
            ...teams[0][1]
        };

        const away = {
            clubId: teams[1][0],
            ...teams[1][1]
        };

        const scoreboard =
            formatScoreboard(home, away);

        const result =
            Number(home.goals) >
            Number(away.goals)
            ? "✅ Win"
            : Number(home.goals) <
              Number(away.goals)
            ? "❌ Loss"
            : "🤝 Draw";

        const playerLines =
            Object.entries(
                latestMatch.player_data || {}
            )
            .map(([name, p]) => {

                const archetype =
                    archetypes[p.archetypeid]
                    || "Unknown";

                const cleanSheet =
                    p.cleansheetsdef === "1" ||
                    p.cleansheetsgk === "1";

                const mom =
                    p.mom === "1"
                    ? "🏅 "
                    : "";

                return (
                    `${mom}**${name}** (${archetype})\n` +
                    `⭐ ${p.rating} | ⚽ ${p.goals} | 🅰️ ${p.assists}\n` +
                    `🎯 ${p.passesmade}/${p.passattempts} passes\n` +
                    `🛡️ ${p.tacklesmade}/${p.tackleattempts} tackles\n` +
                    `🧠 ${p.interceptions} interceptions\n` +
                    `🔄 ${p.dribbles} dribbles\n` +
                    `🥅 ${cleanSheet ? "Clean Sheet" : "No CS"}`
                );

            });

        const embed = new EmbedBuilder()
            .setColor("#00ff99")
            .setTitle(
                `📊 ${latestMatch.match_type}`
            )
            .setDescription(
                `${scoreboard}\n\n${result}`
            )
            .addFields({
                name: "Player Performances",
                value:
                    playerLines.join("\n\n")
                    .slice(0, 1024)
            })
            .setFooter({
                text:
                    `Match ID: ${latestMatch.id}`
            })
            .setTimestamp();

        const infographic =
            await generateMatchInfographic(latestMatch);

        if (infographic) {

            const attachment =
                new AttachmentBuilder(
                    infographic,
                    {
                        name:
                            `match-${latestMatch.id}.png`
                    }
                );

            await channel.send({
                files: [attachment]
            });

        } else {

            await channel.send({
                embeds: [embed]
            });
        }

        console.log(
            `✅ Synced match ${latestMatch.id}`
        );

    } catch (err) {

        console.error(
            "❌ sync error:",
            err
        );
    }
}

function startAutoMode(
    guildId,
    channel
) {

    if (activeGuilds.has(guildId)) {
        return;
    }

    console.log(
        `🔥 AutoMode started for ${guildId}`
    );

    syncGuild(guildId, channel);

    const interval = setInterval(() => {

        syncGuild(
            guildId,
            channel
        );

    }, 60 * 1000);

    activeGuilds.set(
        guildId,
        interval
    );
}

module.exports = {
    startAutoMode
};
