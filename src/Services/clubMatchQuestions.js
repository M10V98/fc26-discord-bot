const eaApi = require("./eaApi");
const db = require("../Utils/db");
const {
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    number,
    timeAgo
} = require("../Utils/embedStyle");

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function clubName(club) {
    return club?.details?.name || "Unknown";
}

function matchContextIntent(question) {
    const text =
        normalize(question);
    const latestCue =
        /\b(last|latest|recent|previous|just played|newest)\b/.test(text);
    const clubCue =
        /\b(our|us|we|bella ciao|bella ciao fc|the club|club|the team|team)\b/.test(text);
    const matchCue =
        /\b(match|game|fixture|result|score|scoreline|scored|scorer|assist|assisted|played|how did|performance|performer|player|ratings?|motm|man of the match)\b/.test(text);
    const contextualCue =
        latestCue ||
        (
            clubCue &&
            matchCue &&
            /\b(result|score|scoreline|scored|scorer|assist|assisted|played|how did|best player|man of the match|motm|top rated|highest rated|standout|ratings?)\b/.test(text)
        );

    if (!contextualCue) {
        return null;
    }

    if (/\b(result|score|scoreline|won|lost|draw|drew|how did we do|how did we get on)\b/.test(text) ||
        /\bhow did\b.*\b(we|us|our|the team|team|the club|club|bella ciao|bella ciao fc)\b/.test(text)) {
        return "latest_result";
    }

    if (/\b(best player|who was best|best for us|best for the team|best for the club|best for bella ciao|man of the match|motm|top rated|highest rated|best performer|standout)\b/.test(text)) {
        return "best_player";
    }

    if (/\b(who scored|scorer|scored|goals?)\b/.test(text)) {
        return "scorers";
    }

    if (/\b(assist|assisted|playmaker|created)\b/.test(text)) {
        return "assists";
    }

    if (/\b(rating|ratings|performance|performances)\b/.test(text)) {
        return "ratings";
    }

    return null;
}

function getSides(match, clubId) {
    const clubs =
        match.clubs || {};
    const ourId =
        String(clubId);
    const opponentId =
        Object.keys(clubs)
            .find(id => id !== ourId);

    return {
        our: clubs[ourId],
        opponent: clubs[opponentId],
        opponentId
    };
}

function resultWord(ourGoals, opponentGoals) {
    if (ourGoals > opponentGoals) {
        return "won";
    }

    if (ourGoals < opponentGoals) {
        return "lost";
    }

    return "drew";
}

function playersForMatch(match, clubId, linkedMaps) {
    return Object.entries(match.players?.[String(clubId)] || {})
        .map(([playerId, player]) => ({
            playerId,
            raw: player,
            name: displayName(player.playername, linkedMaps, playerId),
            goals: Number(player.goals || 0),
            assists: Number(player.assists || 0),
            rating: Number(player.rating || 0),
            motm: player.mom === "1"
        }));
}

function bestPlayer(players) {
    return players.find(player => player.motm) ||
        players
            .slice()
            .sort((a, b) => b.rating - a.rating)[0] ||
        null;
}

function topLines(players, key, label, max = 4) {
    const rows =
        players
            .filter(player => Number(player[key] || 0) > 0)
            .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))
            .slice(0, max);

    if (!rows.length) {
        return `No ${label} were recorded for our players in the latest match.`;
    }

    return rows
        .map(player => `${player.name} (${number(player[key])})`)
        .join(", ");
}

function ratingLines(players, max = 5) {
    const rows =
        players
            .filter(player => player.rating > 0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, max);

    if (!rows.length) {
        return "No player ratings were recorded for the latest match.";
    }

    return rows
        .map(player => `${player.name} ${number(player.rating, 1)}`)
        .join(", ");
}

function formatLatestResult(match, clubId, intent, linkedMaps) {
    const {
        our,
        opponent
    } = getSides(match, clubId);

    if (!our || !opponent) {
        return "I found the latest match, but could not read both teams from the EA data.";
    }

    const ourGoals =
        Number(our.goals || 0);
    const opponentGoals =
        Number(opponent.goals || 0);
    const players =
        playersForMatch(match, clubId, linkedMaps);
    const best =
        bestPlayer(players);
    const intro =
        `Latest match: **${clubName(our)} ${ourGoals}-${opponentGoals} ${clubName(opponent)}**. We ${resultWord(ourGoals, opponentGoals)} this one ${timeAgo(match.timestamp)}.`;

    if (intent === "latest_result") {
        return best
            ? `${intro}\nBest performer: **${best.name}** (${number(best.rating, 1)} rating).`
            : intro;
    }

    if (intent === "best_player") {
        return best
            ? `Best player in our latest match was **${best.name}** with a **${number(best.rating, 1)}** rating${best.motm ? " and Man of the Match" : ""}.\n${clubName(our)} ${ourGoals}-${opponentGoals} ${clubName(opponent)}.`
            : "I found the latest match, but no player ratings were recorded.";
    }

    if (intent === "scorers") {
        return `${intro}\nOur scorers: ${topLines(players, "goals", "goals")}`;
    }

    if (intent === "assists") {
        return `${intro}\nOur assists: ${topLines(players, "assists", "assists")}`;
    }

    if (intent === "ratings") {
        return `${intro}\nTop ratings: ${ratingLines(players)}`;
    }

    return null;
}

async function answerClubMatchQuestion(guildId, question) {
    const intent =
        matchContextIntent(question);

    if (!intent) {
        return null;
    }

    const club =
        await db.get(
            `SELECT * FROM clubs WHERE guild_id = ?`,
            [guildId]
        );

    if (!club) {
        return "No club is linked yet. Use `/linkclub` first, then I can answer latest-match questions.";
    }

    const [matches, linkedRows] =
        await Promise.all([
            eaApi.getRecentMatches(club.club_id, {
                limit: 1,
                forceRefresh: true
            }),
            getLinkedRows(db, guildId)
        ]);

    if (!matches?.length) {
        return "I could not find a recent match for the linked club yet.";
    }

    return formatLatestResult(
        matches[0],
        String(club.club_id),
        intent,
        buildLinkedMaps(linkedRows)
    );
}

module.exports = {
    answerClubMatchQuestion,
    matchContextIntent
};
