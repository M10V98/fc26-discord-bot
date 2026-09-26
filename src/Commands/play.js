const { SlashCommandBuilder } = require("discord.js");
const spotify = require("../Services/spotify");
const music = require("./music");

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
        return music.replyWithSearch(
            interaction,
            interaction.options.getString("query", true)
        );
    }
};
