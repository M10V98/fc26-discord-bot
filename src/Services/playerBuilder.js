const crypto = require("crypto");
const zlib = require("zlib");
const data = require("../data/playerBuilder/fc26-player-builder.json");
const SESSION_TTL_MS = 45 * 60 * 1000;
const sessions = new Map();

const getArchetypes = async () => [...data.archetypeNames];
const getPlaystyles = async () => data.playstyles;
const getFacilities = async () => data.facilities;
const getArchetype = async name => {
    const archetype = data.archetypes[name];
    if (!archetype) throw new Error(`Unknown Player Builder archetype: ${name}`);
    return archetype;
};

function maxPlayerLevel(archetype) {
    return Math.max(
        1,
        Number(archetype?.level) || 0,
        ...((archetype?.levelApTable || []).map(row => Number(row.level) || 0)),
        ...((archetype?.levelStatCaps || []).map(row => Number(row.level) || 0))
    );
}

function baseAttributes(archetype) {
    const attributes = archetype.attributeGroups.flatMap(group =>
        group.attributes.map(attribute => ({
            g: group.name,
            n: attribute.name,
            v: Number(attribute.value)
        }))
    );
    if (!attributes.some(row => row.n === "Skill Moves")) {
        attributes.push({ g: "Other", n: "Skill Moves", v: 1 });
    }
    if (!attributes.some(row => row.n === "Weak Foot")) {
        attributes.push({ g: "Other", n: "Weak Foot", v: 1 });
    }
    return attributes;
}

function freshState(archetype, ownerId) {
    return {
        ownerId: String(ownerId),
        createdAt: Date.now(),
        touchedAt: Date.now(),
        a: archetype.name,
        l: 1,
        h: Math.round((archetype.physiqueBounds.heightMin + archetype.physiqueBounds.heightMax) / 2),
        w: Math.round((archetype.physiqueBounds.weightMin + archetype.physiqueBounds.weightMax) / 2),
        cl: 1,
        ps: [],
        sg: [],
        at: baseAttributes(archetype),
        sp: [],
        fa: [],
        name: "",
        view: "overview",
        group: archetype.attributeGroups[0]?.name || "Goalkeeping",
        attribute: archetype.attributeGroups[0]?.attributes[0]?.name || "",
        playstyleMode: "signature",
        playstyleCategory: "Scoring",
        facilityPage: 0,
        facility: null
    };
}

function encodeState(state) {
    const portable = {
        a: state.a,
        l: state.l,
        h: state.h,
        w: state.w,
        cl: state.cl,
        ps: state.ps,
        sg: state.sg,
        at: state.at,
        sp: state.sp,
        fa: state.fa
    };

    return `PCW1:${zlib.gzipSync(JSON.stringify(portable)).toString("base64")}`;
}

function decodeState(code) {
    const value = String(code || "").trim();
    if (!value.startsWith("PCW1:")) {
        throw new Error("That is not a PCW1 Player Builder code.");
    }

    try {
        return JSON.parse(
            zlib.gunzipSync(Buffer.from(value.slice(5), "base64")).toString("utf8")
        );
    } catch {
        throw new Error("That PCW1 code is invalid or damaged.");
    }
}

function cleanPortableState(raw, archetype, ownerId) {
    const state = freshState(archetype, ownerId);
    const bounds = archetype.physiqueBounds;
    const validStats = new Map(
        baseAttributes(archetype).map(row => [`${row.g}:${row.n}`, row])
    );

    state.l = Math.max(1, Math.min(maxPlayerLevel(archetype), Number(raw.l) || 1));
    state.h = Math.max(bounds.heightMin, Math.min(bounds.heightMax, Number(raw.h) || state.h));
    state.w = Math.max(bounds.weightMin, Math.min(bounds.weightMax, Number(raw.w) || state.w));
    state.cl = Math.max(1, Math.min(10, Number(raw.cl) || 1));
    state.ps = Array.isArray(raw.ps) ? raw.ps.map(String).slice(0, 9) : [];
    state.sg = Array.isArray(raw.sg) ? raw.sg.map(String).slice(0, 4) : [];
    state.sp = Array.isArray(raw.sp) ? raw.sp.map(String) : [];
    state.fa = Array.isArray(raw.fa) ? raw.fa : [];

    if (Array.isArray(raw.at)) {
        for (const row of raw.at) {
            const target = validStats.get(`${row.g}:${row.n}`);
            if (target && Number.isFinite(Number(row.v))) {
                target.v = Number(row.v);
            }
        }
        state.at = [...validStats.values()];
    }

    return state;
}

function cleanupSessions() {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, state] of sessions) {
        if (state.touchedAt < cutoff) sessions.delete(id);
    }
}

