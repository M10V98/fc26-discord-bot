const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");

const {
    processMatchXP
} = require("../Services/processMatchXP");
const {
    syncCompetitiveMatches
} = require("../Services/compStats");

const MATCH_TYPES = [
    "leagueMatch",
    "playoffMatch",
    "friendlyMatch"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syncstats")
        .setDescription("Backfill player stats from recent club matches")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // ✅ Admin-only visibility
        .addIntegerOption(option =>
            option
                .setName("matches")
                .setDescription("How many matches per EA match type to process")
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addBooleanOption(option =>
            option
                .setName("force")
                .setDescription("Reprocess matches that were already marked as processed")
        ),

    async execute(interaction) {
        // ✅ Admin check (runtime protection)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "You must be an admin to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

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
                100;

            const force =
                interaction.options.getBoolean("force") ||
                false;

            const matches =
                (
                    await Promise.all(
                        MATCH_TYPES.map(type =>
                            eaApi.getMatches(
                                club.club_id,
                                type,
                                {
                                    forceRefresh: true,
                                    maxResultCount: limit
                                }
                            ).catch(err => {
                                console.error(
                                    `${type} sync fetch failed:`,
                                    err
                                );
                                return [];
                            })
                        )
                    )
                )
                    .flat()
                    .filter(match => match?.matchId)
                    .sort((a, b) =>
                        Number(a.timestamp || 0) -
                        Number(b.timestamp || 0)
                    );

            const overallStats =
                await eaApi.getOverallStats(
                    club.club_id,
                    {
                        forceRefresh: true
                    }
                ).catch(err => {
                    console.error(
                        "overall stats fetch failed:",
                        err
                    );
                    return null;
                });

            if (!matches?.length) {
                return interaction.editReply(
                    "No matches found from the EA league, playoff, or friendly match APIs."
                );
            }

            await syncCompetitiveMatches(
                interaction.guild.id,
                club.club_id,
                {
                    forceRefresh: true,
                    maxResultCount: limit,
                    statsStartedAt: 0
                }
            );

            let processed = 0;

            for (const match of matches) {
                const didProcess = await processMatchXP(
                    match,
                    interaction.guild.id,
                    {
                        clubId: club.club_id,
                        overallStats,
                        force,
                        includeFriendlyStats: true
                    }
                );

                if (didProcess) {
                    processed += 1;
                }
            }

            await interaction.editReply(
                `Synced ${processed} new match${processed === 1 ? "" : "es"} from ${matches.length} EA match record${matches.length === 1 ? "" : "s"} checked. Try /profile, /leaderboard, or /playerstats again.`
            );

        } catch (err) {
            console.error("syncstats error:", err);

            await interaction.editReply(
                "Failed to sync stats. Check the bot logs for details."
            );
        }
    }
};
