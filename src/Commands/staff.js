const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const bellaApi =
    require("../Services/bellaApi");

const {
    getCrestUrl
} = require("../Services/crests");

const {
    FOOTER
} = require("../Utils/embedStyle");

const BELLA_CLUB_ID = 525542;

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

            const crestUrl =
                await getCrestUrl(
                    BELLA_CLUB_ID
                );

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(
                        "🏢 Bella Ciao FC Staff"
                    )
                    .setThumbnail(
                        crestUrl
                    )
                    .setFooter({
                        text: FOOTER.text,
                        iconURL: FOOTER.iconURL
                    });

            if (!staff?.length) {

                embed.setDescription(
                    "No staff information available."
                );

            } else {

                const roleEmojis = {
                    "Owner": "👑",
                    "Club Director": "🏛️",
                    "Manager": "👔",
                    "Recruitment": "🔎"
                };

                for (const member of staff) {

                    const emoji =
                        roleEmojis[member.role] || "📋";

                    embed.addFields({
                        name:
                            `${emoji} ${member.role || "Staff"}`,
                        value:
                            member.name || "Unknown",
                        inline: true
                    });
                }
            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(
                "Staff error:",
                err
            );

            await interaction.editReply(
                "Failed to load staff."
            );
        }
    }
};