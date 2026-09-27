  }
        } catch (err) {
            console.error("Interaction error:", err);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        content: "Something went wrong."
                    });
                } else {
                    await interaction.reply({
                        content: "Something went wrong.",
                        ephemeral: true
                    });
                }
            } catch (replyErr) {
                console.error("Reply fail:", replyErr);
            }
        }
    }
); // 💥 This cleanly closes out the InteractionCreate event listener!

// ==========================================
// ⚽ LIVE TWITCH CLIP EXPRESS WEBHOOK RECEIVER
// ==========================================
const express = require("express");
const app = express();
const axios = require("axios");
app.use(express.json());

/**
 * Helper function to generate a temporary OAuth access token from Twitch
 */
async function getTwitchAccessToken() {
    try {
        const response = await axios.post("https://twitch.tv", null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: "client_credentials"
            }
        });
        return response.data.access_token;
    } catch (err) {
        console.error("[Twitch API] Token retrieval failed:", err.message);
        return null;
    }
}

app.post("/api/stream-goal", async (req, res) => {
    const { newScore } = req.body;
    const CLIPS_CHANNEL_ID = "1522213910931963944"; // Configured channel destination [7]
    
    try {
        const channel = await client.channels.fetch(CLIPS_CHANNEL_ID);
        if (!channel) return res.status(404).json({ error: "Clips channel not found" });

        // 1. Initial text notification to prevent delay
        await channel.send(`⚽ **GOAL FOR NXT!** Score is now **${newScore}**! Fetching live clip...`);
        
        // 2. Query Twitch API to capture a clip from your stream
        const token = await getTwitchAccessToken();
        if (token) {
            console.log("[Twitch API] Requesting clip generation sequence...");
            
            const clipResponse = await axios.post(
                `https://twitch.tv{process.env.TWITCH_BROADCASTER_ID}`,
                null,
                {
                    headers: {
                        "Client-ID": process.env.TWITCH_CLIENT_ID,
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            if (clipResponse.data && clipResponse.data.data && clipResponse.data.data[0]) {
                const clipUrl = clipResponse.data.data[0].edit_url.replace("/edit", "");
                
                // 3. Wait 5 seconds for Twitch to transcode the video clip fully before posting
                setTimeout(async () => {
                    await channel.send(`🎬 **Watch the goal here:** ${clipUrl}`);
                }, 5000);
            } else {
                await channel.send("⚠️ Twitch was unable to generate a clip at this moment.");
            }
        }
        
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Failed to execute goal clipping routine:", err.response ? err.response.data : err.message);
        return res.status(500).json({ error: "Internal processing error" });
    }
});

// Port assigned by Railway or local environment fallback
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Goal Webhook server running on port ${PORT}`));

client.login(discordToken);