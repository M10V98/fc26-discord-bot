const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const spotify = require("../Services/spotify");

async function replyWithSearch(interaction, query, verifiedVoiceChannel = null) {
    // If it's a select menu interaction, execute actual voice playback
    if (interaction.isStringSelectMenu()) {
        const songMetadata = Array.isArray(query) ? query.flat().join(' ') : String(query); 

        // Pull channel directly out of verified parameter context first
        const voiceChannel = verifiedVoiceChannel || interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.editReply("❌ You must join a voice channel before selecting a track!");
        }

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // 1. SOUNDCLOUD LOOKUP BYPASS: Search SoundCloud to completely ignore YouTube data center bans
            const soundcloudResults = await play.search(songMetadata, { 
                limit: 1,
                source: { soundcloud: "tracks" }
            });
            
            if (!soundcloudResults || soundcloudResults.length === 0) {
                return interaction.editReply(`❌ Could not find a matching track on SoundCloud for: *${songMetadata}*`);
            }

            const targetTrackUrl = soundcloudResults[0].url;
            const targetTrackTitle = soundcloudResults[0].name;

            // 2. Stream audio smoothly using native SoundCloud stream packets
            const streamInstance = await play.stream(targetTrackUrl, { quality: 1 });
            const audioResource = createAudioResource(streamInstance.stream, { inputType: streamInstance.type });
            const audioPlayer = createAudioPlayer();

            audioPlayer.play(audioResource);
            connection.subscribe(audioPlayer);

            await interaction.editReply({ content: `🎶 Now streaming from SoundCloud: **${targetTrackTitle}**`, components: [] });

            // Clear active server allocations on song completion to minimize Railway RAM footprint
            audioPlayer.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            audioPlayer.on('error', error => {
                console.error(`Audio Streaming Error: ${error.message}`);
                connection.destroy();
            });

        } catch (error) {
            console.error("Critical Playback System Failure:", error);
            await interaction.editReply("❌ Failed to stream audio from SoundCloud. Connection timed out.");
        }
        return;
    }

    // Default Behavior: Treat as slash command text input search query
    await interaction.deferReply({ ephemeral: true });
    try {
        const tracks = await spotify.searchTracks(query, 3);
        if (!tracks.length) return interaction.editReply("No Spotify tracks matched that search.");
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('music_track_menu_selection')
            .setPlaceholder('Click here to choose your song...');

        tracks.forEach((track, idx) => {
            const labelText = `${idx + 1}. ${track.name || 'Unknown Track'}`.slice(0, 95);
            
            let artistName = 'Unknown Artist';
            if (track.artists) {
                if (typeof track.artists === 'string') artistName = track.artists;
                else if (track.artists.name) artistName = track.artists.name;
                else if (Array.isArray(track.artists)) artistName = track.artists.map(a => a.name || a).join(', ');
            }
            
            const descriptionText = `by ${artistName}`.slice(0, 95);
            const coreQueryText = `${track.name || ''} ${artistName}`.trim().slice(0, 80);
            const safeUniqueValue = `${coreQueryText}||_idx_${idx}`;
            
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(labelText)
                    .setDescription(descriptionText)
                    .setValue(safeUniqueValue) 
            );
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return interaction.editReply({ 
            content: `🔍 **Search options for:** *${query}*`,
            components: [row]
        });
    } catch (err) {
        console.error("Spotify search failed:", err.response?.data || err.message);
        return interaction.editReply("Spotify search is unavailable right now. Please try again shortly.");
    }
}

module.exports = {
    replyWithSearch
};