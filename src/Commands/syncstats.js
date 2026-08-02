const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const {
    getLinkedClubs
} = require("../Services/clubLinks");

const {
    processMatchXP
} = require("../Services/processMatchXP");
const {
    syncCompetitiveMatches
} = require("../Services/compStats");
const { canUseAdminCommands } = require("../Utils/permissions");

const MATCH_TYPES = [
    "leagueMatch",
    "playoffMatch",
    "friendlyMatch"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syncstats")
        .setDescription("Backfill player stats from recent club matches")
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
        if (!canUseAdminCommands(interaction)) {
            return interaction.reply({
                content: "You must be an administrator or Manager to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const clubs =
                await getLinkedClubs(interaction.guild.id);

            if (!clubs.length) {
                return interaction.editReply(
                    "No club linked. Use `/club server add` first."
                );
            }

            const limit =
                interaction.options.getInteger("matches") ||
                100;

            const force =
                interaction.options.getBoolean("force") ||
                false;

            let totalMatches = 0;
            let processed = 0;

            for (const club of clubs) {
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
                                        `${type} sync fetch failed for club ${club.club_id}:`,
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

                totalMatches += matches.length;

                const overallStats =
                    await eaApi.getOverallStats(
                        club.club_id,
                        {
                            forceRefresh: true
                        }
                    ).catch(err => {
                        console.error(
                            `overall stats fetch failed for club ${club.club_id}:`,
                            err
                        );
                        return null;
                    });

                await syncCompetitiveMatches(
                    interaction.guild.id,
                    club.club_id,
                    {
                        forceRefresh: true,
                        maxResultCount: limit,
                        statsStartedAt: 0
                    }
                );

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
            }

            if (!totalMatches) {
                return interaction.editReply(
                    "No matches found from the EA league, playoff, or friendly match APIs."
                );
            }

            await interaction.editReply(
                `Synced ${processed} new match${processed === 1 ? "" : "es"} from ${totalMatches} EA match record${totalMatches === 1 ? "" : "s"} checked across ${clubs.length} linked club${clubs.length === 1 ? "" : "s"}. Try /profile, /leaderboard, or /playerstats again.`
            );

        } catch (err) {
            console.error("syncstats error:", err);

            await interaction.editReply(
                "Failed to sync stats. Check the bot logs for details."
            );
        }
    }
};
