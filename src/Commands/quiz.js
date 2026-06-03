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

const QUIZ_XP = 100;
const TIME_LIMIT_SECONDS = 60;
const quizTimers = new Map();

const STATIC_QUESTIONS = [
    ["In FC Clubs, which stat best shows a player is consistently completing distribution?", ["Pass success rate", "Shot success rate", "Tackle success rate", "Save percentage"], 0],
    ["What does a high xA usually indicate?", ["Passes are creating high-quality shooting chances", "The player shoots often", "The team keeps clean sheets", "The player wins aerial duels"], 0],
    ["Why can a low block be hard to break down?", ["It compresses space near goal", "It leaves both centre backs high", "It avoids all marking", "It removes the goalkeeper"], 0],
    ["What is the main risk of a high defensive line?", ["Space in behind", "Too many attackers", "No passing lanes in midfield", "Automatic offsides"], 0],
    ["What does a box-to-box midfielder primarily provide?", ["Two-way coverage between both penalty areas", "Only penalty-taking", "Only goalkeeping cover", "Only touchline width"], 0],
    ["What is a third-man run?", ["A supporting runner receives after a two-player exchange", "A goalkeeper overlap", "A substitute warming up", "A defender clearing long"], 0],
    ["Why does a false nine drop deep?", ["To pull defenders out and create space", "To stand offside", "To mark the goalkeeper", "To avoid receiving passes"], 0],
    ["What does counter-pressing try to do immediately after losing possession?", ["Win the ball back before the opponent settles", "Retreat to the penalty box", "Force a throw-in every time", "Switch goalkeepers"], 0],
    ["What is the clearest sign of strong chemistry between two attackers?", ["Frequent joint goal contributions and wins", "Matching kit numbers", "Same celebration", "Both taking corners"], 0],
    ["When comparing players, why is average rating useful alongside goals and assists?", ["It captures broader match influence", "It ignores defending", "It only counts penalties", "It replaces appearances"], 0],
    ["What is a progressive pass?", ["A pass that moves the ball meaningfully closer to goal", "Any backwards pass", "A pass after a foul", "A goalkeeper save"], 0],
    ["What does rest defence describe?", ["The structure left behind while attacking", "The bench order", "Time wasting after scoring", "A goalkeeper's stamina"], 0],
    ["Why do teams overload one side?", ["To create space or a free player elsewhere", "To reduce passing options", "To guarantee a red card", "To make offside impossible"], 0],
    ["What usually makes a press ineffective?", ["No compactness or cover behind it", "Too much communication", "Good passing angles", "A high work rate"], 0],
    ["What is a cutback?", ["A pass pulled back from near the byline", "A long clearance", "A sliding tackle", "A direct free kick"], 0],
    ["Which stat pairing best describes attacking output?", ["Goals and assists", "Saves and red cards", "Tackles and fouls", "Pass attempts and cards"], 0],
    ["What is the main value of a clean sheet for defenders and keepers?", ["It shows the team conceded zero goals", "It proves 100% possession", "It adds three goals", "It guarantees promotion"], 0],
    ["Why are assists per game useful?", ["They adjust creativity for appearances", "They count only corners", "They remove all context", "They ignore minutes played"], 0],
    ["What is a switch of play?", ["Moving possession quickly to the opposite side", "Changing the captain", "Replacing the goalkeeper", "Passing only backwards"], 0],
    ["What does 'between the lines' mean?", ["Receiving in space between defensive units", "Standing on the touchline", "Waiting in the wall", "Sitting on the bench"], 0],
    ["Why does a team use a holding midfielder?", ["To protect the defence and connect play", "To take every shot", "To stay offside", "To replace the referee"], 0],
    ["What is an underlap?", ["A run inside a wide teammate", "A run outside a centre back by the goalkeeper", "A kick-off routine", "A penalty save"], 0],
    ["What is a transition moment?", ["The phase when possession changes", "Half-time only", "A kit change", "A corner flag movement"], 0],
    ["What should a winger do if doubled up by defenders?", ["Move the ball quickly or combine with support", "Dribble into both every time", "Stop attacking", "Shoot from the halfway line"], 0],
    ["Why does match sample size matter in form analysis?", ["One match can distort trends", "It removes all wins", "It only helps goalkeepers", "It blocks assists"], 0]
];

function shuffleAnswers(question, answers, correctIndex) {
    const rows =
        answers.map((answer, index) => ({
            answer,
            correct: index === correctIndex
        }));

    for (let index = rows.length - 1; index > 0; index--) {
        const swapIndex =
            Math.floor(Math.random() * (index + 1));
        [rows[index], rows[swapIndex]] = [rows[swapIndex], rows[index]];
    }

    return {
        question,
        answers: rows.map(row => row.answer),
        correct: rows.findIndex(row => row.correct)
    };
}

function staticQuestion() {
    const row =
        STATIC_QUESTIONS[
            Math.floor(Math.random() * STATIC_QUESTIONS.length)
        ];

    return shuffleAnswers(row[0], row[1], row[2]);
}

