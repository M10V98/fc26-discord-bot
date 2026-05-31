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
            // GET MEMBERS (current season roster)
            // =========================

            const members =
                await eaApi.getMembersStats(club.club_id);

            const list =
                Array.isArray(members?.members)
                    ? members.members
                    : [];

            if (list.length === 0) {
                return interaction.editReply(
                    "❌ No members found for this club."
                );
            }

            // Resolve playerIds via the latest match data so the
            // dropdown stores stable IDs (members API only has names).
            const matches =
                await eaApi.getRecentMatches(
                    club.club_id,
                    { limit: 25 }
                );

            const idByName = new Map();

            for (const match of matches) {

                const players =
                    match.players?.[String(club.club_id)] || {};

                for (const [pid, p] of Object.entries(players)) {

                    if (p.playername && !idByName.has(p.playername)) {
                        idByName.set(p.playername, pid);
                    }
                }
            }

            const options =
                list
                    .slice(0, 25)
                    .map(m => {

                        const pid = idByName.get(m.name) || "";

                        return {
                            label: m.name.slice(0, 100),
                            description:
                                `${m.proName || ""} - ${m.favoritePosition || ""}`
                                    .slice(0, 100),
                            // value carries playerId|name so the handler can persist both.
                            value: `${pid}|${m.name}`.slice(0, 100)
                        };
                    });

            const menu =
                new StringSelectMenuBuilder()
                    .setCustomId("claim_player")
                    .setPlaceholder("Select your player")
                    .addOptions(options);

            const row =
                new ActionRowBuilder()
                    .addComponents(menu);

            await interaction.editReply({
                content: "Select your player:",
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
