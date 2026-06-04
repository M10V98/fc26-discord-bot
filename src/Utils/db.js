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
        all_time_xp INTEGER DEFAULT 0,
        season_xp INTEGER DEFAULT 0,
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
        position_counts TEXT DEFAULT '{}',
        PRIMARY KEY (guild_id, player_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS processed_matches (
        match_id TEXT PRIMARY KEY
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS xp_seasons (
        guild_id TEXT,
        club_id TEXT,
        season_number INTEGER DEFAULT 1,
        last_match_type TEXT,
        last_match_timestamp INTEGER,
        last_finish_count INTEGER DEFAULT 0,
        updated_at INTEGER,
        PRIMARY KEY (guild_id, club_id)
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
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT,
        key TEXT,
        value TEXT,
        PRIMARY KEY (guild_id, key)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS polls (
        poll_id TEXT PRIMARY KEY,
        guild_id TEXT,
        channel_id TEXT,
        message_id TEXT,
        creator_id TEXT,
        question TEXT,
        options_json TEXT,
        created_at INTEGER
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS poll_votes (
        poll_id TEXT,
        guild_id TEXT,
        user_id TEXT,
        option_index INTEGER,
        voted_at INTEGER,
        PRIMARY KEY (poll_id, user_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS quiz_scores (
        guild_id TEXT,
        user_id TEXT,
        correct INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        xp_awarded INTEGER DEFAULT 0,
        updated_at INTEGER,
        PRIMARY KEY (guild_id, user_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS quiz_sessions (
        session_id TEXT PRIMARY KEY,
        guild_id TEXT,
        channel_id TEXT,
        message_id TEXT,
        creator_id TEXT,
        current_question_id TEXT,
        current_question_json TEXT,
        active INTEGER DEFAULT 1,
        asked_count INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS quiz_answers (
        session_id TEXT,
        guild_id TEXT,
        question_id TEXT,
        user_id TEXT,
        answer_index INTEGER,
        correct INTEGER DEFAULT 0,
        answered_at INTEGER,
        PRIMARY KEY (session_id, question_id, user_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS mod_infractions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        moderator_id TEXT,
        type TEXT,
        reason TEXT,
        created_at INTEGER
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS ai_message_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        channel_id TEXT,
        author_id TEXT,
        author_name TEXT,
        content TEXT,
        intent TEXT,
        should_reply INTEGER DEFAULT 0,
        created_at INTEGER
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS scheduled_sessions (
        session_id TEXT PRIMARY KEY,
        guild_id TEXT,
        channel_id TEXT,
        message_id TEXT,
        role_id TEXT,
        creator_id TEXT,
        title TEXT,
        time_text TEXT,
        load_up_text TEXT,
        league TEXT,
        crest_url TEXT,
        load_up_at INTEGER,
        starts_at INTEGER,
        can_play TEXT DEFAULT '[]',
        cannot_play TEXT DEFAULT '[]',
        maybe_play TEXT DEFAULT '[]',
        created_at INTEGER
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
        "clubs",
        "stats_started_at",
        "INTEGER DEFAULT 0"
    );

    await run(
        `
        UPDATE clubs
        SET stats_started_at = ?
        WHERE COALESCE(stats_started_at, 0) = 0
        `,
        [Date.now()]
    );

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

    await ensureColumn(
        "automode",
        "started_by",
        "TEXT"
    );

    await ensureColumn(
        "scheduled_sessions",
        "league",
        "TEXT"
    );

    await ensureColumn(
        "scheduled_sessions",
        "load_up_text",
        "TEXT"
    );

    await ensureColumn(
        "scheduled_sessions",
        "load_up_at",
        "INTEGER"
    );

    await ensureColumn(
        "scheduled_sessions",
        "crest_url",
        "TEXT"
    );

    await ensureColumn(
        "scheduled_sessions",
        "can_play",
        "TEXT DEFAULT '[]'"
    );

    await ensureColumn(
        "scheduled_sessions",
        "cannot_play",
        "TEXT DEFAULT '[]'"
    );

    await ensureColumn(
        "scheduled_sessions",
        "maybe_play",
        "TEXT DEFAULT '[]'"
    );

    await ensureColumn(
        "players",
        "position_counts",
        "TEXT DEFAULT '{}'"
    );

    await ensureColumn(
        "players",
        "all_time_xp",
        "INTEGER DEFAULT 0"
    );

    await ensureColumn(
        "players",
        "season_xp",
        "INTEGER DEFAULT 0"
    );

    await ensureColumn(
        "xp_seasons",
        "last_finish_count",
        "INTEGER DEFAULT 0"
    );

    await ensureColumn(
        "quiz_sessions",
        "current_question_json",
        "TEXT"
    );

    await backfillXpColumns();

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
                    all_time_xp INTEGER DEFAULT 0,
                    season_xp INTEGER DEFAULT 0,
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
                    position_counts TEXT DEFAULT '{}'
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
                    all_time_xp INTEGER DEFAULT 0,
                    season_xp INTEGER DEFAULT 0,
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
                    position_counts TEXT DEFAULT '{}',
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

    await runOnce(
        "xp_recalc_pass_5_quiz_1_v1",
        recalculateStoredXpTotals
    );
}

async function backfillXpColumns() {
    await run(`
        UPDATE players
        SET all_time_xp = xp
        WHERE COALESCE(all_time_xp, 0) = 0
        AND COALESCE(xp, 0) > 0
    `);

    await run(`
        UPDATE players
        SET season_xp = xp
        WHERE COALESCE(season_xp, 0) = 0
        AND COALESCE(xp, 0) > 0
    `);
}

async function recalculateStoredXpTotals() {
    const {
        calculateXPBreakdown,
        getLevelFromXP
    } = require("./xpSystem");

    await run(`
        UPDATE quiz_scores
        SET xp_awarded = COALESCE(correct, 0) * 1
    `);

    const players =
        await all(`
            SELECT *
            FROM players
            ORDER BY guild_id, player_name
        `);

    let updated = 0;
    let beforeTotal = 0;
    let afterTotal = 0;

    for (const player of players) {
        const quiz =
            await get(
                `
                SELECT COALESCE(SUM(q.xp_awarded), 0) AS xp
                FROM quiz_scores q
                JOIN linked_players l
                  ON l.guild_id = q.guild_id
                 AND l.discord_id = q.user_id
                WHERE l.guild_id = ?
                AND (
                    l.player_id = ?
                    OR LOWER(l.player_name) = LOWER(?)
                )
                `,
                [
                    player.guild_id,
                    player.player_id,
                    player.player_name
                ]
            );
        const matchXp =
            calculateXPBreakdown(player).total;
        const quizXp =
            Number(quiz?.xp || 0);
        const totalXp =
            Math.max(
                0,
                Math.floor(matchXp + quizXp)
            );

        beforeTotal += Number(player.xp || 0);
        afterTotal += totalXp;

        await run(
            `
            UPDATE players
            SET xp = ?,
                season_xp = ?,
                all_time_xp = ?,
                level = ?
            WHERE guild_id = ?
            AND player_id = ?
            `,
            [
                totalXp,
                totalXp,
                totalXp,
                getLevelFromXP(totalXp),
                player.guild_id,
                player.player_id
            ]
        );

        updated += 1;
    }

    console.log(
        `XP migration recalculated ${updated} players. Total XP ${beforeTotal} -> ${afterTotal}.`
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
