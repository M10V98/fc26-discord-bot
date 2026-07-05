const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");
const {
    getCrestUrl
} = require("../Services/crests");
const {
    FOOTER,
    underline,
    number,
    memberWinRate,
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

function goalRatio(player) {
    const games = n(player.gamesPlayed);
    if (!games) return "0.00";
    return (n(player.goals) / games).toFixed(2);
}

function perGame(total, games) {
    return games ? (n(total) / games).toFixed(2) : "0.00";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playerstats")
        .setDescription("View current member stats")
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
                return privateReply(
                    interaction,
                    "No club linked. Use /linkclub first."
                );
            }

            const user =
                interaction.options.getUser("user");
            const playerOption =
                interaction.options.getString("player");
            let playerName = playerOption;

            if (!playerName) {
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

                playerName = linked.player_name;
            }

            const [members, info, crestUrl, linkedRows] =
                await Promise.all([
                    eaApi.getMembersStats(club.club_id),
                    eaApi.getClubInfo(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);
            const player =
                (members?.members || [])
                    .find(member =>
                        String(member.name).toLowerCase() ===
                        String(playerName).toLowerCase()
                    );

            if (!player) {
                return privateReply(
                    interaction,
                    "No current member stats found for that player."
                );
            }

            const storedPlayer =
                await db.get(
                    `
                    SELECT *
                    FROM players
                    WHERE guild_id = ?
                    AND LOWER(player_name) = LOWER(?)
                    ORDER BY matches DESC
                    LIMIT 1
                    `,
                    [
                        interaction.guild.id,
                        player.name
                    ]
                );
            const clubName =
                info?.[String(club.club_id)]?.name || "Club";
            const linkedMaps =
                buildLinkedMaps(linkedRows);
            const display =
                displayName(player.name, linkedMaps);
            const proName =
                player.proName ? ` - "${player.proName}"` : "";
            const games =
                n(player.gamesPlayed);
            const description = [
                `\u{1F464} ${display}${proName}`,
                "",
                `\u{1F455} Games Played: **${number(player.gamesPlayed)}**`,
                `\u{1F3C5} Man of the Match: **${number(player.manOfTheMatch)}**`,
                `\u2B50 Average Rating: **${number(player.ratingAve, 2)}**`,
                `\u{1F3C6} Win Rate: **${number(memberWinRate(player))}%**`,
                `\u{1F3AF} Shot Conversion Rate: **${number(player.shotSuccessRate)}%**`,
                "",
                `\u26BD Goals: **${number(player.goals)}**`,
                `xG Per Game: **${goalRatio(player)}**`,
                `\u{1F91D} Assists: **${number(player.assists)}**`,
                `xA Per Game: **${perGame(player.assists, games)}**`,
                `\u{1F517} Second Assists: **${number(storedPlayer?.second_assists)}**`,
                `\u{1F45F} Passes Made: **${number(player.passesMade)}** (${number(player.passSuccessRate)}% success)`,
                `xP Per Game: **${perGame(player.passesMade, games)}**`,
                `\u{1F4A8} Dribbles Completed: **${number(storedPlayer?.dribbles)}**`,
                `\u{1F6E1}\uFE0F Tackles Made: **${number(player.tacklesMade)}** (${number(player.tackleSuccessRate)}% success)`,
                `xT Per Game: **${perGame(player.tacklesMade, games)}**`,
                `\u{1F9E0} Interceptions: **${number(storedPlayer?.interceptions)}**`,
                "",
                `\u{1F6AB} Defender Clean Sheets: **${number(player.cleanSheetsDef)}**`,
                `\u{1F945} Goalkeeper Clean Sheets: **${number(player.cleanSheetsGK)}**`,
                `\u{1F7E5} Red Cards: **${number(player.redCards)}**`,
                ""
            ].join("\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`Player Statistics for ${underline(clubName)}`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (err) {
            console.error("playerstats error:", err);

            await privateReply(
                interaction,
                "Failed to load player stats."
            );
        }
    }
};
