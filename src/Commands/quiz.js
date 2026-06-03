const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../Utils/db");
const {
    FOOTER,
    number,
    escapeMarkdown
} = require("../Utils/embedStyle");

const QUESTIONS = [
    ["How many players can a Pro Clubs team control on the pitch?", ["11", "9", "7", "5"], 0],
    ["What does CAM stand for?", ["Central Attacking Midfielder", "Club Assist Manager", "Counter Attack Mid", "Central Area Marker"], 0],
    ["Which result gives 3 league points?", ["Win", "Draw", "Loss", "Abandon"], 0],
    ["What is a clean sheet?", ["Conceding zero goals", "Scoring three goals", "No cards", "100% passing"], 0],
    ["What does GK stand for?", ["Goalkeeper", "Goal Kick", "Game Key", "General Captain"], 0],
    ["Which position is usually deepest?", ["CB", "ST", "CAM", "RW"], 0],
    ["What does MOTM mean?", ["Man of the Match", "Match of the Month", "Most Open Teammate", "Midfield Overload Tactic"], 0],
    ["A hat trick is usually how many goals?", ["3", "2", "4", "5"], 0],
    ["Which stat rewards a final pass before a goal?", ["Assist", "Save", "Tackle", "Interception"], 0],
    ["What does CDM stand for?", ["Central Defensive Midfielder", "Club Defensive Manager", "Counter Direct Mid", "Central Dual Marker"], 0],
    ["What is a derby?", ["Rivalry match", "Cup final only", "Training game", "Penalty shootout"], 0],
    ["Which card removes a player from the match?", ["Red card", "Yellow card", "Green card", "Blue card"], 0],
    ["What does xG estimate?", ["Chance quality", "Sprint speed", "Pass length", "Shot power"], 0],
    ["Which formation has four defenders, three midfielders, three attackers?", ["4-3-3", "4-4-2", "3-5-2", "5-2-1-2"], 0],
    ["What is pressing?", ["Closing opponents quickly", "Shooting early", "Standing off", "Time wasting"], 0],
    ["What does LB stand for?", ["Left Back", "Long Ball", "League Bonus", "Late Block"], 0],
    ["What does RW stand for?", ["Right Winger", "Rear Wing", "Rating Winner", "Rapid Wide"], 0],
    ["What is a through ball?", ["Pass into space behind defenders", "Back pass to keeper", "Shot from halfway", "Cross from a corner"], 0],
    ["What is advantage?", ["Play continues after a foul if beneficial", "Extra goal awarded", "Free substitution", "Automatic corner"], 0],
    ["What is a false nine?", ["Striker who drops deeper", "Backup goalkeeper", "Wide centre back", "Defensive winger"], 0],
    ["What is jockeying used for?", ["Defensive positioning", "Celebrations", "Set pieces only", "Changing kit"], 0],
    ["What is a volley?", ["Shot before the ball lands", "Pass to goalkeeper", "Blocked tackle", "Low cross"], 0],
    ["What is a brace?", ["Two goals by one player", "Two yellow cards by a team", "Two saves in a row", "Two corners"], 0],
    ["Which role usually takes corners?", ["Set-piece taker", "Goalkeeper only", "Centre back only", "Referee"], 0],
    ["What does RB stand for?", ["Right Back", "Rapid Break", "Reserve Bench", "Rating Bonus"], 0]
];

const QUIZ_XP = 100;
const TIME_LIMIT_SECONDS = 30;

function questionFor(id) {
    return QUESTIONS[Number(id) % QUESTIONS.length];
}

function randomQuestionId() {
    return Math.floor(Math.random() * QUESTIONS.length);
}

function buildQuestionEmbed(questionId) {
    const [question, answers] =
        questionFor(questionId);

    return new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("\u{1F9E0} Quiz")
        .setDescription(
            [
                escapeMarkdown(question),
                "",
                ...answers.map((answer, index) =>
                    `**${index + 1}.** ${escapeMarkdown(answer)}`
                ),
                "",
                `You have **${TIME_LIMIT_SECONDS} seconds**. Correct answers earn **${QUIZ_XP} XP**.`
            ].join("\n")
        )
        .setFooter(FOOTER);
}

function buildButtons(questionId, userId, expiresAt) {
    const row =
        new ActionRowBuilder();

    for (let index = 0; index < 4; index++) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`quiz_answer:${userId}:${questionId}:${index}:${expiresAt}`)
                .setLabel(String(index + 1))
                .setStyle(ButtonStyle.Secondary)
        );
    }

    return row;
}

