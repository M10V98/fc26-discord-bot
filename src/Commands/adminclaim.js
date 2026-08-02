const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");
const { isRealPlayerName } = require("../Utils/embedStyle");
const { canUseAdminCommands } = require("../Utils/permissions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("adminclaim")
        .setDescription("Manually link an EA player to a Discord user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Discord user to link")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("page")
                .setDescription("Roster page")
                .addChoices(
                    { name: "Players 1-25", value: 1 },
                    { name: "Players 26-50", value: 2 }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!canUseAdminCommands(interaction)) {
            return interaction.editReply(
                "Only administrators or Managers can manually link players."
            );
        }

        try {
            const targetUser =
                interaction.options.getUser("user");

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

            const page =
                interaction.options.getInteger("page") || 1;

            const members =
                await eaApi.getMembersStats(club.club_id);

            const list =
                Array.isArray(members?.members)
                    ? members.members.filter(member =>
                        isRealPlayerName(member.name)
                    )
                    : [];

            if (list.length === 0) {
                return interaction.editReply(
                    "❌ No members found for this club."
                );
            }

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
                    if (
                        isRealPlayerName(p.playername) &&
                        !idByName.has(p.playername)
                    ) {
                        idByName.set(p.playername, pid);
                    }
                }
            }

            const options =
                list
                    .slice((page - 1) * 25, page * 25)
                    .map(m => {
                        const pid = idByName.get(m.name) || "";

                        return {
                            label: m.name.slice(0, 100),
                            description:
                                `${m.proName || ""} - ${m.favoritePosition || ""}`
                                    .slice(0, 100),
                            value: `${pid}|${m.name}`.slice(0, 100)
                        };
                    });

            if (!options.length) {
                return interaction.editReply(
                    "There are no players on that roster page."
                );
            }

            const menu =
                new StringSelectMenuBuilder()
                    .setCustomId(`adminclaim_player:${targetUser.id}`)
                    .setPlaceholder(`Select player for ${targetUser.username}`)
                    .addOptions(options);

            const row =
                new ActionRowBuilder()
                    .addComponents(menu);

            await interaction.editReply({
                content:
                    list.length > 25
                        ? `Select the player to link to **${targetUser.tag}**. Use \`/adminclaim user:@user page:Players 26-50\` if they are not on this page.`
                        : `Select the player to link to **${targetUser.tag}**:`,
                components: [row]
            });

        } catch (err) {
            console.error("❌ adminclaim error:", err);

            await interaction.editReply(
                "❌ Failed to load players."
            );
        }
    }
};
