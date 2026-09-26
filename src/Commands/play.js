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
            // 1. Fetch search results array using your service
            const tracks = await spotify.searchTracks(query, 10); 

            if (!tracks || tracks.length === 0) {
                return interaction.editReply("❌ No tracks found for that search query.");
            }

            // 2. Build the standalone String Select Menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('music_track_menu_selection') // Clean routing ID matching your index handler
                .setPlaceholder('Click here to choose your song...');

            // Loop through the tracks to construct the option blocks safely
            tracks.forEach((track, idx) => {
                // Ensure text limits stay under Discord's 100 character window rules
                const labelText = `${idx + 1}. ${track.name || 'Unknown Track'}`.slice(0, 95);
                
                // Safely extract artist details regardless of text string or array configuration layouts
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
                
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(labelText)
                        .setDescription(descriptionText)
                        // Hidden search value sent directly to YouTube audio query stream
                        .setValue(`${track.name || ''} ${artistName}`.trim()) 
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