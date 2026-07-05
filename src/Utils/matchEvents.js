function n(value) {
    return Number(value || 0);
}

function parseEventAggregate(value) {
    if (!value || typeof value !== "string") {
        return {};
    }

    return value
        .split(",")
        .map(pair => pair.trim())
        .filter(Boolean)
        .reduce((events, pair) => {
            const [rawCode, rawCount] = pair.split(":");
            const code = String(rawCode || "").trim();
            const count = Number(rawCount || 0);

            if (!code || !Number.isFinite(count)) {
                return events;
            }

            events[code] = n(events[code]) + count;
            return events;
        }, {});
}

function parseCodes(value) {
    return String(value || "")
        .split(/[,\s]+/)
        .map(code => code.trim())
        .filter(Boolean);
}

function configuredEventCodes() {
    let fromJson = {};

    if (process.env.FC_EVENT_CODE_MAP) {
        try {
            fromJson = JSON.parse(process.env.FC_EVENT_CODE_MAP);
        } catch (err) {
            console.error("Invalid FC_EVENT_CODE_MAP:", err.message);
        }
    }

    const unique = codes =>
        [...new Set(codes.map(String).filter(Boolean))];

    return {
        secondAssists: unique([
            "115",
            ...parseCodes(process.env.FC_EVENT_CODES_SECOND_ASSISTS),
            ...parseCodes(fromJson.secondAssists)
        ]),
        dribbles: unique([
            "174",
            ...parseCodes(process.env.FC_EVENT_CODES_DRIBBLES),
            ...parseCodes(fromJson.dribbles)
        ]),
        interceptions: unique([
            "6",
            ...parseCodes(process.env.FC_EVENT_CODES_INTERCEPTIONS),
            ...parseCodes(fromJson.interceptions)
        ])
    };
}

function aggregateEventCodes(player) {
    const merged = {};

    for (const [key, value] of Object.entries(player || {})) {
        if (!/^match_event_aggregate_\d+$/.test(key)) {
            continue;
        }

        const parsed = parseEventAggregate(value);

        for (const [code, count] of Object.entries(parsed)) {
            merged[code] = n(merged[code]) + n(count);
        }
    }

    return merged;
}

function hasEventAggregateData(player) {
    return Object.entries(player || {})
        .some(([key, value]) =>
            /^match_event_aggregate_\d+$/.test(key) &&
            typeof value === "string" &&
            value.trim().length > 0
        );
}

function hasAnyEventAggregateData(players) {
    return Object.values(players || {})
        .some(player => hasEventAggregateData(player));
}

function sumCodes(events, codes) {
    return (codes || [])
        .reduce((total, code) => total + n(events[String(code)]), 0);
}

function statFromEvents(player, statName) {
    const events = aggregateEventCodes(player);
    const codes = configuredEventCodes()[statName] || [];

    return sumCodes(events, codes);
}

function hiddenStats(player) {
    const secondAssists =
        n(player?.secondassists || player?.secondAssists) ||
        statFromEvents(player, "secondAssists");
    const dribbles =
        n(player?.dribbles || player?.dribblescompleted) ||
        statFromEvents(player, "dribbles");
    const interceptions =
        n(player?.interceptions) ||
        statFromEvents(player, "interceptions");

    return {
        secondAssists,
        dribbles,
        interceptions
    };
}

function enrichPlayerStats(player) {
    const extra = hiddenStats(player);

    return {
        ...player,
        secondassists: extra.secondAssists,
        secondAssists: extra.secondAssists,
        dribbles: extra.dribbles,
        interceptions: extra.interceptions
    };
}

function hasConfiguredHiddenCodes() {
    const codes = configuredEventCodes();

    return Object.values(codes).some(value => value.length > 0);
}

const HIDDEN_STAT_EMOJIS = {
    secondAssists: "\u{1F517}",
    dribbles: "\u{1F4A8}",
    interceptions: "\u{1F9E0}"
};

module.exports = {
    HIDDEN_STAT_EMOJIS,
    aggregateEventCodes,
    configuredEventCodes,
    enrichPlayerStats,
    hasAnyEventAggregateData,
    hasConfiguredHiddenCodes,
    hasEventAggregateData,
    hiddenStats,
    parseEventAggregate,
    statFromEvents
};
