const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    FOOTER,
    escapeMarkdown,
    splitDescription
} = require("../Utils/embedStyle");
const {
    calculateStandings,
    getWorldCupData
} = require("../Services/worldCupApi");

const BASE_URL =
    "https://bellaciaofc.com/fan-hub/world-cup";
const GOLD =
    "#d4af37";

const SECTIONS = {
    tournament: {
        label: "Tournament",
        description: "Live tournament overview and registration status."
    },
    info: {
        label: "Info & Rules",
        description: "Read the format, schedule and tournament rules."
    },
    participants: {
        label: "Participants",
        description: "See every registered player and their drawn nation."
    },
    draw: {
        label: "Live Draw",
        description: "Follow the nation and group draws."
    },
    groups: {
        label: "Groups",
        description: "View the drawn groups and live standings."
    },
    fixtures: {
        label: "Fixtures",
        description: "See upcoming and live fixtures."
    },
    results: {
        label: "Results",
        description: "View completed tournament results."
    },
    bracket: {
        label: "Bracket",
        description: "Follow the knockout bracket."
    },
    awards: {
        label: "Hall of Fame",
        description: "See tournament leaders and awards."
    },
    raffle: {
        label: "Raffle",
        description: "Open the World Cup raffle."
    }
};

const STATUS_LABELS = {
    draft: "Coming Soon",
    registration_open: "Registration Open",
    registration_closed: "Registration Closed",
    draw: "Draw in Progress",
    group_stage: "Group Stage",
    knockout: "Knockouts",
    completed: "Completed"
};

const STAGE_LABELS = {
    group: "Group Stage",
    r16: "Round of 16",
    qf: "Quarter-Final",
    sf: "Semi-Final",
    third: "Third Place",
    final: "Final"
};

function sectionUrl(section) {
    return `${BASE_URL}/${section}`;
}

function linkButton(section) {
    return new ButtonBuilder()
        .setLabel(SECTIONS[section].label)
        .setStyle(ButtonStyle.Link)
        .setURL(sectionUrl(section));
}

function linkRows() {
    const sections =
        Object.keys(SECTIONS);

    return [
        new ActionRowBuilder()
            .addComponents(
                ...sections.slice(0, 5).map(linkButton)
            ),
        new ActionRowBuilder()
            .addComponents(
                ...sections.slice(5, 10).map(linkButton)
            )
    ];
}

function websiteRow(section) {
    return new ActionRowBuilder()
        .addComponents(linkButton(section));
}

function maps(data) {
    return {
        participant:
            new Map(data.participants.map(row => [row.id, row])),
        nation:
            new Map(data.nations.map(row => [row.id, row])),
        group:
            new Map(data.groups.map(row => [row.id, row]))
    };
}

function participantLabel(participant, nation) {
    if (!participant) {
        return "TBD";
    }

    return `${nation?.flag_emoji || "🏳️"} ${escapeMarkdown(participant.username)}`;
}

function matchSides(match, lookup) {
    const home =
        lookup.participant.get(match.home_participant_id);
    const away =
        lookup.participant.get(match.away_participant_id);
    const homeNation =
        lookup.nation.get(
            match.home_nation_id ||
            home?.nation_id
        );
    const awayNation =
        lookup.nation.get(
            match.away_nation_id ||
            away?.nation_id
        );

    return {
        home,
        away,
        homeNation,
        awayNation
    };
}

function discordTime(value, style = "f") {
    const timestamp =
        Math.floor(new Date(value).getTime() / 1000);

    return Number.isFinite(timestamp)
        ? `<t:${timestamp}:${style}>`
        : "TBC";
}

function baseEmbed(section) {
    return new EmbedBuilder()
        .setColor(GOLD)
        .setTitle(`World Cup 2026 - ${SECTIONS[section].label}`)
        .setURL(sectionUrl(section))
        .setFooter(FOOTER)
        .setTimestamp();
}

