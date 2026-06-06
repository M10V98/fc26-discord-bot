const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    FOOTER
} = require("../Utils/embedStyle");

const BASE_URL =
    "https://bellaciaofc.com/fan-hub/world-cup";

const SECTIONS = {
    tournament: {
        label: "Tournament",
        description: "Register and view the tournament overview."
    },
    info: {
        label: "Info & Rules",
        description: "Read the format, schedule and tournament rules."
    },
    participants: {
        label: "Participants",
        description: "See every registered player."
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
        description: "See upcoming, live and completed fixtures."
    },
    results: {
        label: "Results",
        description: "View all completed tournament results."
    },
    bracket: {
        label: "Bracket",
        description: "Follow the knockout bracket."
    },
    awards: {
        label: "Hall of Fame",
        description: "See tournament champions and awards."
    },
    raffle: {
        label: "Raffle",
        description: "Open the World Cup raffle."
    }
};

function sectionUrl(section) {
    return `${BASE_URL}/${section}`;
}

function linkButton(section) {
    const item =
        SECTIONS[section];

    return new ButtonBuilder()
        .setLabel(item.label)
        .setStyle(ButtonStyle.Link)
        .setURL(sectionUrl(section));
}

function linkRows() {
    const sections =
        Object.keys(SECTIONS);

    return [
        new ActionRowBuilder()
            .addComponents(
                ...sections
                    .slice(0, 5)
                    .map(linkButton)
            ),
        new ActionRowBuilder()
            .addComponents(
                ...sections
                    .slice(5, 10)
                    .map(linkButton)
            )
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("worldcup")
        .setDescription("Open the Bella Ciao FC World Cup tournament hub")
        .addStringOption(option =>
            option
                .setName("section")
                .setDescription("Open a specific World Cup page")
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
            interaction.options.getString("section");

        if (section && SECTIONS[section]) {
            const item =
                SECTIONS[section];
            const embed =
                new EmbedBuilder()
                    .setColor("#d4af37")
                    .setTitle(`World Cup 2026 - ${item.label}`)
                    .setDescription(item.description)
                    .setURL(sectionUrl(section))
                    .setFooter(FOOTER);
            const row =
                new ActionRowBuilder()
                    .addComponents(linkButton(section));

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }

        const embed =
            new EmbedBuilder()
                .setColor("#d4af37")
                .setTitle("Bella Ciao FC World Cup 2026")
                .setURL(BASE_URL)
                .setDescription(
                    [
                        "The Discord gateway to the in-server World Cup tournament.",
                        "",
                        "Register, follow the live draw, check your nation and group, view fixtures, results and the knockout bracket.",
                        "",
                        `[Open the full World Cup hub](${BASE_URL})`
                    ].join("\n")
                )
                .setFooter(FOOTER);

        return interaction.reply({
            embeds: [embed],
            components: linkRows()
        });
    }
};
