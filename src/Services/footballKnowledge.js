const footballReplies = {
    goal: [
        "GOOOOOOOOAL!",
        "Back of the net.",
        "Clinical finish.",
        "Keeper had no chance."
    ],
    assist: [
        "What a pass.",
        "Inch perfect.",
        "That is elite vision.",
        "Created from nothing."
    ],
    penalty: [
        "Ice cold from the spot.",
        "Sent the keeper the wrong way.",
        "Pressure kick handled."
    ],
    offside: [
        "Flag is up.",
        "Timed the run a little early.",
        "That is tight, but offside."
    ],
    var: [
        "VAR is checking it.",
        "This replay might take a minute.",
        "Big decision incoming."
    ],
    referee: [
        "Questionable decision.",
        "Referee has become the main character.",
        "That one needs another look."
    ],
    tackle: [
        "Huge tackle.",
        "Won the ball cleanly.",
        "Proper defending."
    ],
    save: [
        "What a save.",
        "Goalkeeper masterclass.",
        "Not getting past that."
    ],
    transfer: [
        "Transfer rumours never sleep.",
        "That signing would change the room.",
        "Medical booked, apparently."
    ],
    manager: [
        "The gaffer is cooking.",
        "That is a tactical call.",
        "Team selection says a lot."
    ],
    trophy: [
        "Silverware is the standard.",
        "Winners mentality.",
        "Another one for the cabinet."
    ],
    matchday: [
        "Matchday. Time to perform.",
        "Big-game atmosphere.",
        "Under the lights, no hiding."
    ],
    win: [
        "Huge result.",
        "We move.",
        "Winning mentality."
    ],
    loss: [
        "Heads up.",
        "Response needed.",
        "Back to training."
    ]
};

const triggers = {
    goal: ["goal", "scored", "equaliser", "winner", "finished", "top bins"],
    assist: ["assist", "assisted", "key pass", "through ball", "set up"],
    penalty: ["penalty", "spot kick", "pen"],
    offside: ["offside", "flag"],
    var: ["var", "video review"],
    referee: ["ref", "referee", "official"],
    tackle: ["tackle", "challenge", "won the ball"],
    save: ["save", "goalkeeper", "keeper", "shot stopper"],
    transfer: ["transfer", "signing", "rumour", "medical"],
    manager: ["manager", "gaffer", "coach", "team selection"],
    trophy: ["trophy", "champion", "title", "silverware"],
    matchday: ["matchday", "kickoff", "game day", "fixture"],
    win: ["we won", "easy win", "victory", "three points"],
    loss: ["lost", "defeat", "battered", "heads gone"]
};

const knowledge = {
    offside:
        "A player is offside when they are ahead of the second-last defender at the moment a teammate plays the ball, and they become involved in play.",
    var:
        "VAR reviews major incidents: goals, penalties, direct red cards and mistaken identity.",
    xg:
        "xG estimates shot quality by looking at factors such as distance, angle and chance type.",
    xa:
        "xA estimates the chance quality created by a pass.",
    gegenpress:
        "Gegenpressing is immediate pressure after losing the ball, aiming to win it back before the opponent settles.",
    false9:
        "A false nine drops away from the striker line to pull defenders out and create space for runners.",
    cleanSheet:
        "A clean sheet means conceding zero goals.",
    formations: {
        "433": "4-3-3 gives natural width, strong pressing lanes and clear winger roles.",
        "4231": "4-2-3-1 protects the middle with a double pivot and gives the CAM freedom.",
        "442": "4-4-2 is direct, balanced and simple, but can be outnumbered centrally.",
        "352": "3-5-2 overloads midfield and supports two strikers, but asks a lot from wing-backs.",
        "343": "3-4-3 creates attacking width while keeping three centre backs.",
        "532": "5-3-2 is compact and counter-focused."
    },
    positions: {
        striker: "A striker leads the attack and is judged heavily on goals, movement and link play.",
        winger: "A winger stretches the pitch, attacks full-backs and creates from wide areas.",
        cam: "A CAM links midfield to attack and usually carries creative responsibility.",
        cdm: "A CDM protects the defence, wins duels and keeps possession moving.",
        fullback: "A full-back defends wide areas and supports attacks from deeper positions.",
        wingback: "A wing-back provides width in systems with three centre backs.",
        sweeperKeeper: "A sweeper keeper controls space behind the defence as well as the box."
    },
    tactics: {
        tikiTaka: "Tiki-taka is short passing, rotation and possession control.",
        counterAttack: "Counter-attacking is winning the ball and playing forward before the opponent resets.",
        highPress: "A high press tries to win possession close to the opponent's goal.",
        lowBlock: "A low block defends deep and compact to deny space around goal.",
        possession: "Possession football aims to control territory, rhythm and chance quality.",
        parkTheBus: "Parking the bus is an extreme defensive low block."
    },
    competitions: {
        championsLeague: "The Champions League is UEFA's top club competition.",
        europaLeague: "The Europa League is UEFA's second-tier continental club competition.",
        conferenceLeague: "The Conference League gives more European clubs a continental route.",
        premierLeague: "The Premier League is the top tier of English football.",
        faCup: "The FA Cup is England's historic knockout cup.",
        worldCup: "The World Cup is the biggest international football tournament."
    },
    awards: {
        ballonDor: "The Ballon d'Or recognises the best player in world football.",
        goldenBoot: "The Golden Boot is awarded to a competition's top scorer.",
        goldenGlove: "The Golden Glove recognises the best goalkeeper.",
        motm: "Man of the Match is awarded to the standout player in a match."
    }
};

module.exports = {
    footballReplies,
    triggers,
    knowledge
};
