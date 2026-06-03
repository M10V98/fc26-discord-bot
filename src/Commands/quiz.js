const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../Utils/db");
const eaApi = require("../Services/eaApi");
const {
    FOOTER,
    number,
    escapeMarkdown
} = require("../Utils/embedStyle");
const {
    getClubName
} = require("../Utils/scoreboard");

const QUIZ_XP = 100;
const TIME_LIMIT_SECONDS = 60;
const quizTimers = new Map();
const advancingQuestions = new Set();

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

function playerName(stats) {
    return stats?.playername || "Unknown";
}

function uniqueAnswers(correct, candidates) {
    const seen = new Set([String(correct).toLowerCase()]);
    const answers = [correct];

    for (const candidate of candidates) {
        const value = String(candidate || "").trim();
        const key = value.toLowerCase();

        if (!value || seen.has(key)) {
            continue;
        }

        seen.add(key);
        answers.push(value);

        if (answers.length >= 4) {
            break;
        }
    }

    return answers.length === 4
        ? answers
        : null;
}

function getOurClubId(match, clubId) {
    const ids = Object.keys(match.clubs || {});

    return ids.includes(String(clubId))
        ? String(clubId)
        : ids[0];
}

function latestMatchQuestions(matches, clubId) {
    const latest = matches[0];

    if (!latest) {
        return [];
    }

    const ourId = getOurClubId(latest, clubId);
    const opponentId =
        Object.keys(latest.clubs || {})
            .find(id => id !== ourId);
    const ourClub = latest.clubs?.[ourId];
    const opponentClub = latest.clubs?.[opponentId];
    const players =
        Object.values(latest.players?.[ourId] || {});
    const playerNames =
        players
            .map(playerName)
            .filter(Boolean)
            .sort(() => Math.random() - 0.5);

    if (!ourClub || !opponentClub || players.length < 4) {
        return [];
    }

    const score =
        `${number(ourClub.goals)}-${number(opponentClub.goals)}`;
    const allScores =
        [
            score,
            `${number(opponentClub.goals)}-${number(ourClub.goals)}`,
            `${number(ourClub.goals)}-${number(Number(opponentClub.goals || 0) + 1)}`,
            `${number(Number(ourClub.goals || 0) + 1)}-${number(opponentClub.goals)}`
        ];
    const statLeader = key =>
        players
            .slice()
            .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))[0];
    const goalsLeader = statLeader("goals");
    const assistsLeader = statLeader("assists");
    const ratingLeader = statLeader("rating");
    const questions = [
        {
            question: "What was the score in our latest tracked game?",
            answers: uniqueAnswers(score, allScores.slice(1)),
            correct: score
        },
        {
            question: "What was the name of the latest team we played?",
            answers: uniqueAnswers(
                getClubName(opponentClub),
                matches
                    .map(match => {
                        const id = getOurClubId(match, clubId);
                        const oppId =
                            Object.keys(match.clubs || {})
                                .find(candidate => candidate !== id);
                        return getClubName(match.clubs?.[oppId]);
                    })
            ),
            correct: getClubName(opponentClub)
        },
        {
            question: "Who scored the most goals in our latest tracked game?",
            answers: uniqueAnswers(playerName(goalsLeader), playerNames),
            correct:
                Number(goalsLeader?.goals || 0) > 0
                    ? playerName(goalsLeader)
                    : null
        },
        {
            question: "Who got the most assists in our latest tracked game?",
            answers: uniqueAnswers(playerName(assistsLeader), playerNames),
            correct:
                Number(assistsLeader?.assists || 0) > 0
                    ? playerName(assistsLeader)
                    : null
        },
        {
            question: "Who had the highest rating in our latest tracked game?",
            answers: uniqueAnswers(playerName(ratingLeader), playerNames),
            correct: playerName(ratingLeader)
        }
    ];

    return questions
        .filter(row => row.answers && row.correct)
        .map(row => shuffleAnswers(row.question, row.answers, 0));
}

function bestChemistryQuestion(matches, clubId) {
    const pairs = new Map();

    for (const match of matches || []) {
        const ourId = getOurClubId(match, clubId);
        const players =
            Object.entries(match.players?.[ourId] || {});

        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const [idA, a] = players[i];
                const [idB, b] = players[j];
                const key =
                    [idA, idB].sort().join(":");
                const existing =
                    pairs.get(key) || {
                        names: [playerName(a), playerName(b)].sort(),
                        matches: 0,
                        wins: 0,
                        rating: 0,
                        goalContrib: 0
                    };
                const ourClub = match.clubs?.[ourId];
                const opponentId =
                    Object.keys(match.clubs || {})
                        .find(id => id !== ourId);
                const opponentClub = match.clubs?.[opponentId];
                const won =
                    Number(ourClub?.goals || 0) >
                    Number(opponentClub?.goals || 0);

                existing.matches += 1;
                existing.wins += won ? 1 : 0;
                existing.rating +=
                    (Number(a.rating || 0) + Number(b.rating || 0)) / 2;
                existing.goalContrib +=
                    Number(a.goals || 0) +
                    Number(a.assists || 0) +
                    Number(b.goals || 0) +
                    Number(b.assists || 0);
                pairs.set(key, existing);
            }
        }
    }

    const ranked =
        [...pairs.values()]
            .filter(pair => pair.matches >= 2)
            .map(pair => ({
                label: pair.names.join(" + "),
                score:
                    ((pair.wins / pair.matches) * 45) +
                    ((pair.rating / pair.matches) * 6) +
                    ((pair.goalContrib / pair.matches) * 8)
            }))
            .sort((a, b) => b.score - a.score);

    if (ranked.length < 4) {
        return null;
    }

    return shuffleAnswers(
        "Which two players currently have the best tracked chemistry?",
        ranked.slice(0, 4).map(pair => pair.label),
        0
    );
}

