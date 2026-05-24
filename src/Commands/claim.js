const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags
} = require("discord.js");

const eaApi =
    require("../Services/eaApi");

const db =
    require("../Utils/db");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("claim")
        .setDescription(
            "Claim your EA player"
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {

            // =========================
            // GET CLUB
            // =========================

            const club =
                await db.get(
                    `
                    SELECT * FROM clubs
                    WHERE guild_id = ?
                    `,
                    [interaction.guild.id]
                );

            if (!club) {

                return interaction.editReply(
                    "❌ No club linked. Use /linkclub"
                );
            }

            // =========================
            // GET MATCHES
            // =========================

            const matches =
                await eaApi.getMatches(
                    club.club_id
                );

            if (
                !matches ||
                matches.length === 0
            ) {

                return interaction.editReply(
                    "❌ No matches found."
                );
            }

            // =========================
            // GET PLAYER NAMES
            // =========================

            const names =
                new Set();

            matches.forEach(match => {

                Object.keys(
                    match.player_data || {}
                ).forEach(name => {

                    names.add(name);
                });
            });

            const options =
                [...names]
                .slice(0, 25)
                .map(name => ({
                    label: name,
                    value: name
                }));

            // =========================
            // MENU
            // =========================

            const menu =
                new StringSelectMenuBuilder()
                .setCustomId(
                    "claim_player"
                )
                .setPlaceholder(
                    "Select your player"
                )
                .addOptions(options);

            const row =
                new ActionRowBuilder()
                .addComponents(menu);

            await interaction.editReply({

                content:
                    "Select your player:",

                components: [row]
            });

        } catch (err) {

            console.error(
                "❌ claim error:",
                err
            );

            await interaction.editReply(
                "❌ Failed to load players."
            );
        }
    }
};
