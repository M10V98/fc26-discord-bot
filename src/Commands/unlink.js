const {
    ActionRowBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    MessageFlags
} = require("discord.js");

const {
    getLinkedClubs,
    removeLinkedClub
} = require("../Services/clubLinks");
const {
    clearCrestMemo
} = require("../Services/crests");

function clubLabel(club) {
    return club.club_name
        ? `${club.club_name} (${club.club_id})`
        : String(club.club_id);
}

function ensureAdmin(interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
        interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
}

async function unlinkClub(interaction, clubId) {
    const clubs =
        await getLinkedClubs(interaction.guild.id);
    const club =
        clubs.find(row => String(row.club_id) === String(clubId));
    const result =
        await removeLinkedClub(
            interaction.guild.id,
            clubId
        );

    if (!result.removed) {
        return interaction.editReply(
            "That club is no longer linked to this server."
        );
    }

    clearCrestMemo();

    const nextDefault =
        result.nextDefault
            ? ` New default club: ${clubLabel(result.nextDefault)}.`
            : " No clubs are linked now.";

    return interaction.editReply(
        {
            content:
                `Unlinked ${clubLabel(club || { club_id: clubId })}.${nextDefault} Saved player claims and stats were kept and will be available if the club is linked again.`,
            components: []
        }
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlink")
        .setDescription("Choose one EA club to unlink from this server")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!ensureAdmin(interaction)) {
            return interaction.reply({
                content: "Only administrators can unlink a club.",
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
                    "No club is currently linked for this server."
                );
            }

            if (clubs.length === 1) {
                return unlinkClub(interaction, clubs[0].club_id);
            }

            const menu =
                new StringSelectMenuBuilder()
                    .setCustomId("unlink_club")
                    .setPlaceholder("Choose the club to unlink")
                    .addOptions(
                        clubs.slice(0, 25).map(club => ({
                            label: (club.club_name || String(club.club_id)).slice(0, 100),
                            description:
                                `${Number(club.is_default) ? "Default club" : "Tracked club"} - ID ${club.club_id}`
                                    .slice(0, 100),
                            value: String(club.club_id).slice(0, 100)
                        }))
                    );

            return interaction.editReply({
                content:
                    "Choose which club to unlink. Saved player claims and stats will be kept for relinking.",
                components: [
                    new ActionRowBuilder().addComponents(menu)
                ]
            });
        } catch (err) {
            console.error("unlink error:", err);

            return interaction.editReply(
                "Failed to unlink club. Check bot logs for details."
            );
        }
    },

    async handleSelect(interaction) {
        if (!ensureAdmin(interaction)) {
            return interaction.reply({
                content: "Only administrators can unlink a club.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferUpdate();

        try {
            return unlinkClub(
                interaction,
                interaction.values[0]
            );
        } catch (err) {
            console.error("unlink select error:", err);

            return interaction.editReply({
                content: "Failed to unlink club. Check bot logs for details.",
                components: []
            });
        }
    }
};