async function dynamicQuestion(guildId) {
    const club =
        await db.get(
            `SELECT * FROM clubs WHERE guild_id = ?`,
            [guildId]
        );
    const [players, recentMatches] =
        await Promise.all([
            db.all(
                `
                SELECT *
                FROM players
                WHERE guild_id = ?
                AND COALESCE(matches, 0) > 0
                `,
                [guildId]
            ),
            club?.club_id
                ? eaApi.getRecentMatches(
                    club.club_id,
                    {
                        forceRefresh: true,
                        limit: 100,
                        maxResultCount: 100
                    }
                ).catch(() => [])
                : []
        ]);

    if (players.length < 2) {
        const liveQuestions =
            club?.club_id
                ? latestMatchQuestions(recentMatches, club.club_id)
                : [];

        return liveQuestions.length
            ? liveQuestions[Math.floor(Math.random() * liveQuestions.length)]
            : null;
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
            question: "Who has made the most tracked appearances?",
            correct: sortedBy("matches")[0]?.player_name
        },
        {
            question: "Who has recorded the most tracked clean sheets?",
            correct: sortedBy("clean_sheets")[0]?.player_name
        },
        {
            question: "Who has won the most tracked Man of the Match awards?",
            correct: sortedBy("motm")[0]?.player_name
        },
        {
            question: "Who has the most tracked red cards?",
            correct:
                Number(sortedBy("red_cards")[0]?.red_cards || 0) > 0
                    ? sortedBy("red_cards")[0]?.player_name
                    : null
        }
    ]
        .filter(row => row.correct);

    if (club?.club_id) {
        categories.push(
            ...latestMatchQuestions(recentMatches, club.club_id)
        );

        const chemistryQuestion =
            bestChemistryQuestion(recentMatches, club.club_id);

        if (chemistryQuestion) {
            categories.push(chemistryQuestion);
        }
    }

    if (!categories.length) {
        return null;
    }

    const selected =
        categories[
            Math.floor(Math.random() * categories.length)
        ];
    if (selected.answers) {
        return selected;
    }

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

async function getActiveQuiz(guildId) {
    return db.get(
        `
        SELECT *
        FROM quiz_sessions
        WHERE guild_id = ?
        AND active = 1
        LIMIT 1
        `,
        [guildId]
    );
}

async function getEligibleAnswerCount(guild) {
    if (!guild) {
        return 0;
    }

    const fetched =
        await guild.members.fetch().catch(() => null);
    const members =
        fetched || guild.members.cache;
    const humans =
        members?.filter(member => !member.user?.bot);

    if (humans?.size) {
        return humans.size;
    }

    return Math.max(0, Number(guild.memberCount || 0) - 1);
}

function mentionSummary(rows) {
    if (!rows.length) {
        return "No one";
    }

    return rows
        .map(row => `<@${row.user_id}>`)
        .join(", ")
        .slice(0, 900);
}

async function buildResultContent(session, question, reason) {
    const answers =
        await db.all(
            `
            SELECT *
            FROM quiz_answers
            WHERE session_id = ?
            AND question_id = ?
            ORDER BY answered_at ASC
            `,
            [
                session.session_id,
                session.current_question_id
            ]
        );
    const correctRows =
        answers.filter(row => Number(row.correct));
    const wrongRows =
        answers.filter(row => !Number(row.correct));

    for (const row of answers) {
        await recordAttempt(
            session.guild_id,
            row.user_id,
            Boolean(Number(row.correct))
        );
    }

    const correctAnswer =
        question.answers?.[question.correct] || "unknown";
    const closeLine =
        reason === "all_answered"
            ? "\u{1F4E3} Everyone answered."
            : "\u23F1\uFE0F Time is up.";

    return [
        closeLine,
        `Correct answer: **${escapeMarkdown(correctAnswer)}**`,
        `\u2705 Correct: ${mentionSummary(correctRows)}`,
        `\u274C Wrong: ${mentionSummary(wrongRows)}`,
        correctRows.length
            ? `Awarded **${QUIZ_XP} XP** to each correct answer.`
            : "No XP awarded this round.",
        "",
        "Next question:"
    ].join("\n").slice(0, 1900);
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
    const advanceKey =
        `${sessionId}:${expectedQuestionId}`;

    if (advancingQuestions.has(advanceKey)) {
        return;
    }

    advancingQuestions.add(advanceKey);
    clearQuizTimer(sessionId);

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
        advancingQuestions.delete(advanceKey);
        return;
    }

    try {
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
        const resultContent =
            await buildResultContent(session, current, reason);

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
                content: resultContent,
                embeds: [buildQuestionEmbed(next, nextCount)],
                components: [buildButtons(sessionId, nextQuestionId)]
            });
        }

        scheduleQuizAdvance(client, sessionId, nextQuestionId);
    } finally {
        advancingQuestions.delete(advanceKey);
    }
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

        await interaction.reply({
            content: "Answer submitted. Results will show when the question closes.",
            ephemeral: true
        });

        const answered =
            await db.get(
                `
                SELECT COUNT(*) AS count
                FROM quiz_answers
                WHERE session_id = ?
                AND question_id = ?
                `,
                [
                    sessionId,
                    clickedQuestionId
                ]
            );
        const eligibleCount =
            await getEligibleAnswerCount(interaction.guild);

        if (
            eligibleCount > 0 &&
            Number(answered?.count || 0) >= eligibleCount
        ) {
            await advanceQuiz(
                interaction.client,
                sessionId,
                clickedQuestionId,
                "all_answered"
            );
        }
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
    },

    async hasActiveQuiz(guildId) {
        return Boolean(
            await getActiveQuiz(guildId)
        );
    }
};
