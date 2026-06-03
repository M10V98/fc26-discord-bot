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
                return interaction.editReply(
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
                    return interaction.editReply(
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
                return interaction.editReply(
                    "No current member stats found for that player."
                );
            }

            const clubName =
                info?.[String(club.club_id)]?.name || "Club";
            const linkedMaps =
                buildLinkedMaps(linkedRows);
            const display =
                displayName(player.name, linkedMaps);
            const proName =
                player.proName ? ` - "${player.proName}"` : "";

            const description = [
                `👤 ${display}${proName}`,
                "",
                `👕 Games Played: **${number(player.gamesPlayed)}**`,
                `🏅 Man of the Match: **${number(player.manOfTheMatch)}**`,
                `⭐ Average Rating: **${number(player.ratingAve, 2)}**`,
                `🏆 Win Rate: **${number(memberWinRate(player))}%**`,
                `🎯 Shot Conversion Rate: **${number(player.shotSuccessRate)}%**`,
                "",
                `⚽ Goals: **${number(player.goals)}**`,
                `▌ xG Per Game: **${goalRatio(player)}**`,
                `🤝 Assists: **${number(player.assists)}**`,
                `▌ xA Per Game: **${n(player.gamesPlayed) ? (n(player.assists) / n(player.gamesPlayed)).toFixed(2) : "0.00"}**`,
                `👟 Passes Made: **${number(player.passesMade)}** (${number(player.passSuccessRate)}% success)`,
                `▌ xP Per Game: **${n(player.gamesPlayed) ? (n(player.passesMade) / n(player.gamesPlayed)).toFixed(2) : "0.00"}**`,
                `🛡️ Tackles Made: **${number(player.tacklesMade)}** (${number(player.tackleSuccessRate)}% success)`,
                `▌ xT Per Game: **${n(player.gamesPlayed) ? (n(player.tacklesMade) / n(player.gamesPlayed)).toFixed(2) : "0.00"}**`,
                "",
                `🚫 Defender Clean Sheets: **${number(player.cleanSheetsDef)}**`,
                `🥅 Goalkeeper Clean Sheets: **${number(player.cleanSheetsGK)}**`,
                `🟥 Red Cards: **${number(player.redCards)}**`,
                "",
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

            await interaction.editReply(
                "Failed to load player stats."
            );
        }
    }
};
