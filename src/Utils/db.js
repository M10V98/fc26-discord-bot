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
        discord_id TEXT,
        guild_id TEXT,
        player_id TEXT,
        player_name TEXT,
        PRIMARY KEY (guild_id, discord_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS players (
        player_id TEXT,
        player_name TEXT,
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
        total_rating REAL DEFAULT 0,
        PRIMARY KEY (guild_id, player_id)
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
    `,
    `
    CREATE TABLE IF NOT EXISTS comp_matches (
        guild_id TEXT,
        club_id TEXT,
        match_id TEXT,
        timestamp INTEGER,
        match_json TEXT,
        created_at INTEGER,
        PRIMARY KEY (guild_id, match_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT
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

    await migrateLinkedPlayersTable();

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

    // Schema migration: linked_players gains guild_id + player_id.
    await ensureColumn(
        "linked_players",
        "guild_id",
        "TEXT"
    );

    await ensureColumn(
        "linked_players",
        "player_id",
        "TEXT"
    );

    // Schema migration: players gains player_id (one-time fresh start).
    await runOnce(
        "players_reset_v2",
        async () => {

            await run(`DROP TABLE IF EXISTS players`);

            await run(`
                CREATE TABLE players (
                    player_id TEXT PRIMARY KEY,
                    player_name TEXT,
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
            `);

            await run(
                `DELETE FROM processed_matches`
            );

            console.log(
                "Schema migration: players table reset to playerId-keyed schema."
            );
        }
    );

    await runOnce(
        "players_reset_v3",
        async () => {

            await run(`DROP TABLE IF EXISTS players`);

            await run(`
                CREATE TABLE players (
                    player_id TEXT,
                    player_name TEXT,
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
                    total_rating REAL DEFAULT 0,
                    PRIMARY KEY (guild_id, player_id)
                )
            `);

            await run(
                `DELETE FROM processed_matches`
            );

            console.log(
                "Schema migration: players table reset to guild-scoped playerId schema."
            );
        }
    );
}

async function migrateLinkedPlayersTable() {

    const columns =
        await all(`PRAGMA table_info(linked_players)`);

    const discordColumn =
        columns.find(row => row.name === "discord_id");

    const needsCompositeKey =
        discordColumn && Number(discordColumn.pk) === 1;

    if (!needsCompositeKey) {
        return;
    }

    await run(`
        CREATE TABLE IF NOT EXISTS linked_players_new (
            discord_id TEXT,
            guild_id TEXT,
            player_id TEXT,
            player_name TEXT,
            PRIMARY KEY (guild_id, discord_id)
        )
    `);

    const hasGuildId =
        columns.some(row => row.name === "guild_id");

    const hasPlayerId =
        columns.some(row => row.name === "player_id");

    const guildExpr =
        hasGuildId
            ? "COALESCE(guild_id, 'legacy')"
            : "'legacy'";

    const playerIdExpr =
        hasPlayerId
            ? "player_id"
            : "NULL";

    await run(`
        INSERT OR IGNORE INTO linked_players_new
        (discord_id, guild_id, player_id, player_name)
        SELECT
            discord_id,
            ${guildExpr},
            ${playerIdExpr},
            player_name
        FROM linked_players
    `);

    await run(`DROP TABLE linked_players`);

    await run(`ALTER TABLE linked_players_new RENAME TO linked_players`);

    console.log(
        "Schema migration: linked_players now uses guild-scoped claims."
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

async function runOnce(key, fn) {

    const existing =
        await get(
            `SELECT value FROM schema_meta WHERE key = ?`,
            [key]
        );

    if (existing) {
        return;
    }

    await fn();

    await run(
        `INSERT OR REPLACE INTO schema_meta (key, value)
         VALUES (?, ?)`,
        [key, String(Date.now())]
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
