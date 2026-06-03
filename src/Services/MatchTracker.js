const eaApi = require("./eaApi");
const db = require("../Utils/db");
const {
    buildLinkedMaps,
    displayName,
    getLinkedRows
} = require("../Utils/embedStyle");

const activeTrackers = new Map();

module.exports = function startTracker(client) {
    setInterval(async () => {
        for (const [guildId, tracker] of activeTrackers) {
            try {
                const matches =
                    await eaApi.getRecentMatches(
                        tracker.clubId,
                        { limit: 1 }
                    );

                if (!matches?.length) continue;

                const latest = matches[0];

                if (latest.matchId === tracker.lastMatchId) {
                    continue;
                }

                tracker.lastMatchId = latest.matchId;

                const channel =
                    await client.channels.fetch(tracker.channelId);

                if (!channel) continue;

                const clubId = String(tracker.clubId);
                const clubs = latest.clubs || {};
                const opponentId =
                    Object.keys(clubs).find(id => id !== clubId);

                if (!clubs[clubId] || !clubs[opponentId]) {
                    continue;
                }

                const ourClub = clubs[clubId];
                const opponent = clubs[opponentId];
                const linkedMaps =
                    buildLinkedMaps(
                        await getLinkedRows(db, guildId)
                    );

                const playerText =
                    Object.entries(latest.players?.[clubId] || {})
                        .map(([playerId, stats]) =>
                            `${displayName(stats.playername, linkedMaps, playerId)} | Goals ${stats.goals || 0} | Assists ${stats.assists || 0} | Rating ${stats.rating || "0.0"}`
                        )
                        .join("\n");

                await channel.send({
                    embeds: [
                        {
                            color: 0x00ff00,
                            title: "New Match Found",
                            description:
                                `**${ourClub.details?.name || "Club"} ${ourClub.goals || 0} - ${opponent.goals || 0} ${opponent.details?.name || "Opponent"}**\n${playerText}`,
                            timestamp: new Date()
                        }
                    ]
                });
            } catch (err) {
                console.error("Match Tracker Error:", err);
            }
        }
    }, 300000);

    client.startAutoMode = (guildId, channelId, clubId) => {
        activeTrackers.set(guildId, {
            channelId,
            clubId,
            lastMatchId: null
        });
    };

    client.stopAutoMode = guildId => {
        activeTrackers.delete(guildId);
    };
};
