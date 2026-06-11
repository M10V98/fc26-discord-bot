const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    StringSelectMenuBuilder
} = require("discord.js");

const db = require("../Utils/db");
const {
    FOOTER,
    escapeMarkdown,
    splitDescription
} = require("../Utils/embedStyle");
const {
    calculateStandings,
    getRaffleData,
    getWorldCupData
} = require("../Services/worldCupApi");
const {
    getNationLiveData
} = require("../Services/worldCupSportsDb");

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
    },
    mynation: {
        label: "My Nations",
        description: "Link your website account and follow your raffle nations."
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

const RAFFLE_STATUS_LABELS = {
    draft: "Coming Soon",
    registration_open: "Registration Open",
    registration_closed: "Registration Closed",
    draw: "Draw in Progress",
    active: "Raffle Live",
    completed: "Completed"
};

const NATION_STATUS = {
    active: ["🟢", "Active"],
    group_stage: ["🟢", "Group Stage"],
    r16: ["🔵", "Round of 16"],
    quarter_finals: ["🔵", "Quarter-Finals"],
    semi_finals: ["🟣", "Semi-Finals"],
    final: ["🟠", "Final"],
    third_place: ["🟠", "Third Place Match"],
    champion: ["🏆", "Champion"],
    runner_up: ["🥈", "Runner-Up"],
    third: ["🥉", "Third Place"],
    eliminated: ["🔴", "Eliminated"]
};

function sectionUrl(section) {
    return section === "mynation"
        ? `${BASE_URL}/follow`
        : `${BASE_URL}/${section}`;
}

function linkButton(section) {
    return new ButtonBuilder()
        .setLabel(SECTIONS[section].label)
        .setStyle(ButtonStyle.Link)
        .setURL(sectionUrl(section));
}

function linkRows() {
    const sections =
        Object.keys(SECTIONS)
            .filter(section => section !== "mynation");

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

function rafflePool(data) {
    const confirmed =
        data.contributions
            .filter(row => row.confirmed)
            .reduce(
                (total, row) =>
                    total + Number(row.amount_pence || 0),
                0
            );

    return Number(data.raffle.pool_total_pence || 0) ||
        confirmed;
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

function pounds(pence) {
    return new Intl.NumberFormat(
        "en-GB",
        {
            style: "currency",
            currency: "GBP",
            minimumFractionDigits:
                Number(pence || 0) % 100 === 0
                    ? 0
                    : 2
        }
    ).format(Number(pence || 0) / 100);
}

function raffleEmbeds(data) {
    const participantByUserId =
        new Map(
            data.participants.map(participant => [
                participant.user_id,
                participant
            ])
        );
    const assignmentByNationId =
        new Map(
            data.assignments.map(assignment => [
                assignment.nation_id,
                assignment
            ])
        );
    const pool =
        rafflePool(data);
    const summary =
        baseEmbed("raffle")
            .setTitle("🎟️ World Cup 2026 - Raffle Draw")
            .setDescription(
                [
                    `**Status:** ${RAFFLE_STATUS_LABELS[data.raffle.status] || data.raffle.status}`,
                    `👥 **Participants:** ${data.participants.length}`,
                    `🌍 **Nations assigned:** ${data.assignments.length}/${data.nations.length}`,
                    `💷 **Community pool:** ${pounds(pool)}`,
                    "",
                    data.assignments.length
                        ? "The raffle draw has taken place. Every nation and owner is listed below."
                        : "The raffle draw has not started yet."
                ].join("\n")
            );
    const lines =
        data.nations.map(nation => {
            const assignment =
                assignmentByNationId.get(nation.id);
            const participant =
                participantByUserId.get(assignment?.user_id);
            const [statusEmoji, statusLabel] =
                NATION_STATUS[assignment?.status] ||
                ["⚪", assignment ? "Awaiting Tournament" : "Awaiting Draw"];

            return `${nation.flag_emoji || "🏳️"} **${escapeMarkdown(nation.name)}** — ${participant ? escapeMarkdown(participant.username) : "Unassigned"}\n↳ ${statusEmoji} ${statusLabel}`;
        });
    const chunks =
        splitDescription(
            lines.length
                ? lines
                : ["No raffle nations are available yet."],
            3800
        );
    const drawEmbeds =
        chunks.map((description, index) =>
            baseEmbed("raffle")
                .setTitle(
                    `🌍 Raffle Nation Draw (${index + 1}/${chunks.length})`
                )
                .setDescription(description)
        );

    return [summary, ...drawEmbeds];
}

function eventTime(event) {
    const raw =
        event.strTimestamp ||
        (
            event.dateEvent
                ? `${event.dateEvent}T${event.strTime || "00:00:00"}Z`
                : null
        );

    return raw
        ? discordTime(raw, "f")
        : "Time TBC";
}

function upcomingLines(events) {
    return events.length
        ? events.slice(0, 3).map(event =>
            `${event.strHomeTeam} vs ${event.strAwayTeam}\n${eventTime(event)}${event.strGroup ? ` - Group ${event.strGroup}` : ""}`
        ).join("\n\n")
        : "No upcoming World Cup matches available yet.";
}

function resultLines(events) {
    return events.length
        ? events.slice(0, 3).map(event =>
            `${event.strHomeTeam} **${event.intHomeScore ?? "-"}-${event.intAwayScore ?? "-"}** ${event.strAwayTeam}\n${eventTime(event)}`
        ).join("\n\n")
        : "No World Cup results available yet.";
}

function tableLines(rows) {
    return rows.length
        ? rows.map(row => {
            const gd =
                Number(row.intGoalDifference || 0);

            return `${row.intRank}. **${escapeMarkdown(row.strTeam)}** - ${row.intPoints} pts | ${row.intPlayed}P ${row.intWin}W ${row.intDraw}D ${row.intLoss}L | GD ${gd > 0 ? "+" : ""}${gd}`;
        }).join("\n")
        : "Group standings have not been published yet.";
}

function progressLabel(status) {
    const labels = {
        active: "Group Stage",
        group_stage: "Group Stage",
        r16: "Round of 16",
        quarter_finals: "Quarter-Final",
        semi_finals: "Semi-Final",
        third_place: "Third Place Match",
        final: "Final",
        champion: "World Champion",
        runner_up: "Runner-Up",
        third: "Third Place",
        eliminated: "Eliminated"
    };

    return labels[status] || "Awaiting Tournament";
}

function prizeLabel(status) {
    if (status === "champion") return "🏆 Winner prize secured";
    if (status === "runner_up") return "🥈 Runner-up prize secured";
    if (status === "third") return "🥉 Third-place prize secured";
    if (status === "eliminated") return "❌ No longer eligible";
    return "✅ Still eligible for a prize";
}

function myNationEmbeds(data, participant, nationData) {
    const active =
        nationData.filter(item =>
            item.assignment.status !== "eliminated"
        ).length;
    const summary =
        baseEmbed("mynation")
            .setTitle(`🌍 My Nations - ${escapeMarkdown(participant.username)}`)
            .setDescription(
                [
                    `🎟️ **Assigned nations:** ${nationData.length}`,
                    `🟢 **Still active:** ${active}`,
                    `🔴 **Eliminated:** ${nationData.length - active}`,
                    `💷 **Community pool:** ${pounds(rafflePool(data))}`,
                    "",
                    nationData.map(item =>
                        `${item.nation.flag_emoji || "🏳️"} **${escapeMarkdown(item.nation.name)}** - ${progressLabel(item.assignment.status)}`
                    ).join("\n")
                ].join("\n")
            );
    const details =
        nationData.map(item => {
            const {
                nation,
                assignment,
                live
            } = item;
            const [statusEmoji, statusLabel] =
                NATION_STATUS[assignment.status] ||
                ["⚪", "Awaiting Tournament"];
            const standing =
                live.standing;
            const embed =
                baseEmbed("mynation")
                    .setTitle(
                        `${nation.flag_emoji || "🏳️"} ${nation.name}`
                    )
                    .setDescription(
                        [
                            `${statusEmoji} **${statusLabel}**`,
                            `🏁 **Tournament progress:** ${progressLabel(assignment.status)}`,
                            `🎁 **Prize eligibility:** ${prizeLabel(assignment.status)}`,
                            standing
                                ? `📊 **Position:** ${standing.intRank} | **Points:** ${standing.intPoints} | **Record:** ${standing.intPlayed}P ${standing.intWin}W ${standing.intDraw}D ${standing.intLoss}L | **GD:** ${standing.intGoalDifference}`
                                : "📊 **Standings:** Awaiting published World Cup table"
                        ].join("\n")
                    )
                    .addFields(
                        {
                            name: "📅 Upcoming Matches",
                            value: upcomingLines(live.upcoming)
                        },
                        {
                            name: "⚽ Results",
                            value: resultLines(live.recent)
                        },
                        {
                            name: `📋 ${standing?.strDescription || "Group Table"}`,
                            value: tableLines(live.groupStandings).slice(0, 1024)
                        }
                    );

            if (live.team?.strTeamBadge) {
                embed.setThumbnail(live.team.strTeamBadge);
            }

            return embed;
        });

    return [summary, ...details];
}

function participantAssignments(data, participant) {
    const nationById =
        new Map(data.nations.map(nation => [nation.id, nation]));

    return data.assignments
        .filter(assignment =>
            assignment.user_id === participant.user_id
        )
        .map(assignment => ({
            assignment,
            nation: nationById.get(assignment.nation_id)
        }))
        .filter(item => item.nation);
}

async function loadMyNationEmbeds(data, participant) {
    const assignments =
        participantAssignments(data, participant);
    const live =
        await Promise.all(
            assignments.map(item =>
                getNationLiveData(item.nation.name)
                    .catch(err => {
                        console.error(
                            `World Cup live nation error (${item.nation.name}):`,
                            err?.message || err
                        );

                        return {
                            team: null,
                            standing: null,
                            groupStandings: [],
                            upcoming: [],
                            recent: []
                        };
                    })
            )
        );

    return myNationEmbeds(
        data,
        participant,
        assignments.map((item, index) => ({
            ...item,
            live: live[index]
        }))
    );
}

function accountLinkResponse(data) {
    const options =
        data.participants
            .slice(0, 25)
            .map(participant => {
                const count =
                    participantAssignments(data, participant).length;

                return {
                    label: participant.username.slice(0, 100),
                    value: participant.user_id,
                    description:
                        `${count} drawn nation${count === 1 ? "" : "s"}`
                };
            });
    const embed =
        baseEmbed("mynation")
            .setTitle("🔗 Link Your World Cup Raffle Account")
            .setDescription(
                "Choose your website username below. This private linking step is only visible to you; your My Nations dashboard will then post normally."
            );
    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("worldcup_mynation_link")
            .setPlaceholder("Choose your website username")
            .addOptions(options);

    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(menu)
        ]
    };
}

async function raffleLink(interaction) {
    return db.get(
        `
        SELECT *
        FROM world_cup_raffle_links
        WHERE guild_id = ?
        AND discord_id = ?
        `,
        [interaction.guild.id, interaction.user.id]
    );
}

function linkedParticipant(link, data) {
    return link
        ? data.participants.find(participant =>
            participant.user_id === link.website_user_id
        )
        : null;
}

async function handleMyNationSelect(interaction) {
    await interaction.update({
        content:
            "Account linked. Publishing your My Nations dashboard...",
        embeds: [],
        components: []
    });

    const data =
        await getRaffleData();
    const participant =
        data?.participants.find(row =>
            row.user_id === interaction.values[0]
        );

    if (!participant) {
        return interaction.followUp({
            content:
                "That website account is no longer in the raffle.",
            flags: MessageFlags.Ephemeral
        });
    }

    await db.run(
        `
        INSERT OR REPLACE INTO world_cup_raffle_links
        (guild_id, discord_id, website_user_id, website_username, linked_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            interaction.guild.id,
            interaction.user.id,
            participant.user_id,
            participant.username,
            Date.now()
        ]
    );

    const embeds =
        await loadMyNationEmbeds(data, participant);

    return interaction.followUp({
        embeds: embeds.slice(0, 10),
        components: [websiteRow("mynation")]
    });
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
    accountLinkResponse,
    handleMyNationSelect,
    myNationEmbeds,
    raffleEmbeds,

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
        const section =
            interaction.options.getString("section") ||
            "tournament";

        try {
            if (section === "mynation") {
                const link =
                    await raffleLink(interaction);

                await interaction.deferReply(
                    link
                        ? {}
                        : { flags: MessageFlags.Ephemeral }
                );

                const data =
                    await getRaffleData();
                const participant =
                    data
                        ? linkedParticipant(link, data)
                        : null;

                if (!data) {
                    throw new Error("Raffle data unavailable");
                }

                if (!participant) {
                    if (link) {
                        await db.run(
                            `
                            DELETE FROM world_cup_raffle_links
                            WHERE guild_id = ?
                            AND discord_id = ?
                            `,
                            [
                                interaction.guild.id,
                                interaction.user.id
                            ]
                        );

                        return interaction.editReply({
                            embeds: [
                                baseEmbed("mynation")
                                    .setTitle("🔗 Account Link Expired")
                                    .setDescription(
                                        "Your linked website account is no longer in the raffle. Run `/worldcup section:My Nations` again to privately choose an account."
                                    )
                            ],
                            components: []
                        });
                    }

                    return interaction.editReply(
                        accountLinkResponse(data)
                    );
                }

                const embeds =
                    await loadMyNationEmbeds(data, participant);

                return interaction.editReply({
                    embeds: embeds.slice(0, 10),
                    components: [websiteRow("mynation")]
                });
            }

            await interaction.deferReply();

            const data =
                section === "raffle"
                    ? await getRaffleData()
                    : await getWorldCupData();
            const embeds =
                data &&
                (
                    section === "raffle"
                        ? raffleEmbeds(data)
                        : liveEmbeds(section, data)
                );

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

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
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
