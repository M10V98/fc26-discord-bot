const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const {
    FOOTER,
    infoBlock
} = require("../Utils/embedStyle");

function hasPermission(interaction, permission) {
    return Boolean(
        interaction.memberPermissions?.has(permission)
    );
}

function addSection(lines, title, entries) {
    const visible =
        entries.filter(Boolean);

    if (!visible.length) {
        return;
    }

    lines.push("", `**${title}**`, ...visible);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show how to use the bot"),

    async execute(interaction) {
        const isAdmin =
            hasPermission(
                interaction,
                PermissionFlagsBits.Administrator
            );
        const canModerate =
            hasPermission(
                interaction,
                PermissionFlagsBits.ModerateMembers
            );
        const description = [
            infoBlock([
                isAdmin
                    ? "Link an EA club, claim your player, then use the stat commands to track your squad."
                    : "Claim your player, then use the stat commands to track your profile and squad.",
                "League and playoff data stays separate from competitive friendly data."
            ])
        ];

        addSection(
            description,
            "Setup",
            [
                isAdmin && "`/linkclub` links this Discord server to your EA ClubID.",
                isAdmin && "You can find your ClubID on the EA Clubs Ranking website.",
                "`/claim` connects your Discord account to your Pro Clubs player.",
                "`/unclaim` removes your player claim.",
                isAdmin && "`/unlink` disconnects this server from the linked club.",
                isAdmin && "`/settings` sets server defaults for commands with choices."
            ]
        );

        addSection(
            description,
            "Club Stats",
            [
                "`/stats` shows club record, goals, streaks, and recent form.",
                "`/members` shows current club members.",
                "`/matches` shows recent matches.",
                "`/fixtures` shows upcoming fixtures when available.",
                "`/playerstats` shows a player profile.",
                "`/career` shows career stats for a claimed player.",
                "`/ratings`, `/top`, `/leaderboard`, `/in-form` show leaderboards and form.",
                "`/player achievements` shows your milestones, or add `user` for someone else.",
                "`/player form` shows recent form plus stats from the selected 5/10-match window.",
                "`/player compare` compares goals, assists, average rating, and win rate.",
                "`/chemistry` shows two-player record, average rating, and Chemistry Score."
            ]
        );

        addSection(
            description,
            "Competitive Friendly Stats",
            [
                "`/compmatches`, `/compplayerstats`, `/compratings`, `/comptop`, `/compin-form`, `/compstats` use Friendly Match data only.",
                "Friendly matches are stored locally from the server tracking start point, so competitive data stays separate from league and playoff stats."
            ]
        );

        addSection(
            description,
            "XP, Profiles & Automation",
            [
                "`/profile` shows your tracked XP profile.",
                "`/xptracking` explains where your tracked XP came from.",
                "`/automode` posts new matches and processes League/Playoff XP automatically.",
                isAdmin && "`/syncstats` backfills League, Playoff, and Friendly match history from EA manually.",
                isAdmin && "`/resetstats` can reset XP only or reset all tracked server stats after confirmation.",
                "Friendly matches also feed the competitive commands.",
                "`/quiz start` starts a continuous 20-second football quiz for the whole server.",
                "`/quiz leaderboard` shows the server quiz table."
            ]
        );

        addSection(
            description,
            "Community",
            [
                "`/poll` creates a live vote with buttons.",
                "`/ask` asks the football assistant a question.",
                "`/teach` teaches the assistant a fact or submits it for admin approval.",
                isAdmin && "`/knowledge pending`, `/knowledge approve`, `/knowledge reject`, and `/knowledge remove` manage learned knowledge.",
                "`/inform` posts an in-form style player update.",
                "`/staff` shows staff information."
            ]
        );

        addSection(
            description,
            "Sessions",
            [
                isAdmin && "`/schedule session` creates a role-backed RSVP post with load-up and kick-off times. Players choose Can Play, Cannot Play, or Maybe.",
                isAdmin && "The session role is assigned to Can Play users and deleted after the event."
            ]
        );

        addSection(
            description,
            "Moderation",
            [
                canModerate && "`/mod warn @user`, `/mod infractions @user`, `/mod timeout @user`, and `/mod ban @user` help staff manage the server.",
                canModerate && "Three warnings trigger an auto-escalation flag for staff review."
            ]
        );

        const embed =
            new EmbedBuilder()
                .setColor("#ffffff")
                .setTitle("OurProClub.app Help")
                .setDescription(description.join("\n"))
                .setFooter(FOOTER);

        await interaction.reply({
            embeds: [embed]
        });
    }
};
