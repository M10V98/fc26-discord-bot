const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    refreshAndGetCompetitiveMatches,
    aggregateCompetitivePlayers
} = require("../Services/compStats");
const {
    getCrestUrl
} = require("../Services/crests");
const eaApi = require("../Services/eaApi");
const {
    FOOTER,
    underline,
    number,
    buildLinkedMaps,
    displayName,
    getLinkedRows
} = require("../Utils/embedStyle");
const {
    privateReply
} = require("../Utils/privateReply");

function n(value) {
    return Number(value || 0);
}

async function getLinkedPlayer(guildId, discordId) {
    return db.get(
        `
        SELECT * FROM linked_players
        WHERE guild_id = ?
        AND discord_id = ?
        `,
        [guildId, discordId]
    );
}

async function autocompleteLinkedPlayers(interaction) {
    const focused =
        interaction.options.getFocused().toLowerCase();
    const rows =
        await getLinkedRows(db, interaction.guild.id);

    await interaction.respond(
        rows
            .filter(row =>
                row.player_name?.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(row => ({
                name: row.player_name,
                value: row.player_name
            }))
    );
}

function perGame(total, games) {
    return games ? (n(total) / games).toFixed(2) : "0.00";
}

module.exports = {
    hidden: true,
    data: new SlashCommandBuilder()
        .setName("compplayerstats")
        .setDescription("View competitive friendly player stats")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Discord user with a claimed player")
        )
        .addStringOption(option =>
            option
                .setName("player")
                .setDescription("Claimed player name")
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        await autocompleteLinkedPlayers(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const club =
                await db.get(
                    `SELECT * FROM clubs WHERE guild_id = ?`,
                    [interaction.guild.id]
                );

            if (!club) {
                return privateReply(interaction, "No club linked. Use /linkclub first.");
            }

            const user =
                interaction.options.getUser("user");
            const playerOption =
                interaction.options.getString("player");

            let selectedName = playerOption;
            let selectedId = null;

            if (!selectedName) {
                const linked =
                    await getLinkedPlayer(
                        interaction.guild.id,
                        user?.id || interaction.user.id
                    );

                if (!linked) {
                    return privateReply(
                        interaction,
                        user
                            ? "That Discord user has not claimed a player."
                            : "Use /claim first, or choose a player."
                    );
                }

                selectedName = linked.player_name;
                selectedId = linked.player_id;
            }

            const [matches, info, crestUrl, linkedRows] =
                await Promise.all([
                    refreshAndGetCompetitiveMatches(
                        interaction.guild.id,
                        club.club_id,
                        { forceRefresh: true }
                    ),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            const players =
                aggregateCompetitivePlayers(matches, club.club_id);

            const player =
                players.find(row =>
                    selectedId && String(row.playerId) === String(selectedId)
                ) ||
                players.find(row =>
                    String(row.name).toLowerCase() ===
                    String(selectedName).toLowerCase()
                );

            if (!player) {
                return privateReply(interaction, "No competitive friendly stats found for that player.");
            }

            const clubId = String(club.club_id);
            const clubName =
                info?.[clubId]?.name || "Club";
            const linkedMaps = buildLinkedMaps(linkedRows);
            const display =
                displayName(player.name, linkedMaps, player.playerId);
            const apps = n(player.appearances);

            const EMOJIS = {
    PLAYER: "\u{1F464}",        // 👤
    GAMES: "\u26BD",            // ⚽
    MOTM: "\u{1F3C5}",          // 🏅
    RATING: "\u2B50",           // ⭐
    GOALS: "\u{1F945}",         // 🥅
    XG: "\u{1F4CA}",            // 📊
    ASSISTS: "\u{1F45F}",       // 👟
    XA: "\u{1F4C8}",            // 📈
    PASSES: "\u{1F9E0}",        // 🧠
    TACKLES: "\u{1F6E1}\uFE0F", // 🛡️
    CLEAN: "\u{1F9FC}",         // 🧼
    SAVES: "\u{1F9E4}",         // 🧤
    RED: "\u{1F7E5}"            // 🟥
};

const description = [
    `${EMOJIS.PLAYER} **${display}**`,
    "",
    `${EMOJIS.GAMES} Games Played: **${number(player.appearances)}**`,
    `${EMOJIS.MOTM} Man of the Match: **${number(player.motm)}**`,
    `${EMOJIS.RATING} Average Rating: **${number(player.avgRating, 2)}**`,
    "",
    `${EMOJIS.GOALS} Goals: **${number(player.goals)}**`,
    `${EMOJIS.XG} xG Per Game: **${perGame(player.goals, apps)}**`,
    `${EMOJIS.ASSISTS} Assists: **${number(player.assists)}**`,
    `${EMOJIS.XA} xA Per Game: **${perGame(player.assists, apps)}**`,
    `${EMOJIS.PASSES} Passes Made: **${number(player.passes)}** (${number(player.passPercent)}% success)`,
    `${EMOJIS.XA} xP Per Game: **${perGame(player.passes, apps)}**`,
    `${EMOJIS.TACKLES} Tackles Made: **${number(player.tackles)}** (${number(player.tacklePercent)}% success)`,
    `${EMOJIS.TACKLES} xT Per Game: **${perGame(player.tackles, apps)}**`,
    "",
    `${EMOJIS.CLEAN} Clean Sheets: **${number(player.cleanSheets)}**`,
    `${EMOJIS.SAVES} Saves: **${number(player.saves)}**`,
    `${EMOJIS.RED} Red Cards: **${number(player.redCards)}**`,
    "",
    "> Competitive stats use stored Friendly Match data only."
].join("\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`Competitive Player Statistics for ${underline(clubName)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) embed.setThumbnail(crestUrl);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("compplayerstats error:", err);
            await privateReply(interaction, "Failed to load competitive player stats.");
        }
    }
};