function overviewEmbed(data) {
    const assigned =
        data.participants.filter(row => row.nation_id).length;
    const placed =
        data.participants.filter(row => row.group_id).length;
    const finished =
        data.matches.filter(row => row.status === "finished").length;
    const closes =
        data.tournament.registration_closes_at
            ? discordTime(data.tournament.registration_closes_at, "R")
            : "Not set";

    return baseEmbed("tournament")
        .setDescription(
            [
                `**Status:** ${STATUS_LABELS[data.tournament.status] || data.tournament.status}`,
                `**Registered:** ${data.participants.length}${data.tournament.max_participants ? `/${data.tournament.max_participants}` : ""}`,
                `**Nations drawn:** ${assigned}/${data.participants.length}`,
                `**Players grouped:** ${placed}/${data.participants.length}`,
                `**Matches:** ${finished} finished, ${data.matches.length - finished} remaining`,
                `**Registration closes:** ${closes}`
            ].join("\n")
        );
}

function participantsEmbeds(data) {
    const lookup =
        maps(data);
    const lines =
        data.participants.map((participant, index) => {
            const nation =
                lookup.nation.get(participant.nation_id);
            const group =
                lookup.group.get(participant.group_id);

            return `**${index + 1}. ${escapeMarkdown(participant.username)}** - ${nation ? `${nation.flag_emoji} ${nation.name}` : "Nation awaiting draw"}${group ? ` - ${group.name}` : ""}`;
        });
    const chunks =
        splitDescription(
            lines.length
                ? lines
                : ["No participants registered yet."]
        );

    return chunks.map((description, index) =>
        baseEmbed("participants")
            .setTitle(
                chunks.length > 1
                    ? `World Cup 2026 - Participants (${index + 1}/${chunks.length})`
                    : "World Cup 2026 - Participants"
            )
            .setDescription(description)
    );
}

function groupsEmbeds(data) {
    const lookup =
        maps(data);
    const embed =
        baseEmbed("groups")
            .setDescription(
                data.groups.length
                    ? "Live standings. Top two from each group advance."
                    : "Groups have not been generated yet."
            );

    for (const group of data.groups.slice(0, 24)) {
        const participants =
            data.participants.filter(row =>
                row.group_id === group.id
            );
        const matches =
            data.matches.filter(row =>
                row.group_id === group.id
            );
        const standings =
            calculateStandings(participants, matches);
        const value =
            standings.length
                ? standings.map((row, index) => {
                    const nation =
                        lookup.nation.get(row.participant.nation_id);
                    const gd =
                        row.gd > 0 ? `+${row.gd}` : row.gd;

                    return `${index + 1}. ${nation?.flag_emoji || "🏳️"} **${escapeMarkdown(row.participant.username)}** - ${row.points} pts (${row.played}P, GD ${gd})`;
                }).join("\n")
                : "Awaiting group draw.";

        embed.addFields({
            name: group.name,
            value,
            inline: false
        });
    }

    return [embed];
}

function fixtureLine(match, lookup) {
    const {
        home,
        away,
        homeNation,
        awayNation
    } =
        matchSides(match, lookup);
    const group =
        lookup.group.get(match.group_id);
    const status =
        match.status === "live"
            ? `**LIVE ${match.home_score ?? 0}-${match.away_score ?? 0}**`
            : match.scheduled_at
                ? discordTime(match.scheduled_at, "f")
                : "Time TBC";

    return [
        `${participantLabel(home, homeNation)} vs ${participantLabel(away, awayNation)}`,
        `${group?.name || STAGE_LABELS[match.stage] || match.stage} - ${status}`
    ].join("\n");
}

function fixturesEmbeds(data) {
    const lookup =
        maps(data);
    const fixtures =
        data.matches.filter(row =>
            row.status !== "finished"
        );
    const lines =
        fixtures.map(match =>
            fixtureLine(match, lookup)
        );
    const chunks =
        splitDescription(
            lines.length
                ? lines
                : ["No upcoming fixtures yet."]
        );

    return chunks.map((description, index) =>
        baseEmbed("fixtures")
            .setTitle(
                chunks.length > 1
                    ? `World Cup 2026 - Fixtures (${index + 1}/${chunks.length})`
                    : "World Cup 2026 - Fixtures"
            )
            .setDescription(description)
    );
}

function resultLine(match, lookup) {
    const {
        home,
        away,
        homeNation,
        awayNation
    } =
        matchSides(match, lookup);
    const group =
        lookup.group.get(match.group_id);

    return [
        `${participantLabel(home, homeNation)} **${match.home_score}-${match.away_score}** ${participantLabel(away, awayNation)}`,
        group?.name || STAGE_LABELS[match.stage] || match.stage
    ].join("\n");
}

