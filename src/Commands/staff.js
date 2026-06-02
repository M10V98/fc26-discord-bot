const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const bellaApi =
    require("../Services/bellaApi");

const db =
    require("../Utils/db");

const {
    FOOTER,
    getCrestUrl
} = require("../Utils/embedStyle");

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("staff")
            .setDescription(
                "View Bella Ciao FC staff"
            ),

    async execute(interaction) {

        await interaction.deferReply();

        try {

            const staff =
                await bellaApi.getStaff();

            const club =
                await db.get(
                    `
                    SELECT club_id
                    FROM clubs
                    WHERE guild_id = ?
                    `,
                    [interaction.guild.id]
                );

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(
                        "🏢 Bella Ciao FC Staff"
                    )
                    .setThumbnail(
                        club
                            ? getCrestUrl(club.club_id)
                            : null
                    )
                    .setFooter(FOOTER);

            for (const member of staff) {

                embed.addFields({
                    name: `👔 ${member.role}`,
                    value: member.name,
                    inline: true
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "Failed to load staff."
            );
        }
    }
};