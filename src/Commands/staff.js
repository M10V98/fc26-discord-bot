const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    FOOTER
} = require("../Utils/embedStyle");

const STAFF = [
    ["Founder", "👑", "Pigeon | Founder | 27\nM10 | Founder | 10\nCobra | Founder | 33"],
    ["Manager", "🟩", "Samim | Manager | GOAT\nM10 | Main Manager"],
    ["Assistant Manager", "🔷", "Peaty | Assistant Manager | 17"],
    ["Recruitment Team", "🟧", "Lucas | Recruitment | 41"]
];

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("staff")
            .setDescription(
                "View NXT eSports staff"
            ),

    async execute(interaction) {

        await interaction.deferReply();

        try {

            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle(
                        "🏢 NXT eSports Staff"
                    )
                    .setFooter({
                        text: FOOTER.text,
                        iconURL: FOOTER.iconURL
                    });

            for (const [role, emoji, members] of STAFF) {
                embed.addFields({ name: `${emoji} ${role}`, value: members, inline: true });
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
