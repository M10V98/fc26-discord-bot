const {
    processMatchXP
} = require("./processMatchXP");

async function processMatch(match, guildId = "default", clubId = null) {
    return processMatchXP(
        match,
        guildId,
        {
            clubId:
                clubId ||
                match.club_id ||
                Object.keys(match.clubs || {})[0]
        }
    );
}

module.exports = {
    processMatch
};
