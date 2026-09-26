const { AttachmentBuilder, SlashCommandBuilder } = require("discord.js");
const sharp = require("sharp");
const path = require("path");

const db = require("../Utils/db");
const eaApi = require("../Services/eaApi");
const archetypes = require("../Utils/archetypes");
const FUT_BASE_PATH = path.join(__dirname, "../assets/playercards/fut-gold-base-transparent.png");

const esc = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
const number = value => Number(value || 0);

function footballerSearchName(value) {
    const normalized = String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[øö]/g, "o")
        .replace(/ß/g, "ss")
        .replace(/æ/g, "ae")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const aliases = {
        gyokores: "Viktor Gyökeres",
        gyokeres: "Viktor Gyökeres"
    };
    return aliases[normalized] || String(value || "").trim();
}

async function footballerPhoto(name) {
    if (!name) return null;
    // Search the footballer's encyclopedia page, rather than Commons files.
    // Commons file search can return unrelated club and stadium photographs.
    const url = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
        encodeURIComponent(footballerSearchName(name)) +
        "&gsrnamespace=0&gsrlimit=1&prop=pageimages&pithumbsize=900&format=json";
    const response = await fetch(url, {
        headers: { "User-Agent": "NXT-eSports-Bot/1.0 (player cards)" },
        signal: AbortSignal.timeout(8000)
    }).catch(() => null);
    const json = response?.ok ? await response.json().catch(() => null) : null;
    const page = Object.values(json?.query?.pages || {})[0];
    return page?.thumbnail?.source || null;
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

function cardInfo(player, stats) {
    const overall = Math.min(99, Math.max(1, Math.round(number(player?.proOverall || 0)) || 75));
    const rawPosition = player?.favoritePosition || player?.proPos || stats?.pos || "Player";
    const position = /goal/i.test(rawPosition) ? "GK" : /def/i.test(rawPosition) ? "CB" : /forw/i.test(rawPosition) ? "ST" : "CM";
    const archetype = archetypes[String(stats?.archetypeid)] || "Unconfirmed";
    const name = player?.name || stats?.playername || "Player";
    return { overall, position, archetype, name };
}

function cardSvg(player, stats) {
    const { overall, position, archetype, name } = cardInfo(player, stats);
    return `<svg width="1000" height="850" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#03162b"/><stop offset=".5" stop-color="#092b51"/><stop offset="1" stop-color="#05070f"/></linearGradient><linearGradient id="line" x2="1"><stop stop-color="#63f7d6"/><stop offset="1" stop-color="#527fff"/></linearGradient></defs>
      <rect width="1000" height="850" fill="url(#bg)"/><rect x="24" y="24" width="952" height="802" rx="28" fill="none" stroke="url(#line)" stroke-width="4"/>
      <rect x="540" y="130" width="370" height="550" rx="18" fill="#071525"/>
      <text x="70" y="120" fill="#63f7d6" font-family="Arial" font-size="30" font-weight="800">NXT ESPORTS</text>
      <text x="70" y="235" fill="white" font-family="Arial" font-size="130" font-weight="900">${overall}</text>
      <text x="80" y="290" fill="#9fb9d8" font-family="Arial" font-size="34" font-weight="700">${esc(String(position).toUpperCase())}</text>
      <text x="70" y="370" fill="white" font-family="Arial" font-size="48" font-weight="900">${esc(name).slice(0, 16)}</text>
      <text x="70" y="422" fill="#63f7d6" font-family="Arial" font-size="30" font-weight="800">${esc(archetype)}</text>
      <line x1="70" y1="470" x2="350" y2="470" stroke="#63f7d6" stroke-width="3"/>
      <text x="70" y="530" fill="#dce9ff" font-family="Arial" font-size="28">GAMES  <tspan fill="white" font-weight="800">${number(player?.gamesPlayed)}</tspan></text>
      <text x="70" y="585" fill="#dce9ff" font-family="Arial" font-size="28">GOALS  <tspan fill="white" font-weight="800">${number(player?.goals)}</tspan></text>
      <text x="70" y="640" fill="#dce9ff" font-family="Arial" font-size="28">ASSISTS  <tspan fill="white" font-weight="800">${number(player?.assists)}</tspan></text>
      <text x="70" y="695" fill="#dce9ff" font-family="Arial" font-size="28">RATING  <tspan fill="white" font-weight="800">${player?.ratingAve || stats?.rating || "-"}</tspan></text>
      <text x="70" y="775" fill="#8ca5c7" font-family="Arial" font-size="20">LIVE FC27 ARCHETYPE · LATEST MATCH</text>
    </svg>`;
}

function estimatedStats(overall, archetype, position) {
    const profiles = {
        "Shot Stopper": [5, 5, 35, 12, 20, 28], "Sweeper Keeper": [35, 5, 50, 35, 30, 45],
        Finisher: [8, 13, -5, 5, -22, 2], Target: [-6, 9, -3, -8, -12, 14],
        Magician: [6, 3, 7, 14, -20, -9], Spark: [14, -1, 2, 10, -18, -8],
        Creator: [1, -2, 15, 6, -10, -4], Maestro: [0, 1, 11, 7, -5, -4],
        Recycler: [-4, -7, 10, -2, 9, 3], Marauder: [7, 5, -4, 2, 11, 12],
        Progressor: [5, -1, 8, 3, 6, 2], Boss: [-5, -5, 2, -4, 15, 13]
    };
    const base = position === "GK" ? [overall - 36, overall - 36, overall - 25, overall - 28, overall - 20, overall - 20] : [overall - 2, overall - 6, overall - 7, overall - 4, overall - 12, overall - 8];
    return ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"].map((label, index) => ({
        label,
        value: Math.max(20, Math.min(99, Math.round(base[index] + (profiles[archetype]?.[index] || 0))))
    }));
}

function futSvg(player, stats) {
    const { overall, position, archetype, name } = cardInfo(player, stats);
    const values = estimatedStats(overall, archetype, position);
    const statRows = values.map((stat, i) => {
        const column = i % 2;
        const row = Math.floor(i / 2);
        const x = column ? 476 : 254;
        const y = 898 + row * 54;
        return `<text x="${x}" y="${y}" text-anchor="end" font-family="Arial" font-size="31" font-weight="900" fill="#23190b">${stat.value}</text>` +
            `<text x="${x + 12}" y="${y}" font-family="Arial" font-size="28" font-weight="800" fill="#3e2a0d">${stat.label}</text>`;
    }).join("");
    return `<svg width="850" height="1100" xmlns="http://www.w3.org/2000/svg">
      <text x="174" y="184" font-family="Arial" font-size="86" font-weight="900" fill="#251b0d">${overall}</text>
      <text x="184" y="233" font-family="Arial" font-size="31" font-weight="900" fill="#251b0d">${position}</text>
      <text x="425" y="746" text-anchor="middle" font-family="Arial" font-size="39" font-weight="900" fill="#24190b">${esc(name).slice(0, 20)}</text>
      <text x="425" y="782" text-anchor="middle" font-family="Arial" font-size="20" font-weight="900" fill="#5f3c0a">${esc(archetype).toUpperCase()}</text>
      <line x1="190" y1="801" x2="660" y2="801" stroke="#8b611c" stroke-width="2"/>
      ${statRows}
      <text x="425" y="1024" text-anchor="middle" font-family="Arial" font-size="15" font-weight="800" fill="#68450d">FC27 · ESTIMATED FROM OVERALL &amp; ARCHETYPE</text>
    </svg>`;
}

module.exports = {
    data: new SlashCommandBuilder().setName("playercard").setDescription("Create a live FC27 player card")
        .addUserOption(option => option.setName("user").setDescription("Claimed Discord user"))
        .addStringOption(option => option.setName("player").setDescription("EA player name"))
        .addStringOption(option => option.setName("footballer").setDescription("Professional footballer photo to use"))
        .addStringOption(option => option.setName("style").setDescription("Card design").addChoices(
            { name: "Style 1 · NXT esports", value: "nxt" },
            { name: "Style 2 · FUT inspired", value: "fut" }
        ))
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
        const photo = upload || await footballerPhoto(interaction.options.getString("footballer"));
        const image = await imageBuffer(photo);
        const style = interaction.options.getString("style") || "nxt";
        const svg = style === "fut"
            ? futSvg(player || { name: requested }, stats)
            : cardSvg(player || { name: requested }, stats);
        let output;
        if (style === "fut") {
            const layers = [{
                input: await sharp(FUT_BASE_PATH)
                    .resize(790, 1095, { fit: "contain" })
                    .png()
                    .toBuffer(),
                left: 30,
                top: 3
            }];
            if (image) {
                layers.push({
                    input: await sharp(image)
                        .resize(430, 500, { fit: "cover", position: "top" })
                        .png()
                        .toBuffer(),
                    left: 210,
                    top: 225
                });
            }
            layers.push({ input: Buffer.from(svg), left: 0, top: 0 });
            output = sharp({
                create: {
                    width: 850,
                    height: 1100,
                    channels: 4,
                    background: "#111111"
                }
            }).composite(layers);
        } else {
            output = sharp(Buffer.from(svg));
            if (image) {
                output = output.composite([{
                    input: await sharp(image)
                        .resize(370, 550, { fit: "cover" })
                        .png()
                        .toBuffer(),
                    left: 540,
                    top: 130
                }]);
            }
        }
        const png = await output.png().toBuffer();
        return interaction.editReply({ files: [new AttachmentBuilder(png, { name: "fc27-player-card.png" })] });
    }
};
