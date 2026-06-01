const footballReplies = {

    goal: [
        "🥅 GOOOOOOOOAL!",
        "⚽ Back of the net!",
        "🔥 What a finish!",
        "🎯 Clinical finishing.",
        "🚀 Absolute rocket.",
        "👑 World class.",
        "📢 Limbs everywhere.",
        "⚫⚪ Massive goal.",
        "🏆 Championship-winning finish.",
        "😮 Keeper had no chance."
    ],

    assist: [
        "👟 What a pass.",
        "🎯 Inch perfect.",
        "🧠 Vision unlocked.",
        "✨ Playmaker behaviour.",
        "📐 Created that from nothing."
    ],

    penalty: [
        "⚽ Ice cold from the spot.",
        "🥶 Nerves of steel.",
        "🎯 Sent the keeper the wrong way.",
        "🔥 Clinical penalty.",
        "😬 Pressure kick."
    ],

    offside: [
        "🚩 Flag's up.",
        "📺 VAR checking...",
        "❌ Just offside.",
        "🤏 By a shoelace.",
        "😩 Timed the run badly."
    ],

    var: [
        "📺 Checking possible handball...",
        "🔍 Looking at the replay.",
        "😬 This could take a while.",
        "⚖️ VAR drama incoming."
    ],

    referee: [
        "🟨 Easy ref.",
        "👓 Ref needs glasses.",
        "😡 Never a foul.",
        "🎭 Referee becoming the main character.",
        "⚖️ Questionable decision."
    ],

    tackle: [
        "💪 Crunching challenge.",
        "🧱 Brick wall defending.",
        "⚔️ Won the ball cleanly.",
        "🔥 Huge tackle."
    ],

    save: [
        "🧤 WHAT A SAVE!",
        "🚫 Not today.",
        "👑 Goalkeeper masterclass.",
        "🦸 Heroic stop."
    ],

    transfer: [
        "💰 Here we go...",
        "👀 Transfer rumours everywhere.",
        "✍️ Medical booked.",
        "📢 Fabrizio is watching."
    ],

    manager: [
        "🧠 Tactical masterclass.",
        "📋 Interesting team selection.",
        "🔥 The gaffer knows best.",
        "👔 Manager cooking."
    ],

    trophy: [
        "🏆 Another one for the cabinet.",
        "🥇 Winners mentality.",
        "👑 Champions behaviour."
    ],

    goat: [
        "🐐 Football's greatest debate.",
        "🍿 Here we go again.",
        "⚽ Impossible to settle."
    ],

    messi: [
        "🐐 Messi mentioned.",
        "🪄 Magic left foot.",
        "⚽ One of the greatest ever."
    ],

    ronaldo: [
        "🐐 Ronaldo mentioned.",
        "🚀 SIUUUU.",
        "⚽ One of the greatest ever."
    ],

    matchday: [
        "🔥 MATCHDAY.",
        "⚽ Time to perform.",
        "🏟️ Under the lights.",
        "📢 Big game atmosphere."
    ],

    win: [
        "🏆 Huge result.",
        "📈 Winning mentality.",
        "🔥 We move.",
        "⚫⚪ Massive club."
    ],

    loss: [
        "😔 Heads up.",
        "📋 Back to training.",
        "💪 Response needed.",
        "⚽ Football can be cruel."
    ]
};

const triggers = {
    goal: ["goal", "scored", "equaliser", "winner"],
    assist: ["assist", "assisted"],
    penalty: ["penalty", "spot kick", "pen"],
    offside: ["offside"],
    var: ["var"],
    referee: ["ref", "referee"],
    tackle: ["tackle"],
    save: ["save", "goalkeeper", "keeper"],
    transfer: ["transfer", "signing", "rumour"],
    manager: ["manager", "gaffer", "coach"],
    trophy: ["trophy", "champion", "title"],
    goat: ["goat"],
    messi: ["messi"],
    ronaldo: ["ronaldo"],
    matchday: ["matchday", "kickoff", "game day"],
    win: ["we won", "easy win", "victory"],
    loss: ["lost", "defeat", "battered"]
};

module.exports = {
    footballReplies,
    triggers
};

module.exports = {

    offside: "...",
    var: "...",
    xg: "...",
    xa: "...",
    gegenpress: "...",
    false9: "...",
    cleanSheet: "...",

    formations: {
        "433": "...",
        "4231": "...",
        "442": "...",
        "352": "...",
        "343": "...",
        "532": "..."
    },

    positions: {
        striker: "...",
        winger: "...",
        cam: "...",
        cdm: "...",
        fullback: "...",
        wingback: "...",
        sweeperKeeper: "..."
    },

    tactics: {
        tikiTaka: "...",
        counterAttack: "...",
        highPress: "...",
        lowBlock: "...",
        possession: "...",
        parkTheBus: "..."
    },

    competitions: {
        championsLeague: "...",
        europaLeague: "...",
        conferenceLeague: "...",
        premierLeague: "...",
        faCup: "...",
        worldCup: "..."
    },

    awards: {
        ballonDor: "...",
        goldenBoot: "...",
        goldenGlove: "...",
        motm: "..."
    }
};