const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const db = require("../Utils/db");
const {
    FOOTER,
    escapeMarkdown
} = require("../Utils/embedStyle");

function optionValues(interaction) {
    return [1, 2, 3, 4, 5]
        .map(index => interaction.options.getString(`option${index}`))
        .filter(Boolean);
}

function buildButtons(pollId, options) {
    const row =
        new ActionRowBuilder();

    options.forEach((option, index) => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`poll_vote:${pollId}:${index}`)
                .setLabel(String(index + 1))
                .setStyle(ButtonStyle.Secondary)
        );
    });

    return row;
}

async function renderPoll(pollId) {
    const poll =
        await db.get(
            `SELECT * FROM polls WHERE poll_id = ?`,
            [pollId]
        );

    if (!poll) return null;

    const options =
        JSON.parse(poll.options_json || "[]");
    const votes =
        await db.all(
            `
            SELECT option_index, COUNT(*) AS total
            FROM poll_votes
            WHERE poll_id = ?
            GROUP BY option_index
            `,
            [pollId]
        );
    const totals =
        new Map(
            votes.map(row => [
                Number(row.option_index),
                Number(row.total || 0)
            ])
        );
    const totalVotes =
        [...totals.values()]
            .reduce((sum, value) => sum + value, 0);
    const lines =
        options.map((option, index) => {
            const count = totals.get(index) || 0;
            const percent =
                totalVotes
                    ? Math.round((count / totalVotes) * 100)
                    : 0;

            return `**${index + 1}.** ${escapeMarkdown(option)} - **${count}** vote${count === 1 ? "" : "s"} (${percent}%)`;
        });

    const embed =
        new EmbedBuilder()
            .setColor("#ffffff")
            .setTitle(`\u{1F5F3}\uFE0F ${escapeMarkdown(poll.question)}`)
            .setDescription(lines.join("\n"))
            .setFooter({
                text: `${FOOTER.text} - ${totalVotes} total vote${totalVotes === 1 ? "" : "s"}`
            });

    return {
        poll,
        options,
        embed,
        components: [buildButtons(pollId, options)]
    };
}

function guidedModal() {
    return new ModalBuilder()
        .setCustomId("poll_guided_submit")
        .setTitle("Create a Poll")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("question")
                    .setLabel("Question")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("options")
                    .setLabel("Options (one per line, 2-5)")
                    .setPlaceholder("Yes\nNo\nMaybe")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            )
        );
}

async function createPoll(interaction, question, options) {
    const pollId = `${interaction.id}`;
    await db.run(
        `
        INSERT INTO polls
        (poll_id, guild_id, channel_id, message_id, creator_id, question, options_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            pollId,
            interaction.guild.id,
            interaction.channel.id,
            null,
            interaction.user.id,
            question,
            JSON.stringify(options),
            Date.now()
        ]
    );
    const rendered = await renderPoll(pollId);
    const message = await interaction.editReply({
        embeds: [rendered.embed],
        components: rendered.components
    });
    await db.run(
        `UPDATE polls SET message_id = ? WHERE poll_id = ?`,
        [message.id, pollId]
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("poll")
        .setDescription("Create a poll")
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Create a multiple-choice poll")
                .addStringOption(option =>
                    option
                        .setName("question")
                        .setDescription("Poll question")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("option1")
                        .setDescription("First option")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("option2")
                        .setDescription("Second option")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("option3")
                        .setDescription("Third option")
                )
                .addStringOption(option =>
                    option
                        .setName("option4")
                        .setDescription("Fourth option")
                )
                .addStringOption(option =>
                    option
                        .setName("option5")
                        .setDescription("Fifth option")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("guided")
                .setDescription("Mobile-friendly guided poll setup")
        ),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === "guided") {
            return interaction.showModal(guidedModal());
        }
        await interaction.deferReply();

        try {
            const options =
                optionValues(interaction);
            await createPoll(
                interaction,
                interaction.options.getString("question"),
                options
            );
        } catch (err) {
            console.error("poll error:", err);
            await interaction.editReply("Failed to create poll.");
        }
    },

    async handleGuidedModal(interaction) {
        const options = interaction.fields
            .getTextInputValue("options")
            .split(/\r?\n/)
            .map(value => value.trim())
            .filter(Boolean)
            .slice(0, 5);
        if (options.length < 2) {
            return interaction.reply({
                content: "Enter at least two options, one per line.",
                flags: MessageFlags.Ephemeral
            });
        }
        await interaction.deferReply();
        try {
            return await createPoll(
                interaction,
                interaction.fields.getTextInputValue("question").trim(),
                options
            );
        } catch (err) {
            console.error("guided poll error:", err);
            return interaction.editReply("Failed to create poll.");
        }
    },

    async handleVote(interaction) {
        const [, pollId, optionIndexRaw] =
            interaction.customId.split(":");
        const optionIndex =
            Number(optionIndexRaw);

        await db.run(
            `
            INSERT OR REPLACE INTO poll_votes
            (poll_id, guild_id, user_id, option_index, voted_at)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                pollId,
                interaction.guild.id,
                interaction.user.id,
                optionIndex,
                Date.now()
            ]
        );

        const rendered =
            await renderPoll(pollId);

        if (!rendered) {
            return interaction.reply({
                content: "That poll no longer exists.",
                ephemeral: true
            });
        }

        await interaction.update({
            embeds: [rendered.embed],
            components: rendered.components
        });
    }
};
