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
    number,
    buildLinkedMaps,
    displayName,
    getLinkedRows
} = require("../Utils/embedStyle");

async function linkedPlayer(guildId, discordId) {
    return db.get(
        `
        SELECT * FROM linked_players
        WHERE guild_id = ?
        AND discord_id = ?
        `,
        [guildId, discordId]
    );
}

async function autocomplete(interaction) {
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("career")
        .setDescription("View all-time EA career stats")
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

    autocomplete,

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

            let playerName =
                interaction.options.getString("player");

            if (!playerName) {
                const linked =
                    await linkedPlayer(
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

            const [career, crestUrl, linkedRows] =
                await Promise.all([
                    eaApi.getMembersCareer(club.club_id),
                    getCrestUrl(club.club_id),
                    getLinkedRows(db, interaction.guild.id)
                ]);

            const player =
                (career?.members || [])
                    .find(member =>
                        String(member.name).toLowerCase() ===
                        String(playerName).toLowerCase()
                    );

            if (!player) {
                return interaction.editReply(
                    "No career stats found for that player."
                );
            }

            const linkedMaps =
                buildLinkedMaps(linkedRows);
            const display =
                displayName(player.name, linkedMaps);

            const description = [
                `Showing EA career totals only - ${display} does not have Premium.`,
                "Premium includes OurProClub historical tracking, including passes, tackles, ratings, clean sheets, XP, and more.",
                "Get OurProClub Premium",
                "",
                "**EA ID**",
                player.name,
                `${player.proOverall || "-"} rated ${player.favoritePosition || player.proPos || "Player"}`,
                "",
                "**Career Statistics (From EA)**",
                `👕 Appearances: ${number(player.gamesPlayed)}`,
                `🏅 Man of the Match: ${number(player.manOfTheMatch)}`,
                `⭐ Average Rating: ${number(player.ratingAve, 1)}`,
                `⚽ Goals: ${number(player.goals)}`,
                `🤝 Assists: ${number(player.assists)}`
            ].join("\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(`${player.name}'s All-time Statistics`)
                    .setDescription(description.slice(0, 4096))
                    .setFooter(FOOTER);

            if (crestUrl) {
                embed.setThumbnail(crestUrl);
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (err) {
            console.error("career error:", err);

            await interaction.editReply(
                "Failed to load career stats."
            );
        }
    }
};
