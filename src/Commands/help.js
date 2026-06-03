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
                        "`/unclaim` removes your player claim.",
                        "`/unlink` disconnects this server from the linked club.",
                        "`/settings` sets server defaults for commands with choices.",
                        "",
                        "**Club Stats**",
                        "`/stats` shows club record, goals, streaks, and recent form.",
                        "`/members` shows current club members.",
                        "`/matches` shows recent matches.",
                        "`/fixtures` shows upcoming fixtures when available.",
                        "`/playerstats` shows a player profile.",
                        "`/career` shows career stats for a claimed player.",
                        "`/ratings`, `/top`, `/leaderboard`, `/in-form` show leaderboards and form.",
                        "`/player achievements` shows your milestones, or add `user` for someone else.",
                        "`/player form` shows recent form plus stats from the selected 5/10-match window.",
                        "`/player compare player1 player2` compares goals, assists, average rating, and win rate.",
                        "`/chemistry player1 player2` shows two-player record, average rating, and Chemistry Score.",
                        "",
                        "**Competitive Friendly Stats**",
                        "`/compmatches`, `/compplayerstats`, `/compratings`, `/comptop`, `/compin-form` use Friendly Match data only.",
                        "Friendly matches are stored locally as they are seen, so older competitive data is not lost when EA rotates API results.",
                        "",
                        "**XP, Profiles & Automation**",
                        "`/profile` shows your tracked XP profile.",
                        "`/xptracking` explains where your tracked XP came from.",
                        "`/automode` posts new matches and processes XP automatically.",
                        "`/syncstats` backfills recent matches manually.",
                        "`/resetstats` clears tracked server stats after confirmation.",
                        "Friendly matches award double XP.",
                        "`/quiz start` starts a continuous 60-second football quiz for the whole server.",
                        "`/quiz leaderboard` shows the server quiz table.",
                        "",
                        "**Community**",
                        "`/poll create question option1 option2` creates a live vote with buttons.",
                        "`/ask` asks the football assistant a question.",
                        "`/inform` posts an in-form style player update.",
                        "`/staff` shows staff information.",
                        "",
                        "**Sessions**",
                        "`/schedule session` creates a role-backed RSVP post. Players choose Can Play, Cannot Play, or Maybe.",
                        "The session role is assigned to Can Play users and deleted after the event.",
                        "",
                        "**Moderation**",
                        "`/mod warn @user`, `/mod infractions @user`, `/mod timeout @user`, and `/mod ban @user` help staff manage the server.",
                        "Three warnings trigger an auto-escalation flag for staff review."
                    ].join("\n")
                )
                .setFooter(FOOTER);

        await interaction.reply({
            embeds: [embed]
        });
    }
};
