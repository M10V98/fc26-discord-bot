const crypto = require("crypto");
const axios = require("axios");
const express = require("express");
const db = require("../Utils/db");

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1";
const SCOPES = ["user-read-private", "playlist-read-private", "playlist-read-collaborative"];
let clientToken = null;
let clientTokenExpiresAt = 0;

function config() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    const encryptionKey = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY;
    return { clientId, clientSecret, publicBaseUrl, encryptionKey };
}

function configured() {
    const { clientId, clientSecret, publicBaseUrl, encryptionKey } = config();
    return Boolean(clientId && clientSecret && publicBaseUrl && encryptionKey);
}

function redirectUri() {
    return `${config().publicBaseUrl}/spotify/callback`;
}

function encryptionKey() {
    const value = config().encryptionKey;
    if (!value) throw new Error("Spotify token encryption is not configured.");
    return crypto.createHash("sha256").update(value).digest();
}

function encrypt(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decrypt(value) {
    const [ivText, tagText, payloadText] = String(value || "").split(".");
    if (!ivText || !tagText || !payloadText) throw new Error("Saved Spotify sign-in is invalid.");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(payloadText, "base64url")), decipher.final()]).toString("utf8");
}

function basicAuth() {
    const { clientId, clientSecret } = config();
    return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function getClientToken() {
    if (clientToken && clientTokenExpiresAt > Date.now() + 30_000) return clientToken;
    const response = await axios.post(TOKEN_URL, new URLSearchParams({ grant_type: "client_credentials" }), {
        headers: { Authorization: `Basic ${basicAuth()}`, "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15_000
    });
    clientToken = response.data.access_token;
    clientTokenExpiresAt = Date.now() + Number(response.data.expires_in || 3600) * 1000;
    return clientToken;
}

async function spotifyGet(path, accessToken, params) {
    const response = await axios.get(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
        timeout: 15_000
    });
    return response.data;
}

async function createLink(discordId) {
    if (!configured()) throw new Error("Spotify linking has not been configured by the server owner yet.");
    const state = crypto.randomBytes(32).toString("base64url");
    const now = Date.now();
    await db.run("DELETE FROM spotify_link_states WHERE expires_at < ?", [now]);
    await db.run("INSERT INTO spotify_link_states (state, discord_id, expires_at, created_at) VALUES (?, ?, ?, ?)", [state, discordId, now + 10 * 60 * 1000, now]);
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", config().clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
}

async function exchangeCode(code) {
    const response = await axios.post(TOKEN_URL, new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri() }), {
        headers: { Authorization: `Basic ${basicAuth()}`, "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15_000
    });
    return response.data;
}

async function linkedAccessToken(discordId) {
    const account = await db.get("SELECT * FROM spotify_accounts WHERE discord_id = ?", [discordId]);
    if (!account) throw new Error("Link your Spotify account first with /music link.");
    const response = await axios.post(TOKEN_URL, new URLSearchParams({ grant_type: "refresh_token", refresh_token: decrypt(account.refresh_token) }), {
        headers: { Authorization: `Basic ${basicAuth()}`, "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15_000
    });
    if (response.data.refresh_token) {
        await db.run("UPDATE spotify_accounts SET refresh_token = ?, updated_at = ? WHERE discord_id = ?", [encrypt(response.data.refresh_token), Date.now(), discordId]);
    }
    return response.data.access_token;
}

async function searchTracks(query) {
    if (!configured()) throw new Error("Spotify search has not been configured by the server owner yet.");
    const data = await spotifyGet("/search", await getClientToken(), { q: query, type: "track", limit: 10, market: "GB" });
    return (data.tracks?.items || []).map(track => ({
        id: track.id,
        name: track.name,
        artists: (track.artists || []).map(artist => artist.name).join(", "),
        album: track.album?.name || "Unknown album",
        durationMs: track.duration_ms || 0,
        explicit: Boolean(track.explicit)
    }));
}

async function getPlaylists(discordId) {
    const data = await spotifyGet("/me/playlists", await linkedAccessToken(discordId), { limit: 50 });
    return (data.items || []).map(playlist => ({ id: playlist.id, name: playlist.name, tracks: playlist.tracks?.total || 0, imageUrl: playlist.images?.[0]?.url || null }));
}

async function selectPlaylists(discordId, playlists) {
    await db.run("DELETE FROM spotify_selected_playlists WHERE discord_id = ?", [discordId]);
    for (const playlist of playlists) {
        await db.run("INSERT INTO spotify_selected_playlists (discord_id, playlist_id, playlist_name, playlist_image_url, selected_at) VALUES (?, ?, ?, ?, ?)", [discordId, playlist.id, playlist.name, playlist.imageUrl, Date.now()]);
    }
}

async function selectedPlaylists(discordId) {
    return db.all("SELECT * FROM spotify_selected_playlists WHERE discord_id = ? ORDER BY playlist_name COLLATE NOCASE", [discordId]);
}

function startSpotifyCallbackServer() {
    if (!configured()) {
        console.log("Spotify integration disabled: set Spotify credentials and PUBLIC_BASE_URL to enable it.");
        return;
    }
    const app = express();
    app.get("/spotify/callback", async (req, res) => {
        const { code, state, error } = req.query;
        if (error) return res.status(400).send("Spotify sign-in was cancelled. You can close this page and try /music link again.");
        try {
            const link = await db.get("SELECT * FROM spotify_link_states WHERE state = ?", [String(state || "")]);
            await db.run("DELETE FROM spotify_link_states WHERE state = ?", [String(state || "")]);
            if (!link || link.expires_at < Date.now()) return res.status(400).send("This Spotify sign-in link has expired. Return to Discord and run /music link again.");
            const token = await exchangeCode(String(code || ""));
            const profile = await spotifyGet("/me", token.access_token);
            await db.run(`INSERT INTO spotify_accounts (discord_id, spotify_user_id, spotify_display_name, refresh_token, linked_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(discord_id) DO UPDATE SET spotify_user_id = excluded.spotify_user_id, spotify_display_name = excluded.spotify_display_name, refresh_token = excluded.refresh_token, updated_at = excluded.updated_at`, [link.discord_id, profile.id, profile.display_name || profile.id, encrypt(token.refresh_token), Date.now(), Date.now()]);
            return res.send("Spotify is linked to your Discord account. You can close this page and return to Discord.");
        } catch (err) {
            console.error("Spotify OAuth callback failed:", err.response?.data || err.message);
            return res.status(500).send("Spotify could not be linked. Return to Discord and try again.");
        }
    });
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => console.log(`Spotify callback server listening on port ${port}.`));
}

async function unlink(discordId) {
    await db.run("DELETE FROM spotify_selected_playlists WHERE discord_id = ?", [discordId]);
    return db.run("DELETE FROM spotify_accounts WHERE discord_id = ?", [discordId]);
}

module.exports = { configured, createLink, getPlaylists, searchTracks, selectPlaylists, selectedPlaylists, startSpotifyCallbackServer, unlink };