async function dynamicQuestion(guildId) {
    const players =
        await db.all(
            `
            SELECT *
            FROM players
            WHERE guild_id = ?
            AND COALESCE(matches, 0) > 0
            `,
            [guildId]
        );

    if (players.length < 2) {
        return null;
    }

    const sortedBy = key =>
        players
            .slice()
            .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0));
    const topRated =
        players
            .filter(player => Number(player.matches || 0) > 0)
            .slice()
            .sort((a, b) =>
                (Number(b.total_rating || 0) / Math.max(Number(b.matches || 0), 1)) -
                (Number(a.total_rating || 0) / Math.max(Number(a.matches || 0), 1))
            );
    const categories = [
        {
            question: "Who is currently the team's top tracked goalscorer?",
            correct: sortedBy("goals")[0]?.player_name
        },
        {
            question: "Who currently leads the team for tracked assists?",
            correct: sortedBy("assists")[0]?.player_name
        },
        {
            question: "Who has the highest tracked average rating?",
            correct: topRated[0]?.player_name
        },
        {
            question: "Who has played the most tracked matches?",
            correct: sortedBy("matches")[0]?.player_name
        },
        {
            question: "Who has recorded the most tracked clean sheets?",
            correct: sortedBy("clean_sheets")[0]?.player_name
        },
        {
            question: "Who has won the most tracked Man of the Match awards?",
            correct: sortedBy("motm")[0]?.player_name
        }
    ]
        .filter(row => row.correct);

    if (!categories.length) {
        return null;
    }

    const selected =
        categories[
            Math.floor(Math.random() * categories.length)
        ];
    const distractors =
        players
            .map(player => player.player_name)
            .filter(name => name && name !== selected.correct)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

    if (distractors.length < 3) {
        return null;
    }

    return shuffleAnswers(
        selected.question,
        [
            selected.correct,
            ...distractors
        ],
        0
    );
}

async function nextQuestion(guildId) {
    const useDynamic =
        Math.random() < 0.45;
    const dynamic =
        useDynamic
            ? await dynamicQuestion(guildId)
            : null;

    return dynamic || staticQuestion();
}

function createQuestionId() {
    return Math.random()
        .toString(36)
        .slice(2, 10);
}

function buildQuestionEmbed(question, askedCount) {
    return new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle(`\u{1F9E0} Quiz - Question ${askedCount}`)
        .setDescription(
            [
                escapeMarkdown(question.question),
                "",
                ...question.answers.map((answer, index) =>
                    `**${index + 1}.** ${escapeMarkdown(answer)}`
                ),
                "",
                `You have **${TIME_LIMIT_SECONDS} seconds**. Correct answers earn **${QUIZ_XP} XP**.`,
                "Press **Stop** when the room is done."
            ].join("\n")
        )
        .setFooter(FOOTER);
}

function buildButtons(sessionId, questionId) {
    const row =
        new ActionRowBuilder();

    for (let index = 0; index < 4; index++) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`quiz_answer:${sessionId}:${questionId}:${index}`)
                .setLabel(String(index + 1))
                .setStyle(ButtonStyle.Secondary)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`quiz_stop:${sessionId}`)
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger)
    );

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

async function recordAttempt(guildId, userId, correct) {
    await db.run(
        `
        INSERT INTO quiz_scores
        (guild_id, user_id, correct, attempts, xp_awarded, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(guild_id, user_id)
        DO UPDATE SET
            correct = correct + ?,
            attempts = attempts + 1,
            xp_awarded = xp_awarded + ?,
            updated_at = excluded.updated_at
        `,
        [
            guildId,
            userId,
            correct ? 1 : 0,
            correct ? QUIZ_XP : 0,
            Date.now(),
            correct ? 1 : 0,
            correct ? QUIZ_XP : 0
        ]
    );

    if (correct) {
        await awardPlayerXp(guildId, userId, QUIZ_XP);
    }
}

function clearQuizTimer(sessionId) {
    const timer =
        quizTimers.get(sessionId);

    if (timer) {
        clearTimeout(timer);
        quizTimers.delete(sessionId);
    }
}

async function advanceQuiz(client, sessionId, expectedQuestionId, reason = "time") {
    const session =
        await db.get(
            `
            SELECT *
            FROM quiz_sessions
            WHERE session_id = ?
            `,
            [sessionId]
        );

    if (
        !session ||
        !Number(session.active) ||
        session.current_question_id !== expectedQuestionId
    ) {
        return;
    }

    const current =
        JSON.parse(session.current_question_json || "{}");
    const next =
        await nextQuestion(session.guild_id);
    const nextQuestionId =
        createQuestionId();
    const nextCount =
        Number(session.asked_count || 0) + 1;
    const message =
        await client.channels
            .fetch(session.channel_id)
            .then(channel => channel.messages.fetch(session.message_id))
            .catch(() => null);

    await db.run(
        `
        UPDATE quiz_sessions
        SET current_question_id = ?,
            current_question_json = ?,
            asked_count = ?,
            updated_at = ?
        WHERE session_id = ?
        `,
        [
            nextQuestionId,
            JSON.stringify(next),
            nextCount,
            Date.now(),
            sessionId
        ]
    );

    if (message) {
        await message.edit({
            content:
                reason === "time"
                    ? `Time. Correct answer: ${current.answers?.[current.correct] || "unknown"}. Next question:`
                    : "Next question:",
            embeds: [buildQuestionEmbed(next, nextCount)],
            components: [buildButtons(sessionId, nextQuestionId)]
        });
    }

    scheduleQuizAdvance(client, sessionId, nextQuestionId);
}

function scheduleQuizAdvance(client, sessionId, expectedQuestionId) {
    clearQuizTimer(sessionId);

    const timer =
        setTimeout(() => {
            advanceQuiz(
                client,
                sessionId,
                expectedQuestionId,
                "time"
            ).catch(err =>
                console.error("quiz advance error:", err)
            );
        }, TIME_LIMIT_SECONDS * 1000);

    quizTimers.set(sessionId, timer);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("quiz")
        .setDescription("Football quiz")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("Start a continuous timed quiz")
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

        const sessionId =
            interaction.id;
        const question =
            await nextQuestion(interaction.guild.id);
        const questionId =
            createQuestionId();

        await db.run(
            `
            INSERT INTO quiz_sessions
            (session_id, guild_id, channel_id, message_id, creator_id, current_question_id, current_question_json, active, asked_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
            `,
            [
                sessionId,
                interaction.guild.id,
                interaction.channel.id,
                null,
                interaction.user.id,
                questionId,
                JSON.stringify(question),
                Date.now(),
                Date.now()
            ]
        );

        const reply =
            await interaction.reply({
                embeds: [buildQuestionEmbed(question, 1)],
                components: [buildButtons(sessionId, questionId)],
                fetchReply: true
            });

        await db.run(
            `UPDATE quiz_sessions SET message_id = ? WHERE session_id = ?`,
            [reply.id, sessionId]
        );

        scheduleQuizAdvance(
            interaction.client,
            sessionId,
            questionId
        );
    },

    async handleAnswer(interaction) {
        const [, sessionId, clickedQuestionId, answerRaw] =
            interaction.customId.split(":");
        const session =
            await db.get(
                `
                SELECT *
                FROM quiz_sessions
                WHERE session_id = ?
                AND guild_id = ?
                `,
                [sessionId, interaction.guild.id]
            );

        if (!session || !Number(session.active)) {
            return interaction.reply({
                content: "That quiz has already stopped.",
                ephemeral: true
            });
        }

        if (session.current_question_id !== clickedQuestionId) {
            return interaction.reply({
                content: "That question has already moved on.",
                ephemeral: true
            });
        }

        const question =
            JSON.parse(session.current_question_json || "{}");
        const answer =
            Number(answerRaw);
        const isCorrect =
            answer === Number(question.correct);
        const alreadyAnswered =
            await db.get(
                `
                SELECT *
                FROM quiz_answers
                WHERE session_id = ?
                AND question_id = ?
                AND user_id = ?
                `,
                [
                    sessionId,
                    clickedQuestionId,
                    interaction.user.id
                ]
            );

        if (alreadyAnswered) {
            return interaction.reply({
                content: "You have already answered this question.",
                ephemeral: true
            });
        }

        await db.run(
            `
            INSERT INTO quiz_answers
            (session_id, guild_id, question_id, user_id, answer_index, correct, answered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                sessionId,
                interaction.guild.id,
                clickedQuestionId,
                interaction.user.id,
                answer,
                isCorrect ? 1 : 0,
                Date.now()
            ]
        );

        await recordAttempt(
            interaction.guild.id,
            interaction.user.id,
            isCorrect
        );

        return interaction.reply({
            content:
                isCorrect
                    ? `Correct. You earned ${QUIZ_XP} XP.`
                    : "Answer submitted.",
            ephemeral: true
        });
    },

    async handleStop(interaction) {
        const [, sessionId] =
            interaction.customId.split(":");
        const session =
            await db.get(
                `
                SELECT *
                FROM quiz_sessions
                WHERE session_id = ?
                AND guild_id = ?
                `,
                [sessionId, interaction.guild.id]
            );

        if (!session) {
            return interaction.reply({
                content: "That quiz session no longer exists.",
                ephemeral: true
            });
        }

        await db.run(
            `
            UPDATE quiz_sessions
            SET active = 0,
                updated_at = ?
            WHERE session_id = ?
            `,
            [Date.now(), sessionId]
        );

        clearQuizTimer(sessionId);

        return interaction.update({
            content: `Quiz stopped after ${number(session.asked_count)} question${Number(session.asked_count) === 1 ? "" : "s"}.`,
            embeds: [],
            components: []
        });
    }
};
