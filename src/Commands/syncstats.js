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

function normalizeMatchType(match) {
    const club =
        Object.values(match?.clubs || {})[0];

    return String(
        match?.matchType ||
        match?.matchtype ||
        club?.matchType ||
        club?.matchtype ||
        ""
    )
        .toLowerCase()
        .replace(/[\s_-]/g, "");
}

function shouldSyncNormalStats(match, statsStartedAt) {
    const type =
        normalizeMatchType(match);
    const timestampMs =
        Number(match?.timestamp || 0) * 1000;

    return (
        type === "leaguematch" ||
        type === "playoffmatch"
    ) &&
        (
            !Number(statsStartedAt || 0) ||
            timestampMs >= Number(statsStartedAt || 0)
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syncstats")
        .setDescription("Backfill player stats from recent club matches")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // ✅ Admin-only visibility
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
                10;

            const force =
                interaction.options.getBoolean("force") ||
                false;

            const statsStartedAt =
                Number(club.stats_started_at || 0);
            const matches =
                (await eaApi.getRecentMatches(
                    club.club_id,
                    {
                        limit: Math.max(limit, 100),
                        maxResultCount: 100
                    }
                ))
                    .filter(match =>
                        shouldSyncNormalStats(match, statsStartedAt)
                    )
                    .slice(0, limit);

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
                        overallStats,
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
