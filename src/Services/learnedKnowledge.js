const db = require("../Utils/db");

const STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "did",
    "do",
    "does",
    "for",
    "in",
    "is",
    "of",
    "on",
    "the",
    "to",
    "was",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who"
]);

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokens(value) {
    return normalize(value)
        .split(" ")
        .filter(token =>
            token.length > 1 &&
            !STOPWORDS.has(token)
        );
}

function aliases(row) {
    try {
        return JSON.parse(row.aliases_json || "[]");
    } catch {
        return [];
    }
}

function scoreRow(query, row) {
    const normalized =
        normalize(query);
    const queryTokens =
        tokens(query);
    const candidates = [
        row.question,
        ...aliases(row)
    ]
        .map(normalize)
        .filter(Boolean);
    let best = 0;
    let exact = false;

    for (const candidate of candidates) {
        if (candidate === normalized) {
            exact = true;
            best = 100;
            break;
        }

        const candidateTokens =
            new Set(tokens(candidate));
        const matches =
            queryTokens.filter(token =>
                candidateTokens.has(token)
            ).length;
        const coverage =
            queryTokens.length
                ? matches / queryTokens.length
                : 0;
        const reverseCoverage =
            candidateTokens.size
                ? matches / candidateTokens.size
                : 0;

        best =
            Math.max(
                best,
                matches +
                (coverage * 5) +
                (reverseCoverage * 3)
            );
    }

    return {
        row,
        exact,
        score: best,
        queryTokens: queryTokens.length
    };
}

async function approvedRows(guildId) {
    return db.all(
        `
        SELECT *
        FROM learned_knowledge
        WHERE guild_id = ?
        AND status = 'approved'
        ORDER BY updated_at DESC
        `,
        [guildId]
    );
}

async function findLearnedKnowledge(guildId, question) {
    const ranked =
        (await approvedRows(guildId))
            .map(row =>
                scoreRow(question, row)
            )
            .filter(candidate =>
                candidate.exact ||
                candidate.score >= Math.max(
                    5,
                    candidate.queryTokens * 0.8
                )
            )
            .sort((a, b) =>
                Number(b.exact) - Number(a.exact) ||
                b.score - a.score
            );
    const best =
        ranked[0];
    const second =
        ranked[1];

    if (
        !best ||
        (
            !best.exact &&
            second &&
            best.row.answer !== second.row.answer &&
            best.score - second.score < 1
        )
    ) {
        return null;
    }

    return best.row;
}

async function answerLearnedKnowledge(guildId, question) {
    return (await findLearnedKnowledge(guildId, question))?.answer || null;
}

async function getRelevantLearnedKnowledge(guildId, question, limit = 6) {
    return (await approvedRows(guildId))
        .map(row =>
            scoreRow(question, row)
        )
        .filter(candidate =>
            candidate.score >= 2
        )
        .sort((a, b) =>
            Number(b.exact) - Number(a.exact) ||
            b.score - a.score
        )
        .slice(0, limit)
        .map(candidate => ({
            question: candidate.row.question,
            answer: candidate.row.answer,
            sourceUrl: candidate.row.source_url || null
        }));
}

module.exports = {
    answerLearnedKnowledge,
    findLearnedKnowledge,
    getRelevantLearnedKnowledge,
    normalize
};
