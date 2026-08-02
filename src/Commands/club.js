const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const {
    syncGuildStats
} = require("../Services/autoStatsSync");
const {
    addLinkedClub,
    getLinkedClubs,
    removeLinkedClub,
    setDefaultClub
} = require("../Services/clubLinks");
const { canUseAdminCommands } = require("../Utils/permissions");

function clubLabel(row) {
    return row.club_name
        ? `${row.club_name} (${row.club_id})`
        : String(row.club_id);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("club")
        .setDescription("Manage this server's linked EA clubs")
        .addSubcommandGroup(group =>
            group
                .setName("server")
                .setDescription("Manage server club tracking")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Add a club to this server's tracked clubs")
                        .addStringOption(option =>
                            option
                                .setName("clubid")
                                .setDescription("EA ClubID from the EA Clubs Ranking website")
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName("default")
                                .setDescription("Make this the default club for commands")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("default")
                        .setDescription("Choose which linked club is the server default")
                        .addStringOption(option =>
                            option
                                .setName("club")
                                .setDescription("Linked club name or EA ClubID")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("list")
                        .setDescription("List this server's linked clubs")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a linked club from this server")
                        .addStringOption(option =>
                            option
                                .setName("club")
                                .setDescription("Linked club name or EA ClubID to remove")
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction) {
        if (!canUseAdminCommands(interaction)) {
            return interaction.reply({
                content: "Only administrators or Managers can manage server clubs.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const subcommand =
                interaction.options.getSubcommand();
            const guildId =
                interaction.guild.id;

            if (subcommand === "list") {
                const clubs =
                    await getLinkedClubs(guildId);

                if (!clubs.length) {
                    return interaction.editReply(
                        "No clubs are linked. Use `/club server add` first."
                    );
                }

                return interaction.editReply(
                    clubs
                        .map(row =>
                            `${Number(row.is_default) ? "Default: " : "Tracked: "}${clubLabel(row)}`
                        )
                        .join("\n")
                );
            }

            if (subcommand === "add") {
                const clubId =
                    interaction.options.getString("clubid");
                const makeDefault =
                    interaction.options.getBoolean("default") ?? false;
                const linked =
                    await addLinkedClub(
                        guildId,
                        clubId,
                        {
                            makeDefault
                        }
                    );
                const syncResult =
                    await syncGuildStats(
                        guildId,
                        linked.club_id,
                        {
                            forceRefresh: true
                        }
                    );

                return interaction.editReply(
                    `Added ${clubLabel(linked)}${Number(linked.is_default) ? " as the server default" : ""}.\nSynced ${syncResult.processed} recent match${syncResult.processed === 1 ? "" : "es"} automatically.`
                );
            }

            if (subcommand === "default") {
                const clubInput =
                    interaction.options.getString("club");
                const club =
                    await setDefaultClub(
                        guildId,
                        clubInput
                    );

                if (!club) {
                    return interaction.editReply(
                        "That club is not linked, or the name matches more than one linked club. Use `/club server list` to check the exact name."
                    );
                }

                return interaction.editReply(
                    `Server default club set to ${clubLabel(club)}.`
                );
            }

            if (subcommand === "remove") {
                const clubInput =
                    interaction.options.getString("club");
                const result =
                    await removeLinkedClub(
                        guildId,
                        clubInput
                    );

                if (!result.removed) {
                    return interaction.editReply(
                        "That club is not linked to this server, or the name matches more than one linked club."
                    );
                }

                return interaction.editReply(
                    result.nextDefault
                        ? `Removed ${clubInput}. New default club: ${clubLabel(result.nextDefault)}.`
                        : `Removed ${clubInput}. No clubs are linked now.`
                );
            }

            return interaction.editReply(
                "Unknown club command."
            );
        } catch (err) {
            console.error("club command error:", err);

            return interaction.editReply(
                err.message === "invalid_club_id"
                    ? "That is not a valid EA ClubID. Enter the numeric ClubID or paste an EA Clubs URL containing `clubId=`."
                    : "Failed to manage server clubs. Check bot logs for details."
            );
        }
    }
};
