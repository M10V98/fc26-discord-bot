const eaApi = require('./eaApi');

const activeTrackers = new Map();

module.exports = function startTracker(client) {

    setInterval(async () => {

        for (const [guildId, tracker] of activeTrackers) {

            try {

                const matches = await eaApi.getMatches(
                    tracker.clubId
                );

                if (!matches || matches.length === 0)
                    continue;

                const latest = matches[0];

                if (latest.id === tracker.lastMatchId)
                    continue;

                tracker.lastMatchId = latest.id;

                const channel =
                    await client.channels.fetch(
                        tracker.channelId
                    );

                if (!channel) continue;

                const clubs =
                    latest.match_data?.clubs || {};

                const teams =
                    Object.values(clubs);

                if (teams.length < 2)
                    continue;

                const home = teams[0];
                const away = teams[1];

                let playerText = '';

                Object.entries(
                    latest.player_data || {}
                ).forEach(([name, stats]) => {

                    playerText +=
                        `\n**${name}** | ⚽ ${stats.goals} | 🅰️ ${stats.assists} | ⭐ ${stats.rating}`;
                });

                await channel.send({

                    embeds: [
                        {
                            color: 0x00ff00,
                            title: '📢 New Match Found',
                            description:
                                `**${home.clubName} ${home.goals} - ${away.goals} ${away.clubName}**\n${playerText}`,
                            timestamp: new Date()
                        }
                    ]
                });

            } catch (err) {

                console.error(
                    'Match Tracker Error:',
                    err
                );
            }

        }

    }, 300000); // 5 minutes


    client.startAutoMode = (
        guildId,
        channelId,
        clubId
    ) => {

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