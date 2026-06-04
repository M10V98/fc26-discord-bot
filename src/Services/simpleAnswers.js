const TIME_ZONE = "Europe/London";

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: TIME_ZONE,
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(date);
}

function formatTime(date = new Date()) {
    return new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: TIME_ZONE,
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}

function nextChristmas(now = new Date()) {
    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: TIME_ZONE,
                year: "numeric"
            }
        ).formatToParts(now);
    let year =
        Number(parts.find(part => part.type === "year")?.value);
    let christmas =
        new Date(Date.UTC(year, 11, 25, 0, 0, 0));

    if (christmas <= now) {
        christmas =
            new Date(Date.UTC(year + 1, 11, 25, 0, 0, 0));
    }

    return christmas;
}

function countdown(toDate, now = new Date()) {
    const ms =
        Math.max(0, toDate.getTime() - now.getTime());
    const days =
        Math.floor(ms / 86_400_000);
    const hours =
        Math.floor((ms % 86_400_000) / 3_600_000);

    return `${days} day${days === 1 ? "" : "s"} and ${hours} hour${hours === 1 ? "" : "s"}`;
}

function safeMathExpression(text) {
    const match =
        text.match(/(-?\d+(?:\.\d+)?(?:\s*(?:\+|-|\*|x|×|\/|÷)\s*-?\d+(?:\.\d+)?)+)/i);

    if (!match) {
        return null;
    }

    return match[1]
        .replace(/x|×/gi, "*")
        .replace(/÷/g, "/");
}

function evaluateMath(expression) {
    if (!/^-?\d+(?:\.\d+)?(?:\s*(?:\+|-|\*|\/)\s*-?\d+(?:\.\d+)?)+$/.test(expression)) {
        return null;
    }

    const tokens =
        expression.match(/-?\d+(?:\.\d+)?|[+\-*/]/g);

    if (!tokens?.length) {
        return null;
    }

    const values = [];
    const operators = [];

    for (const token of tokens) {
        if (/^[+\-*/]$/.test(token)) {
            operators.push(token);
        } else {
            values.push(Number(token));
        }
    }

    for (let index = 0; index < operators.length;) {
        const operator = operators[index];

        if (operator !== "*" && operator !== "/") {
            index += 1;
            continue;
        }

        const result =
            operator === "*"
                ? values[index] * values[index + 1]
                : values[index] / values[index + 1];

        values.splice(index, 2, result);
        operators.splice(index, 1);
    }

    let result = values[0];

    for (let index = 0; index < operators.length; index++) {
        result =
            operators[index] === "+"
                ? result + values[index + 1]
                : result - values[index + 1];
    }

    return Number.isInteger(result)
        ? String(result)
        : String(Number(result.toFixed(4)));
}

function answerSimpleQuestion(question) {
    const text =
        normalize(question);

    if (/\b(what'?s|what is|tell me)\s+the\s+time\b|\bcurrent time\b/.test(text)) {
        return `The time is **${formatTime()}**.`;
    }

    if (/\b(what'?s|what is|tell me)\s+the\s+date\b|\btoday'?s date\b|\bwhat day is it\b/.test(text)) {
        return `Today is **${formatDate()}**.`;
    }

    if (/\bhow long\b.*\bchristmas\b|\bhow many days\b.*\bchristmas\b|\buntil christmas\b/.test(text)) {
        return `It is **${countdown(nextChristmas())}** until Christmas.`;
    }

    const looksLikeSeason =
        /\b\d{2}\/\d{2}\b/.test(text);
    const asksForMath =
        /\b(calculate|work out|maths?|what is|what's|equals?|=)\b/.test(text);
    const expression =
        looksLikeSeason &&
        !asksForMath
            ? null
            : safeMathExpression(text);

    if (expression) {
        const result =
            evaluateMath(expression);

        if (result !== null) {
            return `**${expression.replace(/\*/g, "x")} = ${result}**`;
        }
    }

    return null;
}

module.exports = {
    answerSimpleQuestion
};
