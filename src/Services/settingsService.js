const db = require("../Utils/db");

const DEFAULTS = {
    inFormWindow: "10",
    compInFormWindow: "10",
    schedulePreTagMinutes: "30"
};

const KEYS = {
    inFormWindow: "in_form_window",
    compInFormWindow: "comp_in_form_window",
    schedulePreTagMinutes: "schedule_pre_tag_minutes"
};

async function getSetting(guildId, key) {
    const row =
        await db.get(
            `
            SELECT value
            FROM guild_settings
            WHERE guild_id = ?
            AND key = ?
            `,
            [
                guildId,
                key
            ]
        );

    return row?.value;
}

async function setSetting(guildId, key, value) {
    await db.run(
        `
        INSERT OR REPLACE INTO guild_settings
        (guild_id, key, value)
        VALUES (?, ?, ?)
        `,
        [
            guildId,
            key,
            String(value)
        ]
    );
}

async function getGuildSettings(guildId) {
    const rows =
        await db.all(
            `
            SELECT key, value
            FROM guild_settings
            WHERE guild_id = ?
            `,
            [guildId]
        );

    const values =
        new Map(rows.map(row => [row.key, row.value]));

    return {
        inFormWindow:
            Number(values.get(KEYS.inFormWindow) || DEFAULTS.inFormWindow),
        compInFormWindow:
            Number(values.get(KEYS.compInFormWindow) || DEFAULTS.compInFormWindow),
        schedulePreTagMinutes:
            Number(values.get(KEYS.schedulePreTagMinutes) || DEFAULTS.schedulePreTagMinutes)
    };
}

module.exports = {
    DEFAULTS,
    KEYS,
    getSetting,
    setSetting,
    getGuildSettings
};