async function awardPlayerXp(guildId, userId, amount) {
    const linked =
        await db.get(
            `
            SELECT *
            FROM linked_players
            WHERE guild_id = ?
            AND discord_id = ?
            `,
            [guildId, userId]
        );

    if (!linked) return false;

    const result =
        await db.run(
            `
            UPDATE players
            SET xp = COALESCE(xp, 0) + ?,
                all_time_xp = COALESCE(all_time_xp, 0) + ?,
                season_xp = COALESCE(season_xp, 0) + ?
            WHERE guild_id = ?
            AND (
                player_id = ?
                OR player_name = ?
            )
            `,
            [
                amount,
                amount,
                amount,
                guildId,
                linked.player_id,
                linked.player_name
            ]
        );

    return result.changes > 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("quiz")
        .setDescription("Football quiz")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("Start a timed quiz question")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("leaderboard")
                .setDescription("Show quiz leaderboard")
        ),

    async execute(interaction) {
        const subcommand =
            interaction.options.getSubcommand();

        if (subcommand === "leaderboard") {
            await interaction.deferReply();

            const rows =
                await db.all(
                    `
                    SELECT *
                    FROM quiz_scores
                    WHERE guild_id = ?
                    ORDER BY correct DESC, xp_awarded DESC
                    LIMIT 10
                    `,
                    [interaction.guild.id]
                );
            const lines =
                rows.length
                    ? rows.map((row, index) =>
                        `**#${index + 1}** <@${row.user_id}> - ${number(row.correct)} correct, ${number(row.xp_awarded)} XP`
                    )
                    : ["No quiz scores yet."];
            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle("\u{1F9E0} Quiz Leaderboard")
                    .setDescription(lines.join("\n"))
                    .setFooter(FOOTER);

            return interaction.editReply({ embeds: [embed] });
        }

        const questionId =
            randomQuestionId();
        const expiresAt =
            Date.now() + (TIME_LIMIT_SECONDS * 1000);

        return interaction.reply({
            embeds: [buildQuestionEmbed(questionId)],
            components: [buildButtons(questionId, interaction.user.id, expiresAt)]
        });
    },

    async handleAnswer(interaction) {
        const [, userId, questionIdRaw, answerRaw, expiresAtRaw] =
            interaction.customId.split(":");

        if (interaction.user.id !== userId) {
            return interaction.reply({
                content: "That quiz question belongs to someone else.",
                ephemeral: true
            });
        }

        if (Date.now() > Number(expiresAtRaw)) {
            return interaction.update({
                content: "Time is up.",
                embeds: [],
                components: []
            });
        }

        const questionId =
            Number(questionIdRaw);
        const answer =
            Number(answerRaw);
        const [, answers, correct] =
            questionFor(questionId);
        const isCorrect =
            answer === correct;

        if (isCorrect) {
            await db.run(
                `
                INSERT INTO quiz_scores
                (guild_id, user_id, correct, attempts, xp_awarded, updated_at)
                VALUES (?, ?, 1, 1, ?, ?)
                ON CONFLICT(guild_id, user_id)
                DO UPDATE SET
                    correct = correct + 1,
                    attempts = attempts + 1,
                    xp_awarded = xp_awarded + ?,
                    updated_at = excluded.updated_at
                `,
                [
                    interaction.guild.id,
                    interaction.user.id,
                    QUIZ_XP,
                    Date.now(),
                    QUIZ_XP
                ]
            );

            await awardPlayerXp(
                interaction.guild.id,
                interaction.user.id,
                QUIZ_XP
            );
        } else {
            await db.run(
                `
                INSERT INTO quiz_scores
                (guild_id, user_id, correct, attempts, xp_awarded, updated_at)
                VALUES (?, ?, 0, 1, 0, ?)
                ON CONFLICT(guild_id, user_id)
                DO UPDATE SET
                    attempts = attempts + 1,
                    updated_at = excluded.updated_at
                `,
                [
                    interaction.guild.id,
                    interaction.user.id,
                    Date.now()
                ]
            );
        }

        return interaction.update({
            content:
                isCorrect
                    ? `Correct. You earned ${QUIZ_XP} XP.`
                    : `Incorrect. Correct answer: ${answers[correct]}.`,
            embeds: [],
            components: []
        });
    }
};
