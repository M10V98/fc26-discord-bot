const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    FOOTER,
    infoBlock
} = require("../Utils/embedStyle");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show how to use the bot"),

    async execute(interaction) {
        const embed =
            new EmbedBuilder()
                .setColor("#ffffff")
                .setTitle("OurProClub.app Help")
                .setDescription(
                    [
                        infoBlock([
                            "Link an EA club, claim your player, then use the stat commands to track your squad.",
                            "League and playoff data stays separate from competitive friendly data."
                        ]),
                        "",
                        "**Setup**",
                        "`/linkclub` links this Discord server to your EA ClubID.",
                        "You can find your ClubID on the EA Clubs Ranking website.",
                        "`/claim` connects your Discord account to your Pro Clubs player.",
                        "`/settings` sets server defaults for commands with choices.",
                        "",
                        "**Club Stats**",
                        "`/members` shows current club members.",
                        "`/matches` shows recent matches.",
                        "`/playerstats` shows a player profile.",
                        "`/ratings`, `/top`, `/in-form` show leaderboards and form.",
                        "",
                        "**Competitive Friendly Stats**",
                        "`/compmatches`, `/compplayerstats`, `/compratings`, `/comptop`, `/compin-form` use Friendly Match data only.",
                        "Friendly matches are stored locally as they are seen, so older competitive data is not lost when EA rotates API results.",
                        "",
                        "**XP & Automation**",
                        "`/automode` posts new matches and processes XP automatically.",
                        "`/syncstats` backfills recent matches manually.",
                        "Friendly matches award double XP.",
                        "",
                        "**Sessions**",
                        "`/schedule session` creates a role-backed RSVP post. Players choose Can Play, Cannot Play, or Maybe.",
                        "The session role is assigned to Can Play users and deleted after the event."
                    ].join("\n")
                )
                .setFooter(FOOTER);

        await interaction.reply({
            embeds: [embed]
        });
    }
};
