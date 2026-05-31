const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");

const {
    processMatchXP
} = require("../Services/processMatchXP");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syncstats")
        .setDescription("Backfill player stats from recent club matches")
        .addIntegerOption(option =>
            option
                .setName("matches")
                .setDescription("How many recent matches to process")
                .setMinValue(1)
                .setMaxValue(25)
        )
        .addBooleanOption(option =>
            option
                .setName("force")
                .setDescription("Reprocess matches that were already marked as processed")
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const club = await db.get(
                `
                SELECT * FROM clubs
                WHERE guild_id = ?
                `,
                [interaction.guild.id]
            );

            if (!club) {
                return interaction.editReply(
                    "No club linked. Use /linkclub first."
                );
            }

            const limit =
                interaction.options.getInteger("matches") ||
                10;

            const force =
                interaction.options.getBoolean("force") ||
                false;

            const matches =
                await eaApi.getRecentMatches(
                    club.club_id,
                    { limit }
                );

            if (!matches?.length) {
                return interaction.editReply(
                    "No matches found for this club."
                );
            }

            let processed = 0;

            for (const match of matches.slice(0, limit).reverse()) {
                const didProcess = await processMatchXP(
                    match,
                    interaction.guild.id,
                    {
                        clubId: club.club_id,
                        force
                    }
                );

                if (didProcess) {
                    processed += 1;
                }
            }

            await interaction.editReply(
                `Synced ${processed} match${processed === 1 ? "" : "es"}. Try /playerstats again.`
            );

        } catch (err) {
            console.error("syncstats error:", err);

            await interaction.editReply(
                "Failed to sync stats. Check the bot logs for details."
            );
        }
    }
};
