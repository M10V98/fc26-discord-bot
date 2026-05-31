const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");

const {
    getCrestUrl
} = require("../Services/crests");

function valueOf(value, digits = 0) {
    const number = Number(value || 0);
    return digits > 0 ? number.toFixed(digits) : String(number);
}

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
        await db.all(
            `
            SELECT player_name
            FROM linked_players
            WHERE guild_id = ?
            AND player_name IS NOT NULL
            ORDER BY player_name COLLATE NOCASE
            LIMIT 100
            `,
            [interaction.guild.id]
        );

    await interaction.respond(
        rows
            .filter(row =>
                row.player_name.toLowerCase().includes(focused)
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

            const [career, crestUrl] =
                await Promise.all([
                    eaApi.getMembersCareer(club.club_id),
                    getCrestUrl(club.club_id)
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

            const embed =
                new EmbedBuilder()
                    .setColor("#6cdb7f")
                    .setTitle(`${player.name} - Career Stats`)
                    .addFields(
                        { name: "Games", value: valueOf(player.gamesPlayed), inline: true },
                        { name: "Goals", value: valueOf(player.goals), inline: true },
                        { name: "Assists", value: valueOf(player.assists), inline: true },
                        { name: "MOTM", value: valueOf(player.manOfTheMatch), inline: true },
                        { name: "Avg Rating", value: valueOf(player.ratingAve, 2), inline: true }
                    );

            const description =
                [
                    player.favoritePosition
                        ? `Favorite position: ${player.favoritePosition}`
                        : null,
                    player.proPos ? `Current position: ${player.proPos}` : null
                ].filter(Boolean).join("\n");

            if (description) {
                embed.setDescription(description);
            }

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