function resultsEmbeds(data) {
    const lookup =
        maps(data);
    const results =
        data.matches.filter(row =>
            row.status === "finished"
        );
    const lines =
        results.map(match =>
            resultLine(match, lookup)
        );
    const chunks =
        splitDescription(
            lines.length
                ? lines
                : ["No results yet."]
        );

    return chunks.map((description, index) =>
        baseEmbed("results")
            .setTitle(
                chunks.length > 1
                    ? `World Cup 2026 - Results (${index + 1}/${chunks.length})`
                    : "World Cup 2026 - Results"
            )
            .setDescription(description)
    );
}

function bracketEmbeds(data) {
    const lookup =
        maps(data);
    const knockout =
        data.matches.filter(row =>
            row.stage !== "group"
        );
    const embed =
        baseEmbed("bracket")
            .setDescription(
                knockout.length
                    ? "Live knockout bracket."
                    : "The knockout bracket has not been generated yet."
            );

    for (const stage of ["r16", "qf", "sf", "third", "final"]) {
        const matches =
            knockout.filter(row => row.stage === stage);

        if (!matches.length) {
            continue;
        }

        embed.addFields({
            name: STAGE_LABELS[stage],
            value:
                matches
                    .map(match =>
                        match.status === "finished"
                            ? resultLine(match, lookup)
                            : fixtureLine(match, lookup)
                    )
                    .join("\n\n")
                    .slice(0, 1024)
        });
    }

    return [embed];
}

function awardsEmbed(data) {
    const lookup =
        maps(data);
    const goals =
        new Map();

    for (const match of data.matches) {
        if (match.status !== "finished") {
            continue;
        }

        if (match.home_participant_id) {
            goals.set(
                match.home_participant_id,
                (goals.get(match.home_participant_id) || 0) +
                Number(match.home_score || 0)
            );
        }

        if (match.away_participant_id) {
            goals.set(
                match.away_participant_id,
                (goals.get(match.away_participant_id) || 0) +
                Number(match.away_score || 0)
            );
        }
    }

    const leaders =
        [...goals.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([participantId, total], index) => {
                const participant =
                    lookup.participant.get(participantId);
                const nation =
                    lookup.nation.get(participant?.nation_id);

                return `${index + 1}. ${participantLabel(participant, nation)} - **${total}** goals`;
            });

    return baseEmbed("awards")
        .setDescription(
            leaders.length
                ? `**Tournament scoring leaders**\n${leaders.join("\n")}`
                : "Awards and scoring leaders will appear after results are recorded."
        );
}

function liveEmbeds(section, data) {
    if (section === "tournament") return [overviewEmbed(data)];
    if (section === "participants") return participantsEmbeds(data);
    if (section === "groups") return groupsEmbeds(data);
    if (section === "fixtures") return fixturesEmbeds(data);
    if (section === "results") return resultsEmbeds(data);
    if (section === "bracket") return bracketEmbeds(data);
    if (section === "awards") return [awardsEmbed(data)];
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("worldcup")
        .setDescription("Open the Bella Ciao FC World Cup tournament hub")
        .addStringOption(option =>
            option
                .setName("section")
                .setDescription("Show live tournament data or open a page")
                .addChoices(
                    ...Object.entries(SECTIONS)
                        .map(([value, item]) => ({
                            name: item.label,
                            value
                        }))
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const section =
            interaction.options.getString("section") ||
            "tournament";

        try {
            const data =
                await getWorldCupData();
            const embeds =
                data && liveEmbeds(section, data);

            if (embeds) {
                return interaction.editReply({
                    embeds: embeds.slice(0, 10),
                    components:
                        section === "tournament"
                            ? linkRows()
                            : [websiteRow(section)]
                });
            }
        } catch (err) {
            console.error(
                "world cup live data error:",
                err?.message || err
            );
        }

        const item =
            SECTIONS[section];
        const embed =
            baseEmbed(section)
                .setDescription(
                    [
                        item.description,
                        "",
                        "Live data is temporarily unavailable. Open the website for the latest information."
                    ].join("\n")
                );

        return interaction.editReply({
            embeds: [embed],
            components: [websiteRow(section)]
        });
    }
};
