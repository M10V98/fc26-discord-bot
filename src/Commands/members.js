```js
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder
} = require("discord.js");

const eaApi = require("../Services/eaApi");
const db = require("../Utils/db");

const {
    getCrestUrl
} = require("../Services/crests");

const {
    FOOTER,
    buildLinkedMaps,
    displayName,
    getLinkedRows,
    infoBlock,
    number,
    underline
} = require("../Utils/embedStyle");

const MAX_MEMBER_PAGES = 3;
const MAX_MEMBERS_SHOWN = 75;

function memberBlock(member, linkedMaps) {
    const position =
        member.favoritePosition ||
        member.proPos ||
        "Player";

    const overall =
        member.proOverall || "-";

    const amr =
        Math.round(Number(member.ratingAve || 0) * 10);

    const playerName =
        member.name || "Unknown";

    const linkedName =
        displayName(playerName, linkedMaps);

    const EMOJI_USER = "\u{1F464}";      // 👤
    const EMOJI_PIN = "\u{1F4CD}";       // 📍
    const EMOJI_SHIELD = "\u{1F6E1}\uFE0F"; // 🛡️
    const EMOJI_STAR = "\u2B50";         // ⭐
    const EMOJI_UP = "\u2B06\uFE0F";     // ⬆️

    const height =
        member.proHeight
            ? `${EMOJI_UP} Height: ${member.proHeight}cm`
            : null;

    return [
        `**${playerName}**`,
        `${EMOJI_USER} ${linkedName}`,
        `${EMOJI_PIN} ${overall} ${position}`,
        `${EMOJI_SHIELD} GP: ${number(member.gamesPlayed)}`,
        `${EMOJI_STAR} AMR: ${amr}`,
        height
    ]
        .filter(Boolean)
        .join("\n");
}

function buildPageButtons(page, totalPages) {
    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`members_page:${page - 1}`)
                    .setLabel("Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 0),

                new ButtonBuilder()
                    .setCustomId(`members_page:${page + 1}`)
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            )
    ];
}

async function buildMembersPage(interaction, page = 0) {
    const club =
        await db.get(
            `SELECT * FROM clubs WHERE guild_id = ?`,
            [interaction.guild.id]
        );

    if (!club) {
        return {
            error: "No club linked. Use /linkclub first."
        };
    }

    const [members, info, crestUrl, linkedRows] =
        await Promise.all([
            eaApi.getMembersStats(club.club_id),
            eaApi.getClubInfo(club.club_id),
            getCrestUrl(club.club_id),
            getLinkedRows(db, interaction.guild.id)
        ]);

    const list =
        Array.isArray(members?.members)
            ? members.members
            : [];

    if (!list.length) {
        return {
            error: "No current members found for this club."
        };
    }

    const clubName =
        info?.[String(club.club_id)]?.name || "Club";

    const shown =
        list.slice(0, MAX_MEMBERS_SHOWN);

    const totalPages =
        Math.min(MAX_MEMBER_PAGES, shown.length);

    const pageSize =
        Math.min(
            25,
            Math.ceil(shown.length / totalPages)
        );

    const safePage =
        Math.max(
            0,
            Math.min(
                Number(page || 0),
                totalPages - 1
            )
        );

    const pageMembers =
        shown.slice(
            safePage * pageSize,
            safePage * pageSize + pageSize
        );

    const linkedMaps =
        buildLinkedMaps(linkedRows);

    const notPlayed =
        list.filter(
            member =>
                Number(member.gamesPlayed || 0) === 0
        ).length;

    const embed =
        new EmbedBuilder()
            .setColor("#ffffff")
            .setTitle(
                `Members of ${underline(clubName)}`
            )
            .setDescription(
                infoBlock([
                    `**${clubName}** has ${list.length} member${list.length === 1 ? "" : "s"}, ${notPlayed} have not played a game yet.`,
                    `Showing page ${safePage + 1} of ${totalPages}.`
                ])
            )
            .setFooter({
                ...FOOTER,
                text:
                    `${FOOTER.text} - Page ${safePage + 1}/${totalPages}`
            });

    if (crestUrl) {
        embed.setThumbnail(crestUrl);
    }

    for (const member of pageMembers) {
        embed.addFields({
            name: "\u200b",
            value: memberBlock(member, linkedMaps),
            inline: true
        });
    }

    return {
        embeds: [embed],
        components: buildPageButtons(
            safePage,
            totalPages
        )
    };
}

async function handleMembersPageButton(interaction) {
    const page =
        Number(
            interaction.customId.split(":")[1] || 0
        );

    const payload =
        await buildMembersPage(
            interaction,
            page
        );

    if (payload.error) {
        return interaction.reply({
            content: payload.error,
            ephemeral: true
        });
    }

    return interaction.update(payload);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("members")
        .setDescription(
            "Show all current club members and stats"
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const payload =
                await buildMembersPage(
                    interaction,
                    0
                );

            if (payload.error) {
                return interaction.editReply(
                    payload.error
                );
            }

            await interaction.editReply(
                payload
            );
        } catch (err) {
            console.error(
                "members error:",
                err
            );

            await interaction.editReply(
                "Failed to load members."
            );
        }
    },

    handleMembersPageButton
};
```
