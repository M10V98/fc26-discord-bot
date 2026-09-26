const { AttachmentBuilder, SlashCommandBuilder } = require("discord.js");
const sharp = require("sharp");

const db = require("../Utils/db");
const eaApi = require("../Services/eaApi");
const archetypes = require("../Utils/archetypes");

const esc = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
const number = value => Number(value || 0);

async function commonsPhoto(name) {
    if (!name) return null;
    const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
        encodeURIComponent(`${name} footballer`) +
        "&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*";
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    const json = response?.ok ? await response.json().catch(() => null) : null;
    const page = Object.values(json?.query?.pages || {})[0];
    return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || null;
}

async function imageBuffer(url) {
    if (!url) return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (!response?.ok) return null;
    return Buffer.from(await response.arrayBuffer());
}

function latestPlayer(matches, clubId, name, playerId) {
    const sorted = [...matches].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    for (const match of sorted) {
        const players = match.players?.[String(clubId)] || {};
        const found = Object.entries(players).find(([id, row]) =>
            (playerId && String(id) === String(playerId)) ||
            String(row.playername || "").toLowerCase() === String(name || "").toLowerCase()
        );
        if (found) return found[1];
    }
    return null;
}

function cardSvg(player, stats, photo) {
    const overall = Math.min(99, Math.max(1, Math.round(number(player?.proOverall || 0)) || 75));
    const position = player?.favoritePosition || player?.proPos || stats?.pos || "Player";
    const archetype = archetypes[String(stats?.archetypeid)] || "Unconfirmed";
    const name = player?.name || stats?.playername || "Player";
    const image = photo ? `<image href="${esc(photo)}" x="420" y="80" width="530" height="700" preserveAspectRatio="xMidYMid slice" opacity="0.93"/>` : "";
    return `<svg width="1000" height="850" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#03162b"/><stop offset=".5" stop-color="#092b51"/><stop offset="1" stop-color="#05070f"/></linearGradient><linearGradient id="line" x2="1"><stop stop-color="#63f7d6"/><stop offset="1" stop-color="#527fff"/></linearGradient></defs>
      <rect width="1000" height="850" fill="url(#bg)"/><rect x="24" y="24" width="952" height="802" rx="28" fill="none" stroke="url(#line)" stroke-width="4"/>
      ${image}<rect x="400" y="50" width="560" height="760" fill="url(#bg)" opacity=".2"/>
      <text x="70" y="120" fill="#63f7d6" font-family="Arial" font-size="30" font-weight="800">NXT ESPORTS</text>
      <text x="70" y="235" fill="white" font-family="Arial" font-size="130" font-weight="900">${overall}</text>
      <text x="80" y="290" fill="#9fb9d8" font-family="Arial" font-size="34" font-weight="700">${esc(String(position).toUpperCase())}</text>
      <text x="70" y="370" fill="white" font-family="Arial" font-size="53" font-weight="900">${esc(name).slice(0, 24)}</text>
      <text x="70" y="422" fill="#63f7d6" font-family="Arial" font-size="30" font-weight="800">${esc(archetype)}</text>
      <line x1="70" y1="470" x2="350" y2="470" stroke="#63f7d6" stroke-width="3"/>
      <text x="70" y="530" fill="#dce9ff" font-family="Arial" font-size="28">GAMES  <tspan fill="white" font-weight="800">${number(player?.gamesPlayed)}</tspan></text>
      <text x="70" y="585" fill="#dce9ff" font-family="Arial" font-size="28">GOALS  <tspan fill="white" font-weight="800">${number(player?.goals)}</tspan></text>
      <text x="70" y="640" fill="#dce9ff" font-family="Arial" font-size="28">ASSISTS  <tspan fill="white" font-weight="800">${number(player?.assists)}</tspan></text>
      <text x="70" y="695" fill="#dce9ff" font-family="Arial" font-size="28">RATING  <tspan fill="white" font-weight="800">${player?.ratingAve || stats?.rating || "-"}</tspan></text>
      <text x="70" y="775" fill="#8ca5c7" font-family="Arial" font-size="20">LIVE FC27 ARCHETYPE · LATEST MATCH</text>
    </svg>`;
}

module.exports = {
    data: new SlashCommandBuilder().setName("playercard").setDescription("Create a live FC27 player card")
        .addUserOption(option => option.setName("user").setDescription("Claimed Discord user"))
        .addStringOption(option => option.setName("player").setDescription("EA player name"))
        .addStringOption(option => option.setName("footballer").setDescription("Professional footballer photo to use"))
        .addAttachmentOption(option => option.setName("image").setDescription("Your own card image")),
    async execute(interaction) {
        await interaction.deferReply();
        const club = await db.get("SELECT * FROM clubs WHERE guild_id = ?", [interaction.guild.id]);
        if (!club) return interaction.editReply("No club linked. Use /linkclub first.");
        const user = interaction.options.getUser("user");
        const linked = await db.get("SELECT * FROM linked_players WHERE guild_id = ? AND discord_id = ?", [interaction.guild.id, user?.id || interaction.user.id]);
        const requested = interaction.options.getString("player") || linked?.player_name;
        if (!requested) return interaction.editReply("Choose a player or use /claim first.");
        const [members, matches] = await Promise.all([
            eaApi.getMembersStats(club.club_id),
            Promise.all(["leagueMatch", "playoffMatch", "friendlyMatch"].map(type => eaApi.getMatches(club.club_id, type, { maxResultCount: 100 }).catch(() => []))).then(rows => rows.flat())
        ]);
        const player = (members?.members || []).find(row => String(row.name).toLowerCase() === String(requested).toLowerCase());
        const stats = latestPlayer(matches, club.club_id, requested, linked?.player_id);
        const upload = interaction.options.getAttachment("image")?.url;
        const photo = upload || await commonsPhoto(interaction.options.getString("footballer"));
        const image = await imageBuffer(photo);
        const embeddedPhoto = image
            ? `data:image/png;base64,${image.toString("base64")}`
            : null;
        const png = await sharp(Buffer.from(cardSvg(player || { name: requested }, stats, embeddedPhoto))).png().toBuffer();
        return interaction.editReply({ files: [new AttachmentBuilder(png, { name: "fc27-player-card.png" })] });
    }
};
