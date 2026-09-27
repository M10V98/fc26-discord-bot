const cron = require('node-cron');
const db = require('../Utils/db');

// --- Central Configuration Parameters ---
const CHANNEL_ID = '1541025110004338810';  // ✅ Configured with your Active-check channel
const ROLE_ID = '876543210987654321';     // 👈 Make sure to replace this with your actual member role ID!

/**
 * Initializes the automated recurring active check system
 * @param {Client} client - The running discord.js ReadyClient instance
 */
function startActiveCheckScheduler(client) {
    // Scheduled to fire exactly every Sunday at 12:00 PM
    cron.schedule('0 12 * * 0', async () => {
        console.log('[ActiveCheck] Beginning execution routine...');

        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) return console.error('[ActiveCheck] Setup Failure: Target channel not found.');

            const guild = channel.guild;
            
            // Fetch current tracking state data scoped specifically to this server
            let state = await db.get(
                `SELECT last_message_id, missed_checks_json FROM active_check_states WHERE guild_id = ?`,
                [guild.id]
            );

            let missedChecks = {};
            let lastMessageId = null;

            if (state) {
                lastMessageId = state.last_message_id;
                try {
                    missedChecks = JSON.parse(state.missed_checks_json || '{}');
                } catch (e) {
                    missedChecks = {};
                }
            }

            // 1. Process existing parameters if an earlier check message is active
            if (lastMessageId) {
                try {
                    const oldMsg = await channel.messages.fetch(lastMessageId);
                    const checkReaction = oldMsg.reactions.cache.get('✅');

                    let reactedUserIds = [];
                    if (checkReaction) {
                        const users = await checkReaction.users.fetch();
                        reactedUserIds = users.map(u => u.id);
                    }

                    // Fetch base members matching the required target role configuration
                    const role = await guild.roles.fetch(ROLE_ID);
                    if (role) {
                        // Secure a complete member roster cache layer
                        await guild.members.fetch();

                        for (const [memberId, member] of role.members) {
                            if (member.user.bot) continue;

                            if (!reactedUserIds.includes(memberId)) {
                                // Member skipped reaction check: Increment strikes
                                missedChecks[memberId] = (missedChecks[memberId] || 0) + 1;

                                // Issue warning notification DM on strike number 2
                                if (missedChecks[memberId] === 2) {
                                    try {
                                        await member.send(
                                            `⚠️ **Active Check Warning:** You have missed **2 consecutive active checks** in **${guild.name}**. ` +
                                            `Please react to the new check posted today in <#${CHANNEL_ID}> to avoid server removal.`
                                        );
                                    } catch (dmErr) {
                                        console.log(`[ActiveCheck] Could not DM user ${member.user.tag} (DMs locked/closed).`);
                                    }
                                }
                            } else {
                                // User reacted: Reset strike counts to zero
                                missedChecks[memberId] = 0;
                            }
                        }
                    }

                    // 2. Auto-delete the expired week's message block
                    await oldMsg.delete();
                    console.log('[ActiveCheck] Expired active check message deleted.');

                } catch (msgErr) {
                    console.error('[ActiveCheck] Error handling expired message status:', msgErr.message);
                }
            }

            // 3. Post new week's prompt card out to the community channel
            const newMsg = await channel.send({
                content: `@everyone\n**Weekly Active Check**\n\nReact with a ✅ if you want to be kept in the server.\n\n*3 missed checks will result in removal.*`
            });

            await newMsg.react('✅');

            // 4. Update the SQL records with updated active state pointers
            await db.run(
                `INSERT INTO active_check_states (guild_id, last_message_id, missed_checks_json) 
                 VALUES (?, ?, ?)
                 ON CONFLICT(guild_id) DO UPDATE SET 
                    last_message_id = excluded.last_message_id,
                    missed_checks_json = excluded.missed_checks_json`,
                [guild.id, newMsg.id, JSON.stringify(missedChecks)]
            );

            console.log('[ActiveCheck] Completed initialization routine successfully.');

        } catch (globalErr) {
            console.error('[ActiveCheck] Fatal engine fault:', globalErr);
        }
    });

    console.log('[ActiveCheck] Core engine scheduler registered.');
}

module.exports = { startActiveCheckScheduler };