const database = require("./db");

if (require.main === module) {
    database.init()
        .then(async () => {
            console.log("Database initialized successfully.");
            await database.close();
        })
        .catch(async err => {
            console.error("Database initialization failed:", err);
            await database.close().catch(() => {});
            process.exit(1);
        });
}

module.exports = database;
