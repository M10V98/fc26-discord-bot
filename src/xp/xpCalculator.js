const { addXP } = require('./xpSystem');

const XP_VALUES = {
    matchPlayed: 10,
    goal: 50,
    assist: 40,
    tackle: 20,
    save: 45,
    cleanSheet: 35,
    win: 25
};

async function processMatchXP(match, guildId, clubId) {

    const teams = match.teams;
    const myTeam = teams[clubId];

    if (!myTeam) return;

    const opponent = Object.values(teams)
        .find(t => t.club_id != clubId);

    const won = Number(myTeam.goals) > Number(opponent.goals);
    const cleanSheet = Number(opponent.goals) === 0;

    const players = match.players?.[clubId];

    if (!players) return;

    for (const p of Object.values(players)) {

        const name = p.playername;

        const baseXP = XP_VALUES.matchPlayed;

        const xp =
            baseXP +
            Number(p.goals || 0) * XP_VALUES.goal +
            Number(p.assists || 0) * XP_VALUES.assist +
            Number(p.tacklesmade || 0) * XP_VALUES.tackle +
            (cleanSheet ? XP_VALUES.cleanSheet : 0) +
            (won ? XP_VALUES.win : 0);

        // NOTE: discordId not required yet (can be added via /claim later)
        await addXP({
            guildId,
            playerName: name,
            discordId: name, // temporary fallback key
            amount: xp
        });
    }
}

module.exports = { processMatchXP };