function saveSession(state) {
    cleanupSessions();
    const id = crypto.randomBytes(5).toString("hex");
    sessions.set(id, state);
    return id;
}

function getSession(id) {
    cleanupSessions();
    const state = sessions.get(id);
    if (state) state.touchedAt = Date.now();
    return state || null;
}

function statMap(state) {
    return new Map(state.at.map(row => [row.n.toLowerCase(), Number(row.v)]));
}

function requirementsMet(requirements, stats) {
    return Object.entries(requirements || {}).every(
        ([name, minimum]) => Number(stats.get(name.toLowerCase()) || 0) >= Number(minimum)
    );
}

function activeSpecializations(archetype, state) {
    const stats = statMap(state);
    return archetype.specializations
        .filter(spec => requirementsMet(spec.requirements, stats))
        .map(spec => spec.name);
}

function signatureUnlocks(archetype, state) {
    const unlocked = new Set();
    for (const [id, level] of Object.entries(archetype.playstyleUnlockLevels || {})) {
        if (state.l >= Number(level)) unlocked.add(id);
    }
    for (const spec of activeSpecializations(archetype, state)) {
        for (const id of archetype.specPlusUnlocks?.[spec] || []) unlocked.add(id);
    }
    return unlocked;
}

function levelBudget(archetype, level) {
    const row = archetype.levelApTable
        .filter(item => Number(item.level) <= Number(level))
        .sort((a, b) => Number(b.level) - Number(a.level))[0];
    return Number(row?.apTotal || 0);
}

function levelCaps(archetype, level) {
    return archetype.levelStatCaps
        .filter(item => Number(item.level) <= Number(level))
        .sort((a, b) => Number(b.level) - Number(a.level))[0]
        ?.statMaxValues || {};
}

function curveFor(archetype, group, name) {
    return archetype.apCurves.find(
        row => row.groupName === group && row.attributeName === name
    );
}

function attributeCost(archetype, row) {
    const curve = curveFor(archetype, row.g, row.n);
    if (!curve || Number(row.v) <= Number(curve.baseValue)) return 0;
    return Number(
        curve.curve.find(point => Number(point.statValue) === Number(row.v))?.apSpent || 0
    );
}

function spentAp(archetype, state) {
    return state.at.reduce((sum, row) => sum + attributeCost(archetype, row), 0);
}

function bodyModifiers(archetype, state) {
    return archetype.bodyModifiers.find(
        row => Number(row.height) === Number(state.h) && Number(row.weight) === Number(state.w)
    )?.statModifiers || {};
}

function facilityModifiers(facilities, state) {
    const level = facilities.levels.find(row => Number(row.level) === Number(state.cl));
    const modifiers = {};
    for (const selected of state.fa) {
        const facility = level?.facilities.find(row => row.name === selected.n);
        const stars = facility?.starLevels.find(
            row => Number(row.star) === Number(selected.l ?? selected.s)
        );
        for (const attribute of stars?.attributes || []) {
            const key = attribute.name.toLowerCase();
            modifiers[key] = Number(modifiers[key] || 0) + Number(attribute.value || 0);
        }
    }
    return modifiers;
}

function displayedValue(row, body, facility) {
    return Number(row.v) + (row.g === "Other" ? 1 : 0) +
        Number(body[row.n] || 0) + Number(facility[row.n.toLowerCase()] || 0);
}

function bankersRound(value) {
    const floor = Math.floor(value);
    const fraction = value - floor;
    if (Math.abs(fraction - 0.5) < Number.EPSILON * 4) {
        return floor % 2 === 0 ? floor : floor + 1;
    }
    return Math.round(value);
}

function groupRatings(archetype, state, facilities) {
    const body = bodyModifiers(archetype, state);
    const facility = facilityModifiers(facilities, state);
    return archetype.attributeGroups.map(group => {
        const values = group.attributes.map(attribute => {
            const row = state.at.find(item => item.g === group.name && item.n === attribute.name);
            return displayedValue(row, body, facility);
        });
        return {
            name: group.name,
            value: bankersRound(
                values.reduce((sum, value) => sum + value, 0) / values.length
            )
        };
    });
}

