const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder 
} = require("discord.js");
const spotify = require("../Services/spotify");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Find a song with Spotify")
        .addStringOption(option => option
            .setName("query")
            .setDescription("Song, artist, or album")
            .setRequired(true)
            .setMaxLength(120)),
            
    async execute(interaction) {
        if (!spotify.configured()) {
            return interaction.reply({
                content: "Music discovery is not configured yet. The server owner needs to add the Spotify app credentials before this can be used.",
                ephemeral: true
            });
        }

        await interaction.deferReply();
        const query = interaction.options.getString("query", true);

        try {
            // 1. Fetch exactly the top 3 tracks to keep the menu minimalist
            const tracks = await spotify.searchTracks(query, 3); 

            if (!tracks || tracks.length === 0) {
                return interaction.editReply("❌ No tracks found for that search query.");
            }

            // 2. Build the standalone String Select Menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('music_track_menu_selection') // Connects cleanly to your index.js handler
                .setPlaceholder('Click here to choose your song...');

            // Loop through the tracks to construct the option blocks safely
            tracks.forEach((track, idx) => {
                const labelText = `${idx + 1}. ${track.name || 'Unknown Track'}`.slice(0, 95);
                
                let artistName = 'Unknown Artist';
                if (track.artists) {
                    if (typeof track.artists === 'string') {
                        artistName = track.artists;
                    } else if (track.artists.name) {
                        artistName = track.artists.name;
                    } else if (Array.isArray(track.artists)) {
                        artistName = track.artists.map(a => a.name || a).join(', ');
                    }
                }
                
                const descriptionText = `by ${artistName}`.slice(0, 95);
                
                // CRITICAL FIX 1: Hard slice the core text query string at 80 characters
                const coreQueryText = `${track.name || ''} ${artistName}`.trim().slice(0, 80);
                
                // CRITICAL FIX 2: Append the unique index identifier suffix.
                // This stays well below Discord's 100-character wall and completely fixes COMPONENT_OPTION_VALUE_DUPLICATED
                const safeUniqueValue = `${coreQueryText}||_idx_${idx}`;
                
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(labelText)
                        .setDescription(descriptionText)
                        .setValue(safeUniqueValue) 
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // 3. Send just the component row to the user
            await interaction.editReply({
                content: `🔍 **Search options for:** *${query}*`,
                components: [row]
            });

        } catch (error) {
            console.error("Spotify Search Error:", error);
            await interaction.editReply("❌ An error occurred while retrieving track options.");
        }
    }
};