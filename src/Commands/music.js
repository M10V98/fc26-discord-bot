const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const spotify = require("../Services/spotify");
const { FOOTER, escapeMarkdown } = require("../Utils/embedStyle");

function duration(ms) {
    const seconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function configuredMessage() {
    return "Music discovery is not configured yet. The server owner needs to add the Spotify app credentials before this can be used.";
}

function playlistsEmbed(playlists) {
    if (!playlists.length) {
        return new EmbedBuilder().setColor("#1DB954").setTitle("Your selected Spotify playlists").setDescription("No playlists selected yet. Use `/music playlists` to choose them.").setFooter(FOOTER);
    }
    return new EmbedBuilder().setColor("#1DB954").setTitle("Your selected Spotify playlists").setDescription(playlists.map((playlist, index) => `**${index + 1}.** ${escapeMarkdown(playlist.playlist_name)}`).join("\n")).setFooter(FOOTER);
}

// Rewritten to dynamically stream or display a clean select dropdown menu based on interaction type
async function replyWithSearch(interaction, query) {
    // If it's a select menu interaction, execute actual voice playback
    if (interaction.isStringSelectMenu()) {
        const songMetadata = query[0]; // Dropdown values return as an array, take the first item

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply("❌ You must join a voice channel before selecting a track!");
        }

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // Extract audio stream from YouTube behind the scenes
            const youtubeSearchResults = await play.search(songMetadata, { limit: 1 });
            if (!youtubeSearchResults || youtubeSearchResults.length === 0) {
                return interaction.editReply(`❌ Could not find a matching track on YouTube for: *${songMetadata}*`);
            }

            const targetVideoUrl = youtubeSearchResults[0].url;
            const targetVideoTitle = youtubeSearchResults[0].title;

            // Stream audio smoothly with safe resource allocations for Railway costs
            const streamInstance = await play.stream(targetVideoUrl, { quality: 1 });
            const audioResource = createAudioResource(streamInstance.stream, { inputType: streamInstance.type });
            const audioPlayer = createAudioPlayer();

            audioPlayer.play(audioResource);
            connection.subscribe(audioPlayer);

            await interaction.editReply({ content: `🎶 Now streaming: **${targetVideoTitle}**`, components: [] });

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
            await interaction.editReply("❌ Failed to stream audio. Connection timed out.");
        }
        return;
    }

    // Default Behavior: Treat as slash command text input search query
    await interaction.deferReply({ ephemeral: true });
    try {
        const tracks = await spotify.searchTracks(query);
        if (!tracks.length) return interaction.editReply("No Spotify tracks matched that search.");
        
        // Build the clean, standalone String Select Menu dropdown option list
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('music_track_menu_selection')
            .setPlaceholder('Click here to choose your song...');

        tracks.slice(0, 25).forEach((track, idx) => {
            const labelText = `${idx + 1}. ${track.name}`.slice(0, 95);
            const descriptionText = `${track.artists} · ${duration(track.durationMs)}`.slice(0, 95);
            
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(labelText)
                    .setDescription(descriptionText)
                    .setValue(`${track.name} ${track.artists}`) 
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
    data: new SlashCommandBuilder()
        .setName("music")
        .setDescription("Set up Spotify playlists; use /play to search")
        .addSubcommand(subcommand => subcommand.setName("help").setDescription("See how /music and /play work together"))
        .addSubcommand(subcommand => subcommand.setName("link").setDescription("Link your Spotify account privately"))
        .addSubcommand(subcommand => subcommand.setName("unlink").setDescription("Remove your Spotify account link"))
        .addSubcommand(subcommand => subcommand.setName("search").setDescription("Search Spotify tracks").addStringOption(option => option.setName("query").setDescription("Song, artist, or album").setRequired(true).setMaxLength(120)))
        .addSubcommand(subcommand => subcommand.setName("playlists").setDescription("Choose playlists from your linked Spotify account"))
        .addSubcommand(subcommand => subcommand.setName("selected").setDescription("Show your selected Spotify playlists")),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "help") {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#1DB954")
                    .setTitle("Music discovery")
                    .setDescription([
                        "**1.** Use `/music link` to connect Spotify privately.",
                        "**2.** Use `/music playlists` to choose the playlists you want the bot to remember.",
                        "**3.** Use `/play query:<song or artist>` whenever you want to find a track.",
                        "`/music search` is also available, but `/play` is the quick search command.",
                        "\nSelect your track from the menu dropdown to instantly play music in your voice channel."
                    ].join("\n"))
                    .setFooter(FOOTER)],
                ephemeral: true
            });
        }
        if (!spotify.configured()) return interaction.reply({ content: configuredMessage(), ephemeral: true });

        if (subcommand === "link") {
            const url = await spotify.createLink(interaction.user.id);
            return interaction.reply({
                content: "Use this private Spotify sign-in button to connect your account. The bot only requests your profile and playlist-reading permission.",
                components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Link Spotify").setURL(url))],
                ephemeral: true
            });
        }

        if (subcommand === "unlink") {
            await spotify.unlink(interaction.user.id);
            return interaction.reply({ content: "Your Spotify account and selected playlists have been removed from the bot.", ephemeral: true });
        }

        if (subcommand === "search") {
            return replyWithSearch(interaction, interaction.options.getString("query", true));
        }

        if (subcommand === "selected") {
            return interaction.reply({ embeds: [playlistsEmbed(await spotify.selectedPlaylists(interaction.user.id))], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        try {
            const playlists = await spotify.getPlaylists(interaction.user.id);
            if (!playlists.length) return interaction.editReply("Spotify did not return any playlists for this account.");
            const selected = new Set((await spotify.selectedPlaylists(interaction.user.id)).map(playlist => playlist.playlist_id));
            const menu = new StringSelectMenuBuilder()
                .setCustomId("music_playlist_select")
                .setPlaceholder("Select the playlists you want the bot to remember")
                .setMinValues(1)
                .setMaxValues(Math.min(playlists.length, 25))
                .addOptions(playlists.slice(0, 25).map(playlist => ({
                    label: playlist.name.slice(0, 100),
                    value: playlist.id,
                    description: `${playlist.tracks} track${playlist.tracks === 1 ? "" : "s"}${selected.has(playlist.id) ? " · currently selected" : ""}`.slice(0, 100),
                    default: selected.has(playlist.id)
                })));
            return interaction.editReply({ content: "Choose up to 25 playlists. Saving a new choice replaces your previous selection.", components: [new ActionRowBuilder().addComponents(menu)] });
        } catch (err) {
            console.error("Spotify playlists failed:", err.response?.data || err.message);
            return interaction.editReply(err.message.includes("Link your Spotify") ? err.message : "Spotify playlists are unavailable right now. Please try again shortly.");
        }
    },

    async handlePlaylistSelect(interaction) {
        await interaction.deferUpdate();
        try {
            const playlists = await spotify.getPlaylists(interaction.user.id);
            const chosen = playlists.filter(playlist => interaction.values.includes(playlist.id));
            await spotify.selectPlaylists(interaction.user.id, chosen);
            await interaction.editReply({ content: `Saved ${chosen.length} Spotify playlist${chosen.length === 1 ? "" : "s"}.`, embeds: [playlistsEmbed(await spotify.selectedPlaylists(interaction.user.id))], components: [] });
        } catch (err) {
            console.error("Spotify playlist selection failed:", err.response?.data || err.message);
            await interaction.editReply({ content: "Spotify could not save that selection. Link your account again and try once more.", components: [] });
        }
    },
    replyWithSearch
};