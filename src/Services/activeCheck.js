const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const db = require("../Utils/db");

const ACTIVE_CHECK_CHANNEL_ID = "1541025110004338810";
const BOT_ADMIN_CHANNEL_ID = "1554100339634872400";
const LONDON_TIME_ZONE = "Europe/London";
let refreshInterval = null;

async function targetMembers(guild) {
    await guild.members.fetch();
    const roleId = String(process.env.ACTIVE_CHECK_ROLE_ID || "").trim();
    if (roleId) {
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (role) return [...role.members.values()].filter(member => !member.user.bot);
        console.warn("[ActiveCheck] ACTIVE_CHECK_ROLE_ID does not match a role; using all members.");
    }
    return [...guild.members.cache.values()].filter(member => !member.user.bot);
}

async function updateAdminStatus(client, guild, state, details = {}) {
    const adminChannel = await client.channels.fetch(BOT_ADMIN_CHANNEL_ID).catch(() => null);
    const checkChannel = await client.channels.fetch(ACTIVE_CHECK_CHANNEL_ID).catch(() => null);
    if (!adminChannel?.send || !checkChannel || adminChannel.guild?.id !== guild.id) return;
    const members = await targetMembers(guild);
    let responded = 0;
    if (state?.last_message_id) {
        const message = await checkChannel.messages.fetch(state.last_message_id).catch(() => null);
        const reaction = message?.reactions.cache.get("✅");
        const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
        const ids = new Set(users ? [...users.values()].filter(user => !user.bot).map(user => user.id) : []);
        responded = members.filter(member => ids.has(member.id)).length;
    }
    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("Active Check status")
        .setDescription(`Active check channel: <#${ACTIVE_CHECK_CHANNEL_ID}>`)
        .addFields(
            { name: "Current responses", value: `${responded} / ${members.length}`, inline: true },
            { name: "Still to respond", value: String(Math.max(0, members.length - responded)), inline: true },
            { name: "Previous missed checks", value: String(details.missed || 0), inline: true },
            { name: "Warning DMs delivered", value: String(details.warningDms || 0), inline: true },
            { name: "Warning fallback tags", value: String(details.warningFallbacks || 0), inline: true }
        )
        .setFooter({ text: "Live response count refreshes every five minutes." })
        .setTimestamp();
    const existing = state?.admin_message_id
        ? await adminChannel.messages.fetch(state.admin_message_id).catch(() => null)
        : null;
    if (existing) {
        await existing.edit({ embeds: [embed] }).catch(() => null);
        return;
    }
    const message = await adminChannel.send({ embeds: [embed] }).catch(() => null);
    if (!message) return;
    await db.run(
        `UPDATE active_check_states SET admin_message_id = ? WHERE guild_id = ?`,
        [message.id, guild.id]
    );
}

async function runActiveCheck(client) {
    const channel = await client.channels.fetch(ACTIVE_CHECK_CHANNEL_ID).catch(() => null);
    if (!channel?.send || !channel.guild) {
        console.error("[ActiveCheck] Target channel is unavailable.");
        return;
    }
    const guild = channel.guild;
    const state = await db.get(
        `SELECT * FROM active_check_states WHERE guild_id = ?`,
        [guild.id]
    ) || {};
    const members = await targetMembers(guild);
    let missedChecks = {};
    try { missedChecks = JSON.parse(state.missed_checks_json || "{}"); } catch { missedChecks = {}; }
    let missed = 0;
    let warningDms = 0;
    let warningFallbacks = 0;

    if (state.last_message_id) {
        const oldMessage = await channel.messages.fetch(state.last_message_id).catch(() => null);
        const reaction = oldMessage?.reactions.cache.get("✅");
        const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
        const reacted = new Set(users ? [...users.values()].map(user => user.id) : []);
        for (const member of members) {
            if (reacted.has(member.id)) {
                missedChecks[member.id] = 0;
                continue;
            }
            missed += 1;
            missedChecks[member.id] = Number(missedChecks[member.id] || 0) + 1;
            if (missedChecks[member.id] === 2) {
                try {
                    await member.send(`⚠️ You have missed two consecutive Active Checks in **${guild.name}**. Please react to the new check in <#${ACTIVE_CHECK_CHANNEL_ID}> to avoid removal.`);
                    warningDms += 1;
                } catch {
                    await channel.send(`<@${member.id}> Please react to the new Active Check. You have missed two consecutive checks.`).catch(() => null);
                    warningFallbacks += 1;
                }
            }
        }
        await oldMessage?.delete().catch(() => null);
    }

    const newMessage = await channel.send({
        content: "@everyone\n**Weekly Active Check**\n\nReact with ✅ if you want to remain in the server.\n\n*Three missed checks may result in removal.*",
        allowedMentions: { parse: ["everyone"] }
    });
    await newMessage.react("✅");
    await db.run(
        `INSERT INTO active_check_states (guild_id, last_message_id, missed_checks_json)
         VALUES (?, ?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET last_message_id = excluded.last_message_id, missed_checks_json = excluded.missed_checks_json`,
        [guild.id, newMessage.id, JSON.stringify(missedChecks)]
    );
    const updated = await db.get(`SELECT * FROM active_check_states WHERE guild_id = ?`, [guild.id]);
    await updateAdminStatus(client, guild, updated, { missed, warningDms, warningFallbacks });
    console.log(`[ActiveCheck] Posted weekly check for ${members.length} members.`);
}

async function refreshActiveCheckStatus(client) {
    const channel = await client.channels.fetch(ACTIVE_CHECK_CHANNEL_ID).catch(() => null);
    if (!channel?.guild) return;
    const state = await db.get(`SELECT * FROM active_check_states WHERE guild_id = ?`, [channel.guild.id]);
    if (state?.last_message_id) await updateAdminStatus(client, channel.guild, state);
}

function startActiveCheckScheduler(client) {
    cron.schedule("0 12 * * 0", () => runActiveCheck(client).catch(err => console.error("[ActiveCheck] Run failed:", err)), { timezone: LONDON_TIME_ZONE });
    if (refreshInterval) clearInterval(refreshInterval);
    refreshActiveCheckStatus(client).catch(err => console.error("[ActiveCheck] Status refresh failed:", err));
    refreshInterval = setInterval(() => refreshActiveCheckStatus(client).catch(err => console.error("[ActiveCheck] Status refresh failed:", err)), 5 * 60 * 1000);
    console.log("[ActiveCheck] Scheduler registered for Sundays at 12:00 London time.");
}

module.exports = { startActiveCheckScheduler, runActiveCheck, refreshActiveCheckStatus };