function adjustAttribute(archetype, state, direction) {
    const row = state.at.find(item => item.g === state.group && item.n === state.attribute);
    const curve = row && curveFor(archetype, row.g, row.n);
    if (!row || !curve) return { ok: false, reason: "That attribute cannot be adjusted." };

    const points = [{ apSpent: 0, statValue: Number(curve.baseValue) }, ...curve.curve]
        .sort((a, b) => Number(a.statValue) - Number(b.statValue));
    const index = points.findIndex(point => Number(point.statValue) === Number(row.v));
    const target = points[index + direction];
    if (!target) return { ok: false, reason: "That attribute is already at its limit." };

    const cap = Number(levelCaps(archetype, state.l)[row.n] ?? 99);
    const displayedTarget = Number(target.statValue) + (row.g === "Other" ? 1 : 0);
    if (displayedTarget > cap) {
        return { ok: false, reason: `Level ${state.l} caps ${row.n} at ${cap}.` };
    }

    const before = Number(row.v);
    row.v = Number(target.statValue);
    if (spentAp(archetype, state) > levelBudget(archetype, state.l)) {
        row.v = before;
        return { ok: false, reason: "Not enough AP for that upgrade." };
    }

    return { ok: true };
}

function validateState(archetype, state) {
    const caps = levelCaps(archetype, state.l);
    for (const row of state.at) {
        const curve = curveFor(archetype, row.g, row.n);
        if (!curve) continue;
        const permittedValues = new Set([
            Number(curve.baseValue),
            ...curve.curve.map(point => Number(point.statValue))
        ]);
        if (!permittedValues.has(Number(row.v))) {
            return `${row.n} has a value that is not on its AP curve.`;
        }
        const displayed = Number(row.v) + (row.g === "Other" ? 1 : 0);
        if (displayed > Number(caps[row.n] ?? 99)) {
            return `${row.n} exceeds its level ${state.l} cap.`;
        }
    }
    if (spentAp(archetype, state) > levelBudget(archetype, state.l)) {
        return `The build spends more AP than level ${state.l} allows.`;
    }
    return null;
}

function reconcileFacilities(facilities, state) {
    const level = facilities.levels.find(row => Number(row.level) === Number(state.cl));
    if (!level) {
        state.cl = 1;
        state.fa = [];
        return;
    }
    const selected = [];
    const used = new Set();
    let cost = 0;
    for (const row of state.fa) {
        if (used.has(row.n)) continue;
        const facility = level.facilities.find(item => item.name === row.n);
        const stars = facility?.starLevels.find(
            item => Number(item.star) === Number(row.l ?? row.s)
        );
        if (!facility || !stars || cost + Number(stars.cost) > Number(level.totalBudget)) continue;
        selected.push({
            n: facility.name,
            l: Number(stars.star),
            c: row.c === "AI" ? "AI" : "Player"
        });
        used.add(facility.name);
        cost += Number(stars.cost);
    }
    state.fa = selected;
}

function availableRegularPlaystyles(playstyles, state) {
    const stats = statMap(state);
    return playstyles.filter(playstyle =>
        !playstyle.isPlus && requirementsMet(playstyle.requirements, stats)
    );
}

function availableSignaturePlaystyles(archetype, playstyles, state) {
    const unlocked = signatureUnlocks(archetype, state);
    const stats = statMap(state);
    return playstyles.filter(playstyle =>
        archetype.allPlusPlaystyleIds.includes(playstyle.id) &&
        unlocked.has(playstyle.id) &&
        requirementsMet(playstyle.requirements, stats)
    );
}

function regularSlotCount(level) {
    return [1, 10, 20, 40, 60, 70, 80, 90, 95]
        .filter(unlockLevel => Number(level) >= unlockLevel).length;
}

function signatureSlotCount(level) {
    return [30, 50, 75, 95]
        .filter(unlockLevel => Number(level) >= unlockLevel).length;
}

function reconcilePlaystyles(archetype, playstyles, state) {
    const signatureIds = new Set(
        availableSignaturePlaystyles(archetype, playstyles, state)
            .map(playstyle => playstyle.id)
    );
    const regularIds = new Set(
        availableRegularPlaystyles(playstyles, state)
            .map(playstyle => playstyle.id)
    );
    state.sg = state.sg
        .filter(id => signatureIds.has(id))
        .slice(0, signatureSlotCount(state.l));
    state.ps = state.ps
        .filter(id => regularIds.has(id) && !state.sg.includes(id))
        .slice(0, regularSlotCount(state.l));
}

module.exports = {
    activeSpecializations,
    adjustAttribute,
    availableRegularPlaystyles,
    availableSignaturePlaystyles,
    cleanPortableState,
    decodeState,
    displayedValue,
    encodeState,
    facilityModifiers,
    freshState,
    getArchetype,
    getArchetypes,
    getFacilities,
    getPlaystyles,
    getSession,
    groupRatings,
    levelBudget,
    levelCaps,
    maxPlayerLevel,
    saveSession,
    reconcilePlaystyles,
    reconcileFacilities,
    regularSlotCount,
    signatureSlotCount,
    signatureUnlocks,
    spentAp,
    validateState,
    bodyModifiers
};
