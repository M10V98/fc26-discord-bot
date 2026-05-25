const sqlite3 =
    require("sqlite3").verbose();

const fs = require("fs");
const path = require("path");

const databasePath =
    process.env.DATABASE_PATH ||
    path.join(__dirname, "../database.sqlite");

fs.mkdirSync(
    path.dirname(databasePath),
    {
        recursive: true
    }
);

const db = new sqlite3.Database(
    databasePath,

    err => {

        if (err) {

            console.error(
                "❌ Database connection failed:",
                err
            );

        } else {

            console.log(
                "✅ Connected to SQLite database."
            );
        }
    }
);

const initStatements = [
    `
    CREATE TABLE IF NOT EXISTS clubs (
        guild_id TEXT PRIMARY KEY,
        club_id TEXT
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS linked_players (
        discord_id TEXT PRIMARY KEY,
        player_name TEXT UNIQUE
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS players (
        player_name TEXT PRIMARY KEY,
        guild_id TEXT,
        position TEXT,
        archetype TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        matches INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        second_assists INTEGER DEFAULT 0,
        shots INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        passes INTEGER DEFAULT 0,
        pass_attempts INTEGER DEFAULT 0,
        tackles INTEGER DEFAULT 0,
        tackle_attempts INTEGER DEFAULT 0,
        interceptions INTEGER DEFAULT 0,
        dribbles INTEGER DEFAULT 0,
        clean_sheets INTEGER DEFAULT 0,
        motm INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        total_rating REAL DEFAULT 0
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS processed_matches (
        match_id TEXT PRIMARY KEY
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS automode (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT,
        last_match_id TEXT,
        started_at INTEGER,
        last_activity_at INTEGER
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS matches (
        match_id TEXT PRIMARY KEY,
        guild_id TEXT,
        club_name TEXT,
        opponent_name TEXT,
        goals_for INTEGER,
        goals_against INTEGER,
        result TEXT,
        match_type TEXT,
        match_date TEXT
    )
    `
];

function run(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.run(
            sql,
            params,

            function(err) {

                if (err) reject(err);
                else resolve(this);
            }
        );
    });
}

function get(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.get(
            sql,
            params,

            (err, row) => {

                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

function all(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.all(
            sql,
            params,

            (err, rows) => {

                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

async function init() {

    for (const statement of initStatements) {
        await run(statement);
    }

    await ensureColumn(
        "automode",
        "last_match_id",
        "TEXT"
    );

    await ensureColumn(
        "automode",
        "started_at",
        "INTEGER"
    );

    await ensureColumn(
        "automode",
        "last_activity_at",
        "INTEGER"
    );
}

async function ensureColumn(table, column, definition) {

    const columns =
        await all(`PRAGMA table_info(${table})`);

    const exists =
        columns.some(row => row.name === column);

    if (exists) {
        return;
    }

    await run(
        `ALTER TABLE ${table}
         ADD COLUMN ${column} ${definition}`
    );
}

function close() {

    return new Promise((resolve, reject) => {

        db.close(err => {

            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    db,
    run,
    get,
    all,
    init,
    close
};
