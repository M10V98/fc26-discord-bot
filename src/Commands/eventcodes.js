const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../Utils/db");
const eaApi = require("../Services/eaApi");
const {
    aggregateEventCodes,
    configuredEventCodes,
    enrichPlayerStats
} = require("../Utils/matchEvents");
const {
    FOOTER,
    number
} = require("../Utils/embedStyle");

function n(value) {
    return Number(value || 0);
}

async function getMatches(clubId, mode, count) {
    if (mode === "comp") {
        return eaApi.getMatches(
            clubId,
            "friendlyMatch",
            {
                forceRefresh: true,
                maxResultCount: count
            }
        );
    }

    const [league, playoff] =
        await Promise.all([
            eaApi.getMatches(
                clubId,
                "leagueMatch",
                {
                    forceRefresh: true,
                    maxResultCount: count
                }
            ).catch(() => []),
            eaApi.getMatches(
                clubId,
                "playoffMatch",
                {
                    forceRefresh: true,
                    maxResultCount: count
                }
            ).catch(() => [])
        ]);

    return [
        ...league,
        ...playoff
    ]
        .filter(match => match?.matchId && match.timestamp != null)
        .sort((a, b) => n(b.timestamp) - n(a.timestamp))
        .slice(0, count);
}

function addCodes(total, codes) {
    for (const [code, count] of Object.entries(codes || {})) {
        total[code] = n(total[code]) + n(count);
    }
}

function codeText(codes, limit = 35) {
    const rows =
        Object.entries(codes || {})
            .sort((a, b) => {
                const diff = n(b[1]) - n(a[1]);
                if (diff !== 0) return diff;
                return n(a[0]) - n(b[0]);
            })
            .slice(0, limit)
            .map(([code, count]) => `${code}:${count}`);

    return rows.join(" ") || "No aggregate codes";
}

function playerLine(player) {
    return [
        `Apps ${number(player.apps)}`,
        `Avg ${player.apps ? number(player.ratingTotal / player.apps, 1) : "0.0"}`,
        `G ${number(player.goals)}`,
        `A ${number(player.assists)}`,
        `2A ${number(player.secondAssists)}`,
        `P ${number(player.passes)}/${number(player.passAttempts)}`,
        `T ${number(player.tackles)}/${number(player.tackleAttempts)}`,
        `DRI ${number(player.dribbles)}`,
        `INT ${number(player.interceptions)}`
    ].join(" | ");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("eventcodes")
        .setDescription("Debug EA match event aggregate codes")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Which match source to inspect")
                .addChoices(
                    { name: "Divisions league/playoff", value: "divisions" },
                    { name: "Comp friendlies", value: "comp" }
                )
        )
        .addIntegerOption(option =>
            option
                .setName("matches")
                .setDescription("Recent match count")
                .addChoices(
                    { name: "Latest match", value: 1 },
                    { name: "Last 5", value: 5 },
                    { name: "Last 10", value: 10 }
                )
        )
        .addStringOption(option =>
            option
                .setName("player")
                .setDescription("Optional player name filter")
        ),

    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "Only server admins can use /eventcodes.",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const club =
                await db.get(
                    `SELECT * FROM clubs WHERE guild_id = ?`,
                    [interaction.guild.id]
                );

            if (!club) {
                return interaction.editReply(
                    "No club linked. Use /linkclub first."
                );
            }

            const mode =
                interaction.options.getString("mode") || "divisions";
            const count =
                interaction.options.getInteger("matches") || 10;
            const filter =
                String(interaction.options.getString("player") || "")
                    .toLowerCase()
                    .trim();
            const clubId =
                String(club.club_id);
            const matches =
                await getMatches(clubId, mode, count);

            if (!matches.length) {
                return interaction.editReply(
                    "No matches found for that event-code sample."
                );
            }

            const players = new Map();

            for (const match of matches) {
                for (const [playerId, rawPlayer] of Object.entries(match.players?.[clubId] || {})) {
                    const player =
                        enrichPlayerStats(rawPlayer);
                    const name =
                        player.playername || playerId;

                    if (
                        filter &&
                        !String(name).toLowerCase().includes(filter)
                    ) {
                        continue;
                    }

                    const current =
                        players.get(playerId) || {
                            playerId,
                            name,
                            apps: 0,
                            ratingTotal: 0,
                            goals: 0,
                            assists: 0,
                            secondAssists: 0,
                            passes: 0,
                            passAttempts: 0,
                            tackles: 0,
                            tackleAttempts: 0,
                            dribbles: 0,
                            interceptions: 0,
                            codes: {}
                        };

                    current.name = name;
                    current.apps += 1;
                    current.ratingTotal += n(player.rating);
                    current.goals += n(player.goals);
                    current.assists += n(player.assists);
                    current.secondAssists += n(player.secondassists || player.secondAssists);
                    current.passes += n(player.passesmade);
                    current.passAttempts += n(player.passattempts);
                    current.tackles += n(player.tacklesmade);
                    current.tackleAttempts += n(player.tackleattempts);
                    current.dribbles += n(player.dribbles);
                    current.interceptions += n(player.interceptions);

                    addCodes(
                        current.codes,
                        aggregateEventCodes(rawPlayer)
                    );

                    players.set(playerId, current);
                }
            }

            const rows =
                [...players.values()]
                    .sort((a, b) =>
                        a.name.localeCompare(b.name)
                    );

            if (!rows.length) {
                return interaction.editReply(
                    "No matching player event codes found."
                );
            }

            const mappings =
                configuredEventCodes();
            const description =
                rows
                    .slice(0, 8)
                    .map(player =>
                        [
                            `**${player.name}**`,
                            playerLine(player),
                            `Codes: ${codeText(player.codes)}`
                        ].join("\n")
                    )
                    .join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle("EA Event Code Debug")
                    .setDescription(description.slice(0, 4096))
                    .addFields({
                        name: "Current Hidden Stat Mapping",
                        value:
                            `Second assists: ${mappings.secondAssists.join(", ") || "-"}\n` +
                            `Dribbles: ${mappings.dribbles.join(", ") || "-"}\n` +
                            `Interceptions: ${mappings.interceptions.join(", ") || "-"}`
                    })
                    .setFooter({
                        ...FOOTER,
                        text: `${FOOTER.text} - ${matches.length} ${mode === "comp" ? "comp" : "division"} match sample`
                    });

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (err) {
            console.error("eventcodes error:", err);

            await interaction.editReply(
                "Failed to load event codes."
            );
        }
    }
};
