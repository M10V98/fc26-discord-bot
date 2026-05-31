const express = require("express");
const path = require("path");
const { db } = require("../Utils/initDb");
const eaApi = require("../Services/eaApi");
const { getLevel } = require("../Services/levelService");

const app = express();
const PORT = 3000;

// -------------------------
// HOME PAGE
// -------------------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// -------------------------
// LEADERBOARD API
// -------------------------
app.get("/api/leaderboard", (req, res) => {

    const players = db.get("linked_players") || {};

    const sorted = Object.values(players)
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .map(p => ({
            name: p.player_name,
            xp: p.xp || 0,
            level: getLevel(p.xp || 0).name
        }));

    res.json(sorted);
});

// -------------------------
// MATCH HISTORY API
// -------------------------
app.get("/api/matches", async (req, res) => {

    try {

        const clubId = db.get("clubs")?.default;

        if (!clubId) {
            return res.json([]);
        }

        const matches =
            await eaApi.getRecentMatches(
                clubId,
                { limit: 10 }
            );

        res.json(matches);

    } catch (err) {
        res.status(500).json({ error: "Failed to load matches" });
    }
});

// -------------------------
// PLAYER PROFILE API
// -------------------------
app.get("/api/player/:name", (req, res) => {

    const players = db.get("linked_players") || {};
    const name = req.params.name;

    const player = Object.values(players)
        .find(p => p.player_name === name);

    if (!player) {
        return res.status(404).json({ error: "Player not found" });
    }

    res.json({
        ...player,
        level: getLevel(player.xp || 0)
    });
});

// -------------------------
// START SERVER
// -------------------------
app.listen(PORT, () => {
    console.log(`🌐 Dashboard running on http://localhost:${PORT}`);
});
