const {
    MessageFlags
} = require("discord.js");

async function privateReply(interaction, content) {
    const payload =
        typeof content === "string"
            ? {
                content
            }
            : content;

    if (interaction.deferred) {
        await interaction.deleteReply().catch(() => null);

        return interaction.followUp({
            ...payload,
            flags: MessageFlags.Ephemeral
        });
    }

    if (interaction.replied) {
        return interaction.followUp({
            ...payload,
            flags: MessageFlags.Ephemeral
        });
    }

    return interaction.reply({
        ...payload,
        flags: MessageFlags.Ephemeral
    });
}

module.exports = {
    privateReply
};
