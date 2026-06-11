const BASE_QUIZ_QUESTIONS = [
    ["Who wore the number 7 in the 23/24 season?", ["Bean Alejandro", "Ice wizard", "Randy Cabbage", "Shane Syrett"], 0],
    ["Who was nicknamed \"the flying dutchman\"?", ["Shane Syrett", "Bean Alejandro", "Gollum", "Lucas Gough"], 0],
    ["When were both Johny and Kanye our holding midfielders?", ["2023", "1980", "2024", "2025"], 0],
    ["Who are Bella Ciao's rivals?", ["Boys FC", "LOTG FC", "Sainsbury's FC", "VFL Newcastle"], 0],
    ["Si Senor gives the ball to __ and he will score.", ["Bean", "The mighty COG", "Schnitzler", "Fyzo"], 0],
    ["What does CPL stand for?", ["Competitive Pro League", "Nothing", "Competitive Premier League", "Cup Professionally Rigged league"], 0],
    ["Who manages Boys FC?", ["Penguin", "Roy Keane", "Pigeon", "Gazz Bryant"], 0],
    ["Who \"hates this stadium\"?", ["H411ison", "AOG", "FYZO", "NICOLE"], 0],
    ["Who is the club director of Bella Ciao FC?", ["OlaPola", "Olats", "King", "Gary"], 0],
    ["Where did Gollum go for his retirement?", ["Factories in Scunthorpe", "Real Madrid", "Bradford", "Sainsbury's FC"], 0],
    ["When did Bella Ciao start 11s Leagues?", ["December 2025", "September 2023", "January 2026", "December 2024"], 0],
    ["What caused half the team to leave to Sainsbury's FC?", ["Pigeon", "Iced out camera incident", "Found out what Schnitzler was doing", "They weren't good enough"], 0],
    ["Which player has crosses named after him?", ["Fyzo", "Lynxy", "Connor", "Dirk"], 0],
    ["Who tried to shoot H411ison 9 times but missed every shot?", ["Spoondoodle 1", "Boys FC", "Crayden cottage guy", "Lynxzy"], 0],
    ["What was Bean's signature shot?", ["Power Shot+ Volley", "Finesse Shot", "Rainbow Flick Bicycle Kick Combo", "Bullet Headers"], 0],
    ["What was Gollum's signature shot?", ["Finesse Shot", "Power Shot", "Wide of Post Shot", "Bicycle Kick + Power Shot"], 0]
];

const CLUB_LORE_ITEMS = [
    {
        aliases: [["vpc millwall", "mamba esports"], ["season 7", "season 8", "name", "renamed", "replaced"]],
        answer: "VPC Millwall is the correct identity for the club in VPC Season 7. After they were replaced in Season 8, the name changed to Mamba Esports.",
        quiz: [
            ["Which VPC Season 7 club later changed its name to Mamba Esports after being replaced in Season 8?", ["VPC Millwall", "VPC TNS", "MidTierMandem", "Royal Arms"], 0]
        ]
    },
    {
        aliases: [["gollum"], ["born", "birth"], ["1440"]],
        answer: "Gollum was born in 1440.",
        quiz: [
            ["What year was Gollum born?", ["1440", "1979", "2007", "2024"], 0],
            ["The Bella Ciao lore says Gollum's birth year was what?", ["1440", "1987", "2012", "2026"], 0]
        ]
    },
    {
        aliases: [["bow city"], ["formed", "created", "founded"], ["1979"]],
        answer: "Bow City was formed in 1979.",
        quiz: [
            ["When was Bow City formed?", ["1979", "1980", "1991", "2012"], 0],
            ["Which year started the Bow City era?", ["1979", "1987", "2023", "2025"], 0]
        ]
    },
    {
        aliases: [["marice caprice", "maurice caprice", "caprice"], ["sniffler", "sniffer"], ["1980", "top division", "slide tackles"]],
        answer: "In 1980, Marice Caprice and Sniffler rose Bow City to the top division from CB through slide tackles and thundercunts.",
        quiz: [
            ["Who rose Bow City to the top division from CB in 1980?", ["Marice Caprice and Sniffler", "Bean and Gollum", "Penguin and ButterBean", "Schnitzler and Astrea"], 0],
            ["What did Caprice and Sniffler help Bow City reach in 1980?", ["The top division", "Real Madrid academy", "The VFL playoff final", "Sainsbury's FC"], 0]
        ]
    },
    {
        aliases: [["boys fc"], ["1984", "gang violence", "supporters"], ["bow city"]],
        answer: "In 1984, gang violence rose between Bow City supporters and the new club Boys FC, forcing city funds into repairs rather than building.",
        quiz: [
            ["Which new club was linked with the 1984 Bow City supporter violence?", ["Boys FC", "Into the Hole FC", "FC Hoffenheim", "VFL Newcastle"], 0],
            ["What damaged Bow City funds in 1984?", ["Gang violence involving Boys FC supporters", "A failed badge launch", "A Mexican lab moving out", "A playoff penalty loss"], 0]
        ]
    },
    {
        aliases: [["bow city"], ["liquidated", "folded", "ended"], ["1987"], ["sniffer", "caprice", "retire"]],
        answer: "Bow City FC was liquidated in 1987, and Sniffer and Caprice retired.",
        quiz: [
            ["What happened to Bow City FC in 1987?", ["It was liquidated", "It bought the Mercedes Benz stadium", "It became Sainsbury's FC", "It reached Elite division"], 0],
            ["Who retired when Bow City was liquidated?", ["Sniffer and Caprice", "Bean and Gollum", "Pigeon and Cobra", "Johny and Kanye"], 0]
        ]
    },
    {
        aliases: [["hella bow"], ["gofish"], ["1991"], ["renamed", "reborn", "sold"]],
        answer: "Bow City FC was reborn in 1991 when a 24-year-old Gofish bought it and renamed it Hella Bow.",
        quiz: [
            ["Who bought and renamed Bow City to Hella Bow in 1991?", ["Gofish", "Hellash Xiao", "Pigeon", "Garry"], 0],
            ["What name did Bow City receive after Gofish bought it in 1991?", ["Hella Bow", "Bella Ciao", "Boys FC", "Into the Hole FC"], 0]
        ]
    },
    {
        aliases: [["bean alejandro", "bean"], ["schnitzler"], ["born", "birth"], ["2007"]],
        answer: "Bean Alejandro and Schnitzler were born in 2007.",
        quiz: [
            ["Which two players were born in 2007 according to the lore?", ["Bean Alejandro and Schnitzler", "Gofish and Garry", "Johny and Kanye", "Penguin and ButterBean"], 0],
            ["What year were Bean Alejandro and Schnitzler born?", ["2007", "1440", "2015", "2025"], 0]
        ]
    },
    {
        aliases: [["coltan"], ["jake"], ["2010", "front garden fence", "car", "standoff"]],
        answer: "In 2010, Hella Bow rioter Coltan was smashed by a car over a front garden fence during a standoff with former Bow City rioter turned policeman Jake.",
        quiz: [
            ["Who was involved in the 2010 Hella Bow front garden fence incident?", ["Coltan and Jake", "Bean and Gollum", "Lucas and Ryan", "Stealth and Harrison"], 0],
            ["What happened to Coltan in 2010?", ["He was smashed by a car over a front garden fence", "He signed for Real Madrid academy", "He became Bella Ciao manager", "He won club POTY"], 0]
        ]
    },
    {
        aliases: [["coltan"], ["2011", "body", "airplane", "snowiest"], ["jake"]],
        answer: "Coltan's body was found on a crashed airplane in 2011 during one of the snowiest nights of the year, and Jake was questioned for being near the crash.",
        quiz: [
            ["Where was Coltan's body found in 2011?", ["On a crashed airplane", "At the Mercedes Benz stadium", "In the Real Madrid academy", "At Scunthorpe factories"], 0],
            ["Why was Jake questioned in 2011?", ["He was close to the crash scene", "He bought Hella Bow", "He planted weapons at Bow", "He started 11s leagues"], 0]
        ]
    },
    {
        aliases: [["hellash xiao", "hellash"], ["bellash"], ["bella ciao"], ["2012", "rebrand", "academy", "hella bow"]],
        answer: "In 2012, Hellash Xiao bought Hella Bow from Gofish, rebranded the club Bella Ciao for his son Bellash, and named the academy Hella Bow.",
        quiz: [
            ["Who purchased Hella Bow and rebranded it as Bella Ciao in 2012?", ["Hellash Xiao", "Gofish", "Pigeon", "Magnus"], 0],
            ["Why did Hellash Xiao rename Hella Bow to Bella Ciao?", ["Out of love for his son Bellash", "Because Boys FC won the league", "To join Real Madrid", "Because the academy folded"], 0],
            ["What was Bella Ciao's academy named in 2012?", ["Hella Bow", "Bow City", "Boys FC", "Sainsbury's FC"], 0]
        ]
    },
    {
        aliases: [["gofish"], ["2013"], ["returns", "came back", "manage"]],
        answer: "Gofish returned to manage the team in 2013.",
        quiz: [
            ["Who returned to manage the team in 2013?", ["Gofish", "Garry", "Pigeon", "Lucas Gaugue"], 0],
            ["What did Gofish do in 2013?", ["Returned to manage the team", "Left for Real Madrid", "Started Boys FC", "Won the ATB final"], 0]
        ]
    },
    {
        aliases: [["mercedes", "benz", "bens", "stadium"], ["hellash bow", "hellash"], ["2013", "purchase", "bought"]],
        answer: "Hellash Bow purchased the Mercedes Benz stadium in 2013.",
        quiz: [
            ["Which stadium did Hellash Bow purchase in 2013?", ["Mercedes Benz stadium", "Wembley Stadium", "VFL Newcastle", "Hoffenheim Arena"], 0],
            ["Who bought the Mercedes Benz stadium in the Bella Ciao lore?", ["Hellash Bow", "Coltan", "ButterBean", "Sean"], 0]
        ]
    },
    {
        aliases: [["harrison", "h411ison"], ["born", "birth"], ["2015"]],
        answer: "Harrison boy was born in 2015.",
        quiz: [
            ["When was Harrison boy born?", ["2015", "2007", "1984", "2026"], 0],
            ["Who was born in 2015 in the Bella Ciao timeline?", ["Harrison boy", "Gollum", "Bean Alejandro", "Jayden Syrett"], 0]
        ]
    },
    {
        aliases: [["edward"], ["christopher"], ["2018", "rivalry", "40 yards", "bird"]],
        answer: "In 2018, Edward started a rivalry with Christopher by charging from 40 yards and bodying him to the ground before watchers dropped him in bird mess.",
        quiz: [
            ["Who did Edward form a rivalry with in 2018?", ["Christopher", "Gofish", "Jayden", "Cobra"], 0],
            ["How did Edward start the Christopher rivalry?", ["Charged from 40 yards and bodied him", "Scored a 40-yard shot", "Signed him from Hoffenheim", "Named the academy after him"], 0],
            ["What happened after Edward collided with Christopher?", ["Locals dropped Edward into bird mess", "Christopher was sent off", "Edward apologised", "The match was abandoned"], 0]
        ]
    },
    {
        aliases: [["de ridder"], ["40 yard", "40-yard", "shot"], ["2022"], ["eatmyshorts", "stelthsmokylake", "stealth", "h411ison"]],
        answer: "In 2022, De Ridder scored a 40-yard shot witnessed by Eatmyshorts, Stelthsmokylake and H411ison.",
        quiz: [
            ["Who scored a 40-yard shot in 2022?", ["De Ridder", "Bean Alejandro", "Gollum", "Fyzo"], 0],
            ["Who witnessed De Ridder's 2022 40-yard shot?", ["Eatmyshorts, Stelthsmokylake and H411ison", "Penguin, ButterBean and Pigeon", "Gofish, Garry and Lucas", "Amanda, Shane and Jayden"], 0]
        ]
    },
    {
        aliases: [["johny sinns", "johny"], ["kanye", "kanye west"], ["2023"], ["sign", "loan", "holding midfielders", "g/a"]],
        answer: "Johny Sinns and Kanye West signed in 2023; they were loan superstars and holding midfielders, producing 281 G/A and 267 G/A respectively.",
        quiz: [
            ["Which loan superstars joined Bella Ciao in 2023?", ["Johny Sinns and Kanye West", "Pigeon and Cobra", "Sean and Sollum", "Ryan and Lucas"], 0],
            ["How many G/A did Johny Sinns record in the 2023 summary?", ["281", "267", "1112", "1246"], 0],
            ["How many G/A did Kanye West record in the 2023 summary?", ["267", "281", "356", "327"], 0]
        ]
    },
    {
        aliases: [["golden knight", "healer", "christopher", "frankie", "edward", "e wiz", "moretti", "ice wizard", "john", "kanye", "johny", "amanda", "shane"], ["2023", "lineup", "groundwork"]],
        answer: "The 2023 groundwork lineup included Golden Knight, Healer, Christopher, Frankie, Edward, E Wiz, Moretti, Ice Wizard, John, Kanye West, Johny Sinns, Amanda Syrett and Shane Syrett.",
        quiz: [
            ["Which goalkeeper was listed in the 2023 groundwork lineup?", ["Golden Knight", "Pigeon", "Gullit", "Cobra"], 0],
            ["Which Syretts played striker in the 2023 lineup?", ["Amanda Syrett and Shane Syrett", "Jayden Syrett and Shane Syrett", "Bean Alejandro and Gollum", "Schnitzler and Astrea"], 0],
            ["Which two CMs were in the 2023 lineup?", ["Kanye West and Johny Sinns", "Astrea and Up the Tigers", "Sean and Sollum", "Ryan and Ola"], 0]
        ]
    },
    {
        aliases: [["mexican", "laboratory", "genetic company"], ["bean", "gollum"], ["investment", "testing", "gifted"]],
        answer: "A Mexican genetic company/laboratory invested in Bella Ciao so it could test Bean Alejandro, and the later summary says the lab funded and gave Gollum and Bean to the club.",
        quiz: [
            ["What outside group became interested in Bella Ciao's 2023 system?", ["A Mexican genetic company", "Boys FC ultras", "FC Hoffenheim", "VFL Newcastle"], 0],
            ["Which two players came through the Mexican laboratory investment?", ["Gollum and Bean", "Johny and Kanye", "Schnitzler and Astrea", "Pigeon and Cobra"], 0]
        ]
    },
    {
        aliases: [["prime bella ciao", "2023-24", "23/24"], ["gollum"], ["25000000", "25,000,000", "25m"], ["bean"], ["1000", "elite division"]],
        answer: "The 2023-24 season was prime Bella Ciao: Gollum signed for 25,000,000, Bean was gifted to the club, over 1000 games were played, and Elite division was reached numerous times.",
        quiz: [
            ["Which season is described as prime Bella Ciao FC?", ["2023-24", "1984-85", "2024-25", "2025-26"], 0],
            ["How much did Gollum sign for in prime Bella Ciao?", ["25,000,000", "1,500", "327", "1112"], 0],
            ["What level did Bella Ciao repeatedly reach in 2023-24?", ["Elite division", "Amateur only", "FC Hoffenheim reserves", "The academy league"], 0]
        ]
    },
    {
        aliases: [["boys fc"], ["penguin"], ["butterbean"], ["december 2023"], ["rose", "division"]],
        answer: "In December 2023, Boys FC, run by Penguin and ButterBean, rose to Bella Ciao's division through violent fans and scummy behaviour.",
        quiz: [
            ["Who ran Boys FC when they rose in December 2023?", ["Penguin and ButterBean", "Gofish and Garry", "Sean and Sollum", "Lucas and Ryan"], 0],
            ["When did Boys FC rise to Bella Ciao's division?", ["December 2023", "August 2024", "December 2025", "January 2026"], 0]
        ]
    },
    {
        aliases: [["boys fc"], ["bella ciao"], ["3-0", "3 0"], ["league one", "elite division"], ["2024"]],
        answer: "In the 2024 League One clash for Elite division position, Bella Ciao beat Boys FC 3-0.",
        quiz: [
            ["What was the score when Bella Ciao beat Boys FC in the 2024 League One Elite race?", ["3-0", "1-9", "2-2", "0-3 to Boys FC"], 0],
            ["Who won the 2024 Boys FC vs Bella Ciao game for Elite division position?", ["Bella Ciao", "Boys FC", "Sainsbury's FC", "VFL Newcastle"], 0],
            ["What did Boys FC fans do after the 3-0 defeat?", ["Whispered the date of the next fixture", "Stormed the pitch", "Celebrated", "Left immediately"], 0]
        ]
    },
    {
        aliases: [["boys fc"], ["bean"], ["last minute winner"], ["jayden syrett", "jayden"], ["amanda", "shane"], ["gollum", "ate"], ["furious", "press conference"], ["2024", "guns", "weapons"]],
        answer: "In the 2024 rematch, Bean Alejandro scored a last-minute winner, Boys FC brought guns onto the pitch, Jayden Syrett was killed, and Gollum later ate the Boys FC manager in fury. Gollum was furious in the press conference because Boys FC's actions led to Jayden's death.",
        quiz: [
            ["Who scored the last-minute winner against Boys FC in 2024?", ["Bean Alejandro", "Jayden Syrett", "Gollum", "Pigeon"], 0],
            ["Which Bella Ciao CM was killed in the Boys FC weapons incident?", ["Jayden Syrett", "Kanye West", "Johny Sinns", "Astrea"], 0],
            ["Who were Jayden Syrett's parents?", ["Amanda and Shane", "Penguin and ButterBean", "Stealth and Harrison", "Sean and Sollum"], 0],
            ["What did Gollum do to the Boys FC manager after the Jayden incident?", ["Ate him", "Signed him", "Demoted him", "Sent him to Madrid"], 0],
            ["Why was Gollum furious during the press conference?", ["Boys FC's actions led to Jayden's death", "The manager criticised him", "He had been transferred", "Bean left the club"], 0]
        ]
    },
    {
        aliases: [["gollum"], ["1100", "1112", "assists"], ["800", "league games"], ["bean"], ["1500", "1246", "goals"], ["real madrid", "scunthorpe", "left"]],
        answer: "In 2024, Gollum left with around 1100 assists in 800 league games and went to the Fein factories of Scunthorpe; Bean Alejandro left with around 1500 goals and went to the Real Madrid academy.",
        quiz: [
            ["Where did Gollum go after leaving Bella Ciao in 2024?", ["Fein factories of Scunthorpe", "Real Madrid academy", "FC Hoffenheim", "Sainsbury's FC"], 0],
            ["Where did Bean Alejandro go after leaving Bella Ciao in 2024?", ["Real Madrid academy", "Fein factories of Scunthorpe", "Into the Hole FC", "VFL Newcastle"], 0],
            ["Roughly how many assists did Gollum leave with in 2024?", ["1100", "356", "267", "25"], 0],
            ["Roughly how many goals did Bean Alejandro leave with in 2024?", ["1500", "327", "1112", "281"], 0]
        ]
    },
    {
        aliases: [["boys fc"], ["guilty", "banned", "weapons", "rainy night", "bow"], ["2024"]],
        answer: "Boys FC were found guilty in 2024 for planting the weapons on the rainy night at Bow, so they were banned from major leagues and only made unofficial cameos afterwards.",
        quiz: [
            ["Why were Boys FC banned from major leagues?", ["They were found guilty of planting weapons", "They lost 3-0", "They failed a medical", "They copied the badge"], 0],
            ["After the weapons verdict, what kind of appearances did Boys FC make?", ["Unofficial cameos", "Champions League finals", "Club POTY nights", "Academy trials"], 0]
        ]
    },
    {
        aliases: [["gofish"], ["garry", "gary"], ["trial manager", "august"], ["24/25", "2024/25"]],
        answer: "Gofish managed through the 2024 story before being replaced by Gary/Garry, who trial-managed through August into the 24/25 season.",
        quiz: [
            ["Who replaced Gofish as trial manager going into 24/25?", ["Gary/Garry", "Pigeon", "Magnus", "Hellash Xiao"], 0],
            ["When did Gary/Garry trial-manage Bella Ciao?", ["Through August", "In 1984", "On a snowy 2011 night", "During the 2026 ATB final"], 0]
        ]
    },
    {
        aliases: [["24/25", "2024/25"], ["mexican investment", "madrid"], ["broyale"], ["randy cabbage"], ["dark place"]],
        answer: "In 24/25, Mexican investment moved out to Madrid, Broyale was signed with no thought, and failed academy player Randy Cabbage replaced Gollum during a dark spell.",
        quiz: [
            ["Who was brought in to replace Gollum during the dark 24/25 spell?", ["Randy Cabbage", "Schnitzler", "Cobra", "Magnus"], 0],
            ["Where did the Mexican investment move in 24/25?", ["Madrid", "Scunthorpe", "Bow", "Hoffenheim"], 0],
            ["Which signing was described as being made with no thought?", ["Broyale", "Gullit", "Golden Knight", "Frankie"], 0]
        ]
    },
    {
        aliases: [["sean"], ["sollum"], ["real bean", "real gollum"], ["wrestlers"], ["2025"]],
        answer: "In 2025, Sean and Sollum convinced the owners to sign the real Bean and Gollum as wrestlers.",
        quiz: [
            ["Who convinced the owners to sign the real Bean and Gollum as wrestlers?", ["Sean and Sollum", "Penguin and ButterBean", "Johny and Kanye", "Ryan and Ola"], 0],
            ["What unusual role were the real Bean and Gollum signed for in 2025?", ["Wrestlers", "Goalkeepers", "Physiotherapists", "Academy scouts"], 0]
        ]
    },
    {
        aliases: [["gofish"], ["schnitzler"], ["astrea"], ["sniffer sebust", "sebust", "tcl"], ["ark"], ["2025"]],
        answer: "In 2025, Gofish came back and signed players including Sniffer Sebust/TCL's son Schnitzler and Astrea from Ark.",
        quiz: [
            ["Who came back in 2025 and signed Schnitzler and Astrea?", ["Gofish", "Garry", "Pigeon", "Lucas Gaugue"], 0],
            ["Whose son was Schnitzler described as?", ["Sniffer Sebust/TCL's son", "Hellash Xiao's son", "Shane Syrett's son", "Penguin's son"], 0],
            ["Where did Astrea come from?", ["Ark", "Real Madrid", "Boys FC", "Bow City"], 0]
        ]
    },
    {
        aliases: [["bella ciao"], ["new badge", "badge", "brand"], ["identity"], ["2025"]],
        answer: "At the end of 2025, Bella Ciao underwent identity changes, creating its own brand and a new badge.",
        quiz: [
            ["What identity change did Bella Ciao make at the end of 2025?", ["Created its own brand and new badge", "Renamed itself Bow City", "Merged into Boys FC", "Moved to Madrid"], 0],
            ["When did Bella Ciao create its own brand and new badge?", ["End of 2025", "Start of 1979", "December 2023", "August 2024"], 0]
        ]
    },
    {
        aliases: [["schnitzler"], ["astrea"], ["fc hoffenheim", "hoffenheim"], ["medical", "dual package", "duel package"], ["2025"]],
        answer: "In 2025, Schnitzler and Astrea passed their medical after coming from FC Hoffenheim as a dual package.",
        quiz: [
            ["Which two players arrived from FC Hoffenheim as a dual package?", ["Schnitzler and Astrea", "Bean and Gollum", "Johny and Kanye", "Ryan and Ola"], 0],
            ["What did Schnitzler and Astrea pass after coming from FC Hoffenheim?", ["Their medical", "A police interview", "The Penguin files", "A stadium vote"], 0]
        ]
    },
    {
        aliases: [["merge incident"], ["into the hole fc"], ["lucas gaugue", "lucas gauge"], ["gofish"], ["back room", "identity"], ["2025"]],
        answer: "During the 2025 merge incident, Into the Hole FC made a deal to keep Bella Ciao's identity while transferring back-room staff, but fans protested because the new owners could not match Gofish's tactical genius; Lucas Gaugue was the only merged manager left.",
        quiz: [
            ["Which club was involved in the 2025 merge incident?", ["Into the Hole FC", "Boys FC", "FC Hoffenheim", "Bow City"], 0],
            ["Who was the only merged manager left after the merge incident?", ["Lucas Gaugue", "Gofish", "Pigeon", "Gazz Bryant"], 0],
            ["Why did fans protest during the merge incident?", ["The new owners could not replicate Gofish's tactical genius", "The academy was renamed Hella Bow", "Bean left for Madrid", "Bow City was formed"], 0]
        ]
    },
    {
        aliases: [["gaugue", "gauge", "lucas"], ["schnitzler"], ["companionship", "understanding"], ["2025"]],
        answer: "In 2025, Lucas Gaugue had a strong understanding with striker Schnitzler, making them future contenders among Bella Ciao's best players.",
        quiz: [
            ["Which striker had a strong understanding with Lucas Gaugue?", ["Schnitzler", "Bean Alejandro", "Amanda Syrett", "Sean"], 0],
            ["What made Gaugue and Schnitzler stand out in 2025 lore?", ["Their companionship and understanding", "A 3-0 loss to Boys FC", "A failed medical", "A stadium purchase"], 0]
        ]
    },
    {
        aliases: [["2026"], ["first lineup", "official lineup"], ["gullit", "cobra", "lucas", "alan", "pigeon", "astrea", "up the tigers", "omt", "ryan", "iced out", "schnitzler"]],
        answer: "The first official 2026 lineup was: CB Gullit, CB Cobra, RB Lucas, LB Alan, GK Pigeon, CDM Astrea, CDM Up the Tigers, CAM OMT, RAM Ryan, LAM Iced Out and ST Schnitzler.",
        quiz: [
            ["Who was goalkeeper in the first official 2026 lineup?", ["Pigeon", "Golden Knight", "Gullit", "Cobra"], 0],
            ["Who played striker in the first official 2026 lineup?", ["Schnitzler", "Bean Alejandro", "Gollum", "Amanda Syrett"], 0],
            ["Which two players were listed at CB in the first 2026 lineup?", ["Gullit and Cobra", "Lucas and Alan", "Astrea and Up the Tigers", "Ryan and Iced Out"], 0],
            ["Who was CAM in the first official 2026 lineup?", ["OMT", "Ryan", "Iced Out", "Alan"], 0]
        ]
    },
    {
        aliases: [["atb"], ["1-9", "1 9"], ["vfl newcastle", "newcastle"], ["2026", "torture"]],
        answer: "In 2026, ATB scores could end 1-9 and Bella Ciao feared mighty VFL Newcastle for their torture of the club.",
        quiz: [
            ["Which team did Bella Ciao fear in 2026 for their torture?", ["VFL Newcastle", "Boys FC", "FC Hoffenheim", "Real Madrid academy"], 0],
            ["What brutal ATB scoreline is mentioned in the 2026 lore?", ["1-9", "3-0", "2-1", "0-0"], 0]
        ]
    },
    {
        aliases: [["pigeon"], ["penguin"], ["penguin files"], ["cobra"], ["team sheets", "back room", "manager"], ["2026", "rise to power"]],
        answer: "In Pigeon's 2026 rise to power, he was the GK formerly known as Penguin, linked to the Penguin files, won games from goal, recruited Cobra, and asked to help with team sheets and back-room management.",
        quiz: [
            ["Who was Pigeon formerly known as?", ["Penguin", "Gofish", "ButterBean", "Garry"], 0],
            ["Which loyal CB did Pigeon recruit?", ["Cobra", "Gullit", "Moretti", "E Wiz"], 0],
            ["What back-room task did Pigeon ask to help with?", ["Team sheets", "Badge design", "Stadium repairs", "Medical tests"], 0]
        ]
    },
    {
        aliases: [["pigeon"], ["union of the rejects", "rejects"], ["ryan", "ola", "cobra", "lucas"], ["into the hole fc", "sainsbury's fc", "sainsburys fc"], ["2026"]],
        answer: "After Pigeon became manager, a rising force called the Union of the Rejects formed around Ryan, Ola, Cobra and Lucas, regrouping into Into the Hole FC, later named Sainsbury's FC.",
        quiz: [
            ["Who made up the Union of the Rejects?", ["Ryan, Ola, Cobra and Lucas", "Bean, Gollum, Johny and Kanye", "Sean, Sollum, Stealth and Harrison", "Penguin, ButterBean, Jayden and Garry"], 0],
            ["What did Into the Hole FC later become named?", ["Sainsbury's FC", "Hella Bow", "Boys FC", "FC Hoffenheim"], 0],
            ["What force formed after Pigeon's management drama?", ["The Union of the Rejects", "The Mexican laboratory", "The Mercedes Benz board", "The Syrett academy"], 0]
        ]
    },
    {
        aliases: [["magnus", "viking"], ["we need to talk"], ["saved bella ciao", "hero"], ["gofish"], ["2026"]],
        answer: "In 2026, as drama peaked, Magnus, known as Viking, messaged Gofish saying \"we need to talk\" and became remembered as a stereotypical hero who helped save Bella Ciao.",
        quiz: [
            ["Who messaged Gofish saying \"we need to talk\" in 2026?", ["Magnus/Viking", "Pigeon", "Lucas Gaugue", "ButterBean"], 0],
            ["What was Magnus also known as?", ["Viking", "Penguin", "The flying dutchman", "TCL"], 0],
            ["How is Magnus remembered in the 2026 drama?", ["As a household stereotypical hero", "As Boys FC manager", "As a Real Madrid scout", "As the academy founder"], 0]
        ]
    },
    {
        aliases: [["lucas gauge", "lucas gaugue", "lucas"], ["ryan"], ["traitors", "betrayers"], ["reject team"], ["history channel", "h411ison"], ["2026"]],
        answer: "In 2026, Lucas Gauge and Ryan were proven to be betrayers of Bella Ciao after messaging people in the server to join their reject team.",
        quiz: [
            ["Which two were proven to be betrayers of Bella Ciao in 2026?", ["Lucas Gauge and Ryan", "Bean and Gollum", "Sean and Sollum", "Amanda and Shane"], 0],
            ["What did Lucas Gauge and Ryan message people to join?", ["Their reject team", "Real Madrid academy", "The Mercedes Benz board", "The Mexican laboratory"], 0]
        ]
    },
    {
        aliases: [["pigeon"], ["demoted"], ["magnus"], ["2026", "drama"]],
        answer: "Pigeon was demoted during the 2026 drama, while Magnus became the hero figure.",
        quiz: [
            ["Who was demoted during the 2026 drama?", ["Pigeon", "Magnus", "Gofish", "Schnitzler"], 0],
            ["Who became the hero figure after Pigeon was demoted?", ["Magnus", "Ryan", "Lucas Gauge", "ButterBean"], 0]
        ]
    },
    {
        aliases: [["gofish"], ["suspended"], ["jayden incident"], ["league dealt"], ["2025"]],
        answer: "Gofish was suspended for a year in 2025 because of his criticism of how the league dealt with the Jayden incident.",
        quiz: [
            ["Why was Gofish suspended for a year in 2025?", ["He criticised how the league dealt with the Jayden incident", "He missed every shot on H411ison", "He renamed Bow City", "He failed his medical"], 0],
            ["Which incident led to Gofish's year-long suspension?", ["The Jayden incident", "The merge incident", "The Fyzo cross incident", "The Sebastian slip incident"], 0]
        ]
    },
    {
        aliases: [["stealth", "stelthsmokylake"], ["harrison", "h411ison"], ["esport", "true esport team", "register"], ["december", "2025"]],
        answer: "In December 2025, former youth team manager Stealth and former physiotherapist Harrison/H411ison registered Bella Ciao FC as a true Esport team.",
        quiz: [
            ["Who registered Bella Ciao as a true Esport team in December 2025?", ["Stealth and Harrison/H411ison", "Penguin and ButterBean", "Gofish and Garry", "Ryan and Ola"], 0],
            ["What did Stealth and H411ison do in December 2025?", ["Registered Bella Ciao as a true Esport team", "Bought the Mercedes Benz stadium", "Signed Johny and Kanye", "Formed Bow City"], 0]
        ]
    },
    {
        aliases: [["sniffer subust", "sniffer sebust", "tcl"], ["maurice caprice", "marice caprice", "caprice"], ["poty", "player of the year"], ["2025"]],
        answer: "Sniffer Subust/TCL and Maurice Caprice won club POTY in 2025.",
        quiz: [
            ["Who won club POTY in 2025?", ["Sniffer Subust/TCL and Maurice Caprice", "Bean and Gollum", "Pigeon and Cobra", "Stealth and Harrison"], 0],
            ["Which award did Sniffer Subust/TCL and Maurice Caprice win?", ["Club POTY", "Ballon d'Or", "Yashin Trophy", "CPL Golden Boot"], 0]
        ]
    },
    {
        aliases: [["2026"], ["managers"], ["stealth", "harrison", "lucas", "connor", "m10", "pigeon", "cobra", "gazz bryant"], ["merit", "favouritism", "competitive squad"]],
        answer: "The 2026 managers included Stealth, Harrison, Lucas, Connor, M10, Pigeon, Cobra and Gazz Bryant; the goal was a competent, competitive squad built on merit over favouritism.",
        quiz: [
            ["What principle shaped the 2026 squad goal?", ["Merit over favouritism", "Favouritism over form", "Only academy players", "Only wrestlers"], 0],
            ["Which short-lived managers are named in the 2026 summary?", ["Pigeon, Cobra and Gazz Bryant", "Bean, Gollum and Jayden", "Penguin, ButterBean and Coltan", "Amanda, Shane and Johny"], 0]
        ]
    },
    {
        aliases: [["vfl playoff final", "playoff final"], ["penalties"], ["atb final"], ["losing", "come back", "unmovable"], ["2026"]],
        answer: "The 2026 summary says losing a VFL Playoff final on penalties and losing an ATB final taught Bella Ciao that what matters is how you come back from losing, making the club unmovable through time.",
        quiz: [
            ["How did Bella Ciao lose the VFL Playoff final?", ["On penalties", "By forfeit", "3-0 to Boys FC", "After a medical failure"], 0],
            ["What did the VFL and ATB final losses teach Bella Ciao?", ["It is how you come back from losing that matters", "Never sign a striker", "Always rename the academy", "Only play unofficial cameos"], 0]
        ]
    },
    {
        aliases: [["i hate this stadium"], ["h411ison", "harrison"], ["outrageous", "notable"], ["history section"]],
        answer: "\"I hate this stadium\" is notable in Bella Ciao lore because it was viewed as an outrageous statement in the context of the history section.",
        quiz: [
            ["Why is \"I hate this stadium\" notable in Bella Ciao lore?", ["It was viewed as an outrageous statement in the history section", "It caused a points deduction", "It was used during a riot", "It got a player suspended"], 0],
            ["Who is linked with the \"I hate this stadium\" line?", ["H411ison", "Gofish", "Penguin", "Jake"], 0]
        ]
    },
    {
        aliases: [["incidents", "incident list"], ["suck my small", "i hate this stadium", "lucas we need to gaugue", "big bean", "what tribe", "weeping woods", "fyzo cross", "sebastian slip", "crusty sebastian", "hater friend", "more ping than points", "schnitzel", "summer holidays"]],
        answer: "The incident list includes: suck my small, I hate this stadium, Lucas we need to Gaugue, big bean, my bird got smacked at a night club, what tribe, weeping woods, Fyzo cross, Sebastian slip, crusty Sebastian, your bird plays pro clubs, I'm just the hater friend, ahhh I gerri, more ping than points, what is Schnitzel doing, Craig through ball, Breast, see you next week buddy, idk who that was, CPL throw, Fyzo 50 jobs 0 hours, Spoondoodle1 shooting the wall on Ark, and summer holidays logging on to say bye.",
        quiz: [
            ["Which of these is on the Bella Ciao incident list?", ["Lucas we need to Gaugue incident", "La Decima incident", "Golden Ball incident", "Treble parade incident"], 0],
            ["Which incident involved Spoondoodle1 in the lore list?", ["Shooting the wall on Ark and missing H411ison", "Buying Hella Bow", "Passing a Hoffenheim medical", "Scoring a 40-yard shot"], 0],
            ["Which phrase appears as an incident in Bella Ciao lore?", ["More ping than points", "More goals than trophies", "More badges than clubs", "More finals than wins"], 0]
        ]
    },
    {
        aliases: [["craig through ball", "through ball incident"], ["craig"], ["intercepted", "low through ball", "late equaliser", "middle of the pitch"]],
        answer: "The Craig through ball incident was Craig playing an intercepted low through ball down the middle of the pitch, which led to a late equaliser for the other team.",
        quiz: [
            ["What happened in the Craig through ball incident?", ["Craig played an intercepted low through ball that led to a late equaliser", "Craig scored a 40-yard volley", "Craig bought Hella Bow", "Craig saved a penalty in PSL"], 0],
            ["Who played the intercepted low through ball that led to a late equaliser?", ["Craig", "Cobra", "Pigeon", "Dirk"], 0]
        ]
    },
    {
        aliases: [["breast incident", "breast"], ["incident"], ["psl"], ["pigeon"], ["rushing out", "saving nothing", "defensive performance"]],
        answer: "The Breast incident was the worst defensive performance Bella Ciao saw in PSL: Pigeon kept rushing out and saving absolutely nothing.",
        quiz: [
            ["Which keeper was central to the Breast incident?", ["Pigeon", "Golden Knight", "Gullit", "Cobra"], 0],
            ["What was the Breast incident remembered for?", ["Pigeon rushing out and saving nothing in a terrible PSL defensive performance", "Bean leaving for Madrid", "Gofish buying Bow City", "Schnitzler winning the CPL Ballon d'Or"], 0]
        ]
    },
    {
        aliases: [["what is schnitzel doing", "what is schnitzler doing"], ["incident"], ["olats"], ["standing still", "staring into nothing", "yellow card", "ref"]],
        answer: "The \"what is Schnitzel doing\" incident happened when Olats caught Schnitzler standing still and staring into nothing while the ref gave another teammate a yellow, leading Olats to ask what Schnitzel was doing.",
        quiz: [
            ["Who asked \"what is Schnitzel doing\"?", ["Olats", "Craig", "Pigeon", "Gazz Bryant"], 0],
            ["What was Schnitzler doing in the \"what is Schnitzel doing\" incident?", ["Standing still staring into nothing", "Scoring a 40-yard volley", "Selling plane tickets", "Rushing out in goal"], 0]
        ]
    },
    {
        aliases: [["see you next week buddy"], ["stealth"], ["h4", "harrison", "h411ison"], ["logged on next day", "aura"]],
        answer: "In the \"see you next week buddy\" incident, Stealth thought he had aura telling H4 \"see you next week\", but he logged on the very next day.",
        quiz: [
            ["Who said \"see you next week buddy\" before logging on the next day?", ["Stealth", "Craig", "Bean", "Cobra"], 0],
            ["Who did Stealth say \"see you next week buddy\" to?", ["H4/H411ison", "Pigeon", "Coltan", "Dirk"], 0]
        ]
    },
    {
        aliases: [["idk who that was", "i don't know who that was", "i dont know who that was"], ["stealth"], ["dad"], ["you alright", "call"]],
        answer: "The \"idk who that was\" incident was Stealth's dad asking \"you alright\" in front of the call, with Stealth trying to play it off by saying \"idk who that was\".",
        quiz: [
            ["Whose dad caused the \"idk who that was\" incident?", ["Stealth's dad", "Craig's dad", "Bean's dad", "Pigeon's dad"], 0],
            ["What did Stealth say after his dad spoke in front of the call?", ["Idk who that was", "See you next week buddy", "I was going to win it so I shot", "That was interesting"], 0]
        ]
    },
    {
        aliases: [["bean bean bean"], ["big gleaming smile", "h4", "jacob", "stealth"], ["40 yard powershot volley", "bean scored"]],
        answer: "\"Bean, Bean, Bean\" was said with a big gleaming smile by H4, Jacob and Stealth whenever Bean scored a 40-yard powershot volley.",
        quiz: [
            ["Who said \"Bean, Bean, Bean\" with a big gleaming smile?", ["H4, Jacob and Stealth", "Pigeon, Cobra and Ryan", "Gofish, Garry and Lucas", "Craig, Dirk and Bloke"], 0],
            ["What usually caused the \"Bean, Bean, Bean\" chant?", ["Bean scoring a 40-yard powershot volley", "Pigeon saving a penalty", "Schnitzler winning a corner", "Gazz Bryant selling tickets"], 0]
        ]
    },
    {
        aliases: [["cpl throw", "throw incident"], ["pigeon"], ["cpl chelsea"], ["buns", "lagging", "corruption", "rigging"]],
        answer: "The CPL throw incident was Pigeon claiming he let Bella Ciao beat CPL Chelsea, when the lore says he was simply playing buns and lagging. Bella Ciao then left CPL because of corruption and rigging.",
        quiz: [
            ["Who claimed he threw against Bella Ciao in the CPL throw incident?", ["Pigeon", "Schnitzler", "Cobra", "Craig"], 0],
            ["Why did Bella Ciao leave CPL in the CPL throw lore?", ["Because of corruption and rigging", "Because Bean joined Madrid", "Because Bow City was liquidated", "Because Craig missed a header"], 0]
        ]
    },
    {
        aliases: [["cpl ballon d'or", "cpl balon d'or", "ballon dor", "balon dor"], ["schnitzler"], ["won"]],
        answer: "Schnitzler won the CPL Ballon d'Or.",
        quiz: [
            ["Who won the CPL Ballon d'Or?", ["Schnitzler", "Bean Alejandro", "Pigeon", "Craig"], 0],
            ["Which award did Schnitzler win in CPL lore?", ["CPL Ballon d'Or", "Yashin Trophy", "Golden Glove", "PSL Defender of the Year"], 0]
        ]
    },
    {
        aliases: [["tp link", "tplink"], ["dirk"], ["bloke"], ["lag", "stop lag", "solved"]],
        answer: "TP-Link solved many players' lag problems after being suggested by Dirk and Bloke, who are two different people.",
        quiz: [
            ["What solved many players' lag issues in Bella Ciao lore?", ["TP-Link", "A new badge", "The Penguin files", "The Mercedes Benz stadium"], 0],
            ["Who suggested TP-Link to help stop lag?", ["Dirk and Bloke", "Pigeon and Cobra", "H4 and Jacob", "Sean and Sollum"], 0]
        ]
    },
    {
        aliases: [["bean"], ["from", "mexico", "mexican"], ["schnitzler", "germany", "german"], ["gollum", "another time", "221 pounds"]],
        answer: "Bean is from Mexico, Schnitzler is from Germany, and Gollum is from another time, coming in at 221 pounds.",
        quiz: [
            ["Where is Bean from in Bella Ciao lore?", ["Mexico", "Germany", "Another time", "Scunthorpe"], 0],
            ["Where is Schnitzler from in Bella Ciao lore?", ["Germany", "Mexico", "Bow City", "Little Polar Peak"], 0],
            ["Where is Gollum from in Bella Ciao lore?", ["Another time", "Germany", "Mexico", "FC Hoffenheim"], 0]
        ]
    },
    {
        aliases: [["penguin files"], ["penguin"], ["files"], ["little polar peak"], ["boys fc"], ["nike tec fleece", "evil bean", "sollum", "cody rhodes", "butterbean", "lil p", "scrub", "roy keane"], ["strange parties"]],
        answer: "The Penguin files are the files of Boys FC manager Penguin, who spent his fortune taking Boys FC players to his island, Little Polar Peak, where Nike Tec Fleece, Evil Bean, Sollum, Cody Rhodes, ButterBean, Penguin, Lil P, Scrub, Roy Keane and others had strange parties.",
        quiz: [
            ["What was Penguin's island called in the Penguin files?", ["Little Polar Peak", "Hella Bow", "Scunthorpe", "Weeping Woods"], 0],
            ["Whose files are the Penguin files?", ["Boys FC manager Penguin's", "Gofish's", "Gazz Bryant's", "Schnitzler's"], 0]
        ]
    },
    {
        aliases: [["gazz bryant"], ["hella bow planecrash", "plane crash", "planecrash"], ["sold his tickets", "selling his tickets"], ["coltan", "jake", "gta holiday"]],
        answer: "Gazz Bryant is the only man to survive the Hella Bow plane crash of 25 because he sold his tickets to fund Coltan and Jake's GTA holiday.",
        quiz: [
            ["Who was the only man to survive the Hella Bow plane crash of 25?", ["Gazz Bryant", "Coltan", "Jake", "Penguin"], 0],
            ["Why did Gazz Bryant survive the Hella Bow plane crash of 25?", ["He sold his tickets to fund Coltan and Jake's GTA holiday", "He was in goal for Bella Ciao", "He joined Boys FC", "He won the CPL Ballon d'Or"], 0]
        ]
    },
    {
        aliases: [["jake"], ["police officer", "ex friend"], ["coltan"], ["hello coltan", "havent seen you in time", "work is getting too much"]],
        answer: "Jake is a police officer and Coltan's ex-friend. He tracked down Coltan, with famous lines including \"hello Coltan, haven't seen you in time\" and \"the work is getting too much for me\".",
        quiz: [
            ["What job does Jake have in the lore?", ["Police officer", "CPL owner", "Bella Ciao striker", "Hella Bow pilot"], 0],
            ["Which line is associated with Jake?", ["Hello Coltan, haven't seen you in time", "I was going to win it so I shot", "Gussy or Glendick", "Yes big snitch"], 0]
        ]
    },
    {
        aliases: [["coltan"], ["gangsta", "gangster"], ["get out this bar you tool", "witless worm"], ["1 on 1 duel", "running him over"]],
        answer: "Coltan is a gangsta known for the lines \"get out this bar you tool\" and \"here you witless worm\". He died after Jake's friend ran him over mid 1-on-1 duel.",
        quiz: [
            ["Which line is associated with Coltan?", ["Get out this bar you tool", "That was interesting", "Stealth didn't get in", "See you next week buddy"], 0],
            ["How did Coltan die in the later lore?", ["Jake's friend ran him over mid 1-on-1 duel", "He lost the CPL Ballon d'Or", "He rushed out in goal", "He stood still during a yellow card"], 0]
        ]
    },
    {
        aliases: [["coltan", "jake", "casino heist"], ["caughlan", "casino"], ["flying bike", "bridge collision"], ["episode 3", "plane goes down"], ["double life"]],
        answer: "In the Coltan casino-heist story, Jake remained close to Coltan while living a double life as a police officer. Caughlan worked with Coltan but was stopped at the casino entrance while Coltan was in the car park. The escape became a car chase, bridge collision and flying-bike escape. Coltan had built the bike at 20 and finally used it at 35; Jake shot him from the air, then Jake's associate returned and rammed him. Coltan later appeared again in Episode 3, his former associates wished him well as he headed out of Los Santos, and his plane unknowingly went down.",
        quiz: [
            ["Why did Jake initially remain associated with Coltan during the casino job?", ["He was living a double life", "He wanted to rob Coltan", "He was secretly running Boys FC", "He was investigating Penguin"], 0],
            ["Which person was working alongside Coltan during the casino heist?", ["Caughlan", "Penguin", "Gazz Bryant", "Schnitzler"], 0],
            ["During the casino operation, where was Coltan when everything started falling apart?", ["In the casino car park", "At the casino entrance", "In the vault", "On the roof"], 0],
            ["What happened to Caughlan during the casino heist?", ["He was stopped at the casino entrance", "He escaped Los Santos", "He stole the money", "He shot Coltan"], 0],
            ["Complete the sequence: Casino Heist, Car Chase, __, Flying Bike.", ["Bridge Collision", "Dragon Fight", "Front Garden Fence", "Plane Crash"], 0],
            ["After being rammed off the bridge, how did Coltan continue his escape?", ["Flying Bike", "Helicopter", "Train", "Boat"], 0],
            ["Which statement about Coltan's flying bike is true?", ["Coltan built it years before eventually using it", "Coltan built it shortly before the chase", "Coltan stole it from Jake", "Caughlan built it"], 0],
            ["How old was Coltan when he built the flying bike?", ["20", "18", "25", "35"], 0],
            ["How old was Coltan when he finally used the flying bike during the chase?", ["35", "20", "25", "30"], 0],
            ["Who shot Coltan out of the air?", ["Jake", "Caughlan", "Penguin", "Gazz Bryant"], 0],
            ["What happened immediately after Coltan was shot from the flying bike?", ["Jake's associate eventually returned and rammed him", "He escaped Los Santos", "Jake retired", "The dragon appeared"], 0],
            ["Which description best matches Jake?", ["Police officer living a double life", "Lifelong criminal with no police connection", "Boys FC chairman", "Casino owner"], 0],
            ["Which famous Jake quote appears in the lore?", ["Hello Coltan, haven't seen you in time", "What tribe?", "Stealth didn't get in", "That was interesting"], 0],
            ["What makes Coltan's apparent death unusual?", ["He later appears again in Episode 3", "He wins the Ballon d'Or afterwards", "He joins Bella Ciao afterwards", "He becomes a police officer afterwards"], 0],
            ["In Episode 3, what do Coltan's former associates do?", ["Wish him well", "Hunt him down", "Arrest him", "Rob him"], 0],
            ["Where is Coltan heading when he is last seen?", ["Out of Los Santos", "Little Polar Peak", "Scunthorpe", "Birmingham Docks"], 0],
            ["What ultimately happens to Coltan's plane?", ["It unknowingly goes down", "It reaches its destination", "It disappears", "Jake shoots it down"], 0],
            ["Which event happened first in the casino-heist story?", ["Caughlan is stopped at the casino", "Coltan is shot from the flying bike", "Coltan is rammed off the bridge", "Jake's associate returns"], 0],
            ["Which pair are the same age in the Coltan story?", ["Jake and Coltan", "Coltan and Caughlan", "Jake and Caughlan", "Jake and Penguin"], 0],
            ["Which answer best summarises Coltan's story?", ["Gangster, Casino Heist, Car Chase, Flying Bike, Apparent Death, Episode 3 Return, Plane Goes Down", "Footballer, Boys FC, Ballon d'Or, Retirement", "Police Officer, Dragon Hunter, Manager", "Goalkeeper, Hella Bow Survivor, Viking"], 0]
        ]
    },
    {
        aliases: [["bella ciao lines", "club lines", "who said"], ["i was going to win it so i shot", "stealth didn't get in", "that was interesting", "yes big snitch", "gussy or glendick"]],
        answer: "Bella Ciao lines: Cobra said \"I was going to win it so I shot\" after disobeying the corner tactic; Craig said \"Stealth didn't get in\" while informing the wife Schnitzler had not loaded in; Gehad said \"that was interesting\" after a player showed zero composure, skill or accuracy; \"yes big snitch\" was said to Schnitzler during bad early form; and \"gussy or glendick\" was asked to Fyzo, who replied \"I'm not answering that\".",
        quiz: [
            ["Who said \"I was going to win it so I shot\"?", ["Cobra", "Craig", "Gehad", "Fyzo"], 0],
            ["Who said \"Stealth didn't get in\"?", ["Craig", "Cobra", "Gehad", "Pigeon"], 0],
            ["Who said \"that was interesting\"?", ["Gehad", "Olats", "Schnitzler", "Jake"], 0],
            ["Who was \"gussy or glendick\" asked to?", ["Fyzo", "Cobra", "Craig", "Bean"], 0]
        ]
    },
    {
        aliases: [["fyzo"], ["50 jobs 0 hours", "50 jobs", "working", "docks", "mcdonalds", "gym", "pool", "sauna"]],
        answer: "The Fyzo 50 Jobs 0 Hours incident is the running joke that Fyzo is always available despite claiming he has been working, is at the docks, works somewhere new, or has found a gym with a pool and sauna for £5.",
        quiz: [
            ["Fyzo joins the call and claims he's been busy working. Which would be MOST believable according to Bella Ciao history?", ["All of the above", "He's just finished a shift at the docks of Birmingham", "He's just finished a shift at McDonald's", "He's just finished a shift somewhere else he's never mentioned before"], 0],
            ["According to Bella Ciao lore, which claim would fit perfectly into the Fyzo 50 Jobs 0 Hours incident?", ["All of the above", "I've been working", "I'm at the docks", "I've got a gym with a pool and sauna for £5"], 0]
        ]
    },
    {
        aliases: [["fyzo"], ["nightclub", "bird got smacked", "my bird just got smacked", "what tribe"], ["h411ison", "harrison"]],
        answer: "In the nightclub exchange, Fyzo said \"my bird just got smacked outside the nightclub\" and H411ison replied \"what tribe?\".",
        quiz: [
            ["Complete the exchange: Fyzo said \"My bird just got smacked outside the nightclub.\" What did H411ison reply?", ["What tribe?", "That was interesting", "Stealth didn't get in", "We need to talk"], 0]
        ]
    },
    {
        aliases: [["fyzo"], ["fyzo cross", "cross incident", "crossing ability", "dangerous to watch"]],
        answer: "The Fyzo Cross incident was created because Fyzo's crossing ability became dangerous to watch.",
        quiz: [
            ["Which incident was created purely because Fyzo's crossing ability became dangerous to watch?", ["Fyzo Cross Incident", "Breast Incident", "More Ping Than Points Incident", "Sebastian Slip Incident"], 0]
        ]
    },
    {
        aliases: [["fyzo"], ["gussy or glendick", "gussy", "glendick"], ["not answering", "refused to answer"]],
        answer: "When Fyzo was asked \"Gussy or Glendick?\", he refused to choose and replied \"I'm not answering that.\"",
        quiz: [
            ["When asked \"Gussy or Glendick?\", what did Fyzo choose?", ["Refused to answer", "Picked Gussy", "Picked Glendick", "Left the call"], 0]
        ]
    },
    {
        aliases: [["fyzo"], ["incidents", "incident list"], ["fyzo cross", "what tribe", "50 jobs 0 hours"]],
        answer: "The incidents directly tied to Fyzo are Fyzo Cross, What Tribe, and Fyzo 50 Jobs 0 Hours.",
        quiz: [
            ["Which combination contains ONLY incidents directly tied to Fyzo?", ["Fyzo Cross, What Tribe, Fyzo 50 Jobs 0 Hours", "What Is Schnitzel Doing, Fyzo Cross, What Tribe", "Breast Incident, Fyzo Cross, What Tribe", "Craig Through Ball, What Tribe, Fyzo 50 Jobs 0 Hours"], 0]
        ]
    },
    {
        aliases: [["penguin"], ["blue mist", "bean", "gollum", "wwe", "wrestling", "entrance"]],
        answer: "In Penguin's wrestling feud, he opposed Bean and Gollum and memorably used blue mist instead of conventional wrestling attacks. His entrance was famous for unexpectedly zesty shaking rather than terrifying music."
    },
    {
        aliases: [["penguin"], ["missing", "disappearance", "2026", "boys fc", "vanished"]],
        answer: "Penguin is currently missing, and the disappearance is especially strange because Boys FC has effectively vanished too, with no known Boys FC sightings throughout 2026. Bella Ciao, their biggest rivals, benefited most from the disappearance."
    },
    {
        aliases: [["penguin files", "penguin"], ["unknown victim", "darkest", "video", "little polar peak", "island"]],
        answer: "The Penguin Files are inseparable from Penguin's reputation and activities at Little Polar Peak, also called 'the island'. One of their darkest elements is a video involving an unknown victim."
    },
    {
        aliases: [["harrisonboy", "harrison boy", "jacob"], ["boy", "boys fc", "gofish", "gary", "ocean", "sacrifice"]],
        answer: "Jacob became suspicious to Gofish and Gary simply because his name contained 'Boy'. HarrisonBoy was linked to Boys FC on the same extremely weak evidence and was dropped into the ocean."
    },
    {
        aliases: [["iced", "iced out", "iced_out_monkeys"], ["winger", "centre back", "center back", "cb", "astrea", "december 2025", "german"]],
        answer: "Iced_Out_Monkeys is German and joined Bella Ciao as a winger in December 2025 before Astrea backed his potential and helped him develop into a top centre-back. Since joining, Iced has witnessed Bella Ciao's growth as a club."
    },
    {
        aliases: [["iced", "iced out", "iced_out_monkeys"], ["camera incident", "microphone", "mic", "leo", "booty buns", "schnitzler", "corner", "knock on"]],
        answer: "Iced has no microphone, which Leo regularly slanders while Astrea is more supportive. During the Iced Out Camera Incident, fans pretended his camera turned on even though it never did, then claimed he disappeared for about a week. Schnitzler called him 'Booty Buns' but appreciates Iced's knock-ons from corners."
    },
    {
        aliases: [["lucas gough", "gough"], ["merge incident", "lt hutchy", "gough ball", "power cut", "sainsburys", "born to lose"]],
        answer: "Lucas Gough arrived with LT Hutchy during the Merge Incident. His trademark Gough Ball deliveries usually found Schnitzler. His power-cut and disconnect stories appeared when Bella Ciao played badly; he later left for Sainsbury's FC and is on loan at Born To Lose FC to raise his level back up."
    },
    {
        aliases: [["bean", "gollum"], ["durag", "noodle hair bean", "pace", "bicycle kick", "madrid", "messi"]],
        answer: "Gollum famously wore a durag before Bean continued the tradition. Bean is listed at 6'7 and Gollum at 6'2; Noodle Hair Bean was Bean's 6'4 son. Bean's pace was revealed as 74-79, his bicycle-kick powershot hit the bar, and in Madrid he drew 3-3 with Messi as both scored hat-tricks."
    },
    {
        aliases: [["apex"], ["chippy chips", "vpc", "golden boot", "ucl", "winning", "focus"]],
        answer: "Apex is the Bella Ciao striker known for calling out teammates who joke instead of focusing on winning. He was formerly associated with Chippy Chips and won the VPC Golden Boot alongside a UCL trophy."
    },
    {
        aliases: [["gazz bryant", "joe"], ["clash royale", "promo", "tables", "ladders", "chairs", "lets do this"]],
        answer: "Gazz Bryant delivered the famous Clash Royale promo on Joe, saying Joe was hurting Harrison's feelings by choosing Clash Royale over Xbox and that COD was not good enough anymore. The challenge mentioned tables, ladders and chairs and ended with 'LET'S DO THIS!'."
    }
];

const CLUB_HISTORY_OVERVIEW = [
    "Bella Ciao's lore starts with Bow City, formed in 1979, then rising in 1980 through Marice Caprice and Sniffler before being liquidated in 1987.",
    "Gofish revived the club as Hella Bow in 1991, then Hellash Xiao bought it in 2012 and rebranded it Bella Ciao for his son Bellash while naming the academy Hella Bow.",
    "Modern Bella Ciao was built in 2023 with Johny Sinns, Kanye West, the Syretts and the Mexican laboratory link that brought Bean Alejandro and Gollum into the story.",
    "Prime Bella Ciao came in 2023-24: over 1000 games, repeated Elite division runs, Bean scoring heavily, Gollum creating everything, and Boys FC becoming the major rival.",
    "The club then went through the Jayden Syrett tragedy, the post-prime 24/25 dark spell, Gofish's return, the 2025 identity changes, the merge incident, and the 2026 Pigeon/reject-team drama.",
    "The short version: Bella Ciao survives chaos, bad rivals, strange ownership, dramatic betrayals and painful finals because the club keeps coming back."
];

const PERSON_LORE = [
    {
        aliases: ["gofish", "go fish"],
        answer: "Gofish is one of the central figures in Bella Ciao lore: he bought and renamed Bow City as Hella Bow in 1991, returned to manage in 2013, led the prime 2023-24 era, was later replaced by Gary/Garry, then came back again in 2025. He is basically the tactical reference point everyone compares later managers against."
    },
    {
        aliases: ["gollum"],
        answer: "Gollum is a legendary Bella Ciao figure born in 1440 in the lore. He is from another time and comes in at 221 pounds. During prime Bella Ciao he signed for 25,000,000, became the creator-in-chief with around 1100 assists, left for the Fein factories of Scunthorpe, and famously ate the Boys FC manager after the Jayden incident."
    },
    {
        aliases: ["bean", "bean alejandro", "big bean"],
        answer: "Bean Alejandro is one of Bella Ciao's prime-era monsters. The lore says he was born in 2007, is from Mexico, arrived through Mexican laboratory investment, wore number 7 in 23/24, scored huge numbers, hit a last-minute winner against Boys FC, then left for the Real Madrid academy. H4, Jacob and Stealth chanted \"Bean, Bean, Bean\" whenever he scored a 40-yard powershot volley."
    },
    {
        aliases: ["schnitzler", "schnitzel"],
        answer: "Schnitzler is a Bella Ciao striker born in 2007 and later signed by Gofish in 2025 as Sniffer Sebust/TCL's son. He is from Germany, arrived with Astrea from FC Hoffenheim as a dual package, built a strong partnership with Lucas Gaugue, won the CPL Ballon d'Or, and is tied to the \"what is Schnitzel doing\" incident."
    },
    {
        aliases: ["pigeon"],
        answer: "Pigeon is a 2026 Bella Ciao drama figure: linked to the Penguin files, a GK who won games from goal, recruited Cobra, helped with team sheets, then became manager. His management drama helped spark the Union of the Rejects before he was demoted, and he is also tied to the Breast incident and the CPL throw incident."
    },
    {
        aliases: ["boys fc", "boys"],
        answer: "Boys FC are Bella Ciao's main rivals in the lore. They first appear around the Bow City violence, then return hard in December 2023 under Penguin and ButterBean. In 2024 they lost 3-0 to Bella Ciao, were involved in the Jayden Syrett tragedy, and were later banned from major leagues for planting weapons."
    },
    {
        aliases: ["jayden", "jayden syrett"],
        answer: "Jayden Syrett was the young Bella Ciao CM killed during the 2024 Boys FC weapons incident after Bean scored a last-minute winner. He was the son of Amanda and Shane Syrett, and the fallout shaped a lot of the later club lore."
    },
    {
        aliases: ["amanda", "amanda syrett"],
        answer: "Amanda Syrett was part of the 2023 Bella Ciao groundwork lineup as a striker and is Jayden Syrett's mother in the lore."
    },
    {
        aliases: ["shane", "shane syrett", "flying dutchman"],
        answer: "Shane Syrett was part of the 2023 striker pairing with Amanda Syrett and was nicknamed the flying dutchman. In the lore, he is also Jayden Syrett's father."
    },
    {
        aliases: ["hellash", "hellash xiao", "hellash bow"],
        answer: "Hellash Xiao bought Hella Bow from Gofish in 2012, rebranded it Bella Ciao out of love for his son Bellash, and created the Hella Bow academy. Hellash Bow is also linked with purchasing the Mercedes Benz stadium."
    },
    {
        aliases: ["bellash"],
        answer: "Bellash is Hellash Xiao's son. Bella Ciao was renamed in 2012 through Hellash's love for Bellash."
    },
    {
        aliases: ["marice caprice", "maurice caprice", "caprice"],
        answer: "Marice/Maurice Caprice is an early Bow City legend who, with Sniffler, rose Bow City to the top division in 1980 from CB through slide tackles and thundercunts. Caprice later appears again as a 2025 club POTY winner."
    },
    {
        aliases: ["sniffler", "sniffer"],
        answer: "Sniffler/Sniffer is an early Bow City figure who helped Caprice rise Bow City to the top division in 1980, then retired when Bow City was liquidated in 1987."
    },
    {
        aliases: ["sniffer subust", "sniffer sebust", "sebust", "tcl", "cum lord"],
        answer: "Sniffer Subust/Sebust, also referred to as TCL in the lore, is tied to the 2025 era and is described as Schnitzler's father. Sniffer Subust/TCL also won club POTY with Maurice Caprice."
    },
    {
        aliases: ["astrea"],
        answer: "Astrea joined Bella Ciao in 2025, coming from Ark and later passing a medical with Schnitzler after arriving from FC Hoffenheim as a dual package. Astrea was also listed at CDM in the first official 2026 lineup."
    },
    {
        aliases: ["lucas gaugue", "lucas gauge", "gaugue", "gauge", "lucas"],
        answer: "Lucas Gaugue/Gauge is tied to the 2025 merge incident as the only merged manager left, then built a strong understanding with striker Schnitzler. In 2026, Lucas Gauge and Ryan were later framed in the lore as betrayers who pushed people toward the reject team."
    },
    {
        aliases: ["ryan"],
        answer: "Ryan appears in the 2026 lineup at RAM and later becomes part of the Union of the Rejects. The lore says Ryan and Lucas Gauge were proven as betrayers after messaging people to join their reject team."
    },
    {
        aliases: ["cobra"],
        answer: "Cobra was recruited by Pigeon and described as one of Bella Ciao's most respectable and loyal CBs. He later gets pulled into the Union of the Rejects drama and is named among the short-lived 2026 managers."
    },
    {
        aliases: ["magnus", "viking"],
        answer: "Magnus, known as Viking, is the 2026 hero figure. At the peak of the drama he messaged Gofish saying \"we need to talk\", helping expose the reject-team betrayal and becoming remembered as the man who saved Bella Ciao."
    },
    {
        aliases: ["harrison", "h411ison"],
        answer: "Harrison/H411ison is all over Bella Ciao lore: born in 2015 in the timeline, witness to De Ridder's 2022 40-yard shot, former physiotherapist who helped register Bella Ciao as a true Esport team in December 2025, and connected to several incident-list jokes."
    },
    {
        aliases: ["stealth", "stelthsmokylake"],
        answer: "Stealth/Stelthsmokylake witnessed De Ridder's 2022 40-yard shot and later, as former youth team manager, helped Harrison register Bella Ciao FC as a true Esport team in December 2025. He is also tied to the \"see you next week buddy\" incident, the \"idk who that was\" dad incident, and the Bean chant with H4 and Jacob."
    },
    {
        aliases: ["johny", "johny sinns", "johnny sinns"],
        answer: "Johny Sinns joined Bella Ciao in 2023 as one of the loan superstars and holding midfielders alongside Kanye West. The summary credits him with 281 G/A."
    },
    {
        aliases: ["kanye", "kanye west"],
        answer: "Kanye West joined Bella Ciao in 2023 as a loan superstar and holding midfielder alongside Johny Sinns. The summary credits him with 267 G/A."
    },
    {
        aliases: ["gary", "garry"],
        answer: "Gary/Garry replaced Gofish after the 2024 story and trial-managed through August going into the 24/25 season."
    },
    {
        aliases: ["randy cabbage", "randy"],
        answer: "Randy Cabbage was an ex-failed Bella Ciao academy player brought in during the dark 24/25 spell to replace Gollum."
    },
    {
        aliases: ["broyale"],
        answer: "Broyale was signed during the dark 24/25 period, with the lore saying the signing was made with no thought."
    },
    {
        aliases: ["sean", "sollum"],
        answer: "Sean and Sollum arrived around the end of prime Bella Ciao in 2025 and convinced the owners to sign the real Bean and Gollum as wrestlers."
    },
    {
        aliases: ["coltan"],
        answer: "Coltan was a Hella Bow rioter and gangsta linked with the lines \"get out this bar you tool\" and \"here you witless worm\". His casino-heist escape became a car chase, bridge collision and flying-bike escape using a bike he built at 20 and finally used at 35. Jake shot him from the air and Jake's associate rammed him, but Coltan later appeared in Episode 3 before heading out of Los Santos on a plane that unknowingly went down."
    },
    {
        aliases: ["jake"],
        answer: "Jake was a former Bow City rioter turned police officer and Coltan's ex-friend. He remained close to Coltan during the casino job while living a double life, later tracked him through the chase and shot him from the flying bike. His lines include \"hello Coltan, haven't seen you in time\" and \"the work is getting too much for me\"."
    },
    {
        aliases: ["edward"],
        answer: "Edward was part of the 2023 groundwork lineup at RB and started a 2018 rivalry with Christopher by charging from 40 yards and bodying him to the ground."
    },
    {
        aliases: ["christopher"],
        answer: "Christopher appears in the 2023 groundwork lineup and had a rivalry with Edward after Edward charged from 40 yards and bodied him in 2018."
    },
    {
        aliases: ["de ridder"],
        answer: "De Ridder scored the famous 2022 40-yard shot, witnessed by Eatmyshorts, Stelthsmokylake and H411ison."
    },
    {
        aliases: ["fyzo"],
        answer: "Fyzo is mostly known through incidents and jokes in the lore: the Fyzo cross incident, Fyzo 50 jobs 0 hours, and being the player whose crosses are named after him."
    },
    {
        aliases: ["penguin"],
        answer: "Penguin is the historic founder/leader figure inseparable from Boys FC, the Penguin Files and Little Polar Peak. He fought Bean and Gollum in WWE using blue mist, became known for an unexpectedly zesty entrance, and is currently missing alongside Boys FC after no known 2026 sightings."
    },
    {
        aliases: ["iced", "iced out", "iced_out_monkeys"],
        answer: "Iced_Out_Monkeys is a German Bella Ciao defender who joined as a winger in December 2025 and developed into a top centre-back with Astrea's backing. He has no microphone, is tied to the fake Iced Out Camera Incident, sends cheeky messages, and provides the corner knock-ons Schnitzler appreciates."
    },
    {
        aliases: ["spoondoodle", "spoondoodle1"],
        answer: "Spoondoodle1 appears in the incident list for shooting the wall on Ark and missing all his shots on H411ison."
    },
    {
        aliases: ["craig"],
        answer: "Craig is a Bella Ciao lore figure linked with the Craig through ball incident and the \"Stealth didn't get in\" line. Ask about either incident if you want the full story."
    },
    {
        aliases: ["olats", "ola"],
        answer: "Olats is linked with the \"what is Schnitzel doing\" incident, where he caught Schnitzler standing still staring into nothing while the ref gave another teammate a yellow card."
    },
    {
        aliases: ["gazz bryant", "gazz"],
        answer: "Gazz Bryant is named among the short-lived 2026 managers and is also the only man to survive the Hella Bow plane crash of 25, because he sold his tickets to fund Coltan and Jake's GTA holiday."
    },
    {
        aliases: ["dirk"],
        answer: "Dirk is his own person in Bella Ciao lore. He is known for suggesting TP-Link alongside Bloke, which helped solve many players' lag problems."
    },
    {
        aliases: ["bloke"],
        answer: "Bloke is his own person in Bella Ciao lore. He is known for suggesting TP-Link alongside Dirk, which helped solve many players' lag problems."
    },
    {
        aliases: ["gehad"],
        answer: "Gehad said \"that was interesting\" after seeing a player do something with zero composure, skill or accuracy."
    },
    {
        aliases: ["jacob", "h4 jacob"],
        answer: "Jacob is part of the Bean chant lore: H4, Jacob and Stealth said \"Bean, Bean, Bean\" with a big gleaming smile whenever Bean scored a 40-yard powershot volley."
    },
    {
        aliases: ["h4", "h411ison", "harrison"],
        answer: "H4/H411ison is tied to several Bella Ciao moments: the De Ridder 40-yard shot witness list, the Esport registration with Stealth, the \"see you next week buddy\" incident, and the \"Bean, Bean, Bean\" chant with Jacob and Stealth."
    },
    {
        aliases: ["nike tec fleece", "evil bean", "cody rhodes", "butterbean", "lil p", "scrub", "roy keane"],
        answer: "Nike Tec Fleece, Evil Bean, Cody Rhodes, ButterBean, Lil P, Scrub and Roy Keane are named as Boys FC players connected to the Penguin files and the Little Polar Peak lore."
    }
];

const EXTRA_LORE_QUIZ_QUESTIONS = [
    ["Which account of the Craig incident is completely accurate?", ["Craig played an intercepted low through ball down the middle which eventually led to a late equaliser", "Craig misplaced a square pass in midfield which immediately led to a counterattack goal", "Craig was intercepted while dribbling and then received a red card", "Craig failed to track a runner from a corner causing an equaliser"], 0],
    ["What makes the Breast incident stand out in Bella Ciao lore?", ["It was the worst defensive performance Bella Ciao saw in PSL", "It featured the club's largest defeat", "It led directly to Pigeon's promotion", "It was the match where Schnitzler won the Ballon d'Or"], 0],
    ["During the \"What is Schnitzel doing?\" incident, which detail is often forgotten?", ["The referee was actually giving a yellow card to another teammate", "Schnitzler was arguing with the referee", "Schnitzler had disconnected from the match", "Olats was not present"], 0],
    ["Which statement about the \"See you next week buddy\" incident is correct?", ["Stealth said it with confidence before logging on the very next day", "H4 never logged on again", "Stealth left the club immediately afterwards", "It occurred after a VFL final"], 0],
    ["Why is the \"Idk who that was\" incident remembered?", ["Stealth's dad spoke in front of the call and Stealth attempted to play it off", "Stealth's microphone broke", "A random player joined the voice chat", "H411ison pretended not to know Jacob"], 0],
    ["Which statement about the CPL throw incident is most accurate?", ["Pigeon claimed he intentionally let Bella Ciao beat CPL Chelsea", "Bella Ciao were relegated because of it", "CPL Chelsea were banned afterwards", "Schnitzler scored an own goal"], 0],
    ["Which event happened first chronologically?", ["Bow City was liquidated", "Bean and Schnitzler were born", "Hella Bow was created", "Coltan was run over"], 0],
    ["Which person is most closely associated with Little Polar Peak?", ["Penguin", "Gazz Bryant", "Jake", "Magnus"], 0],
    ["Which statement about Gazz Bryant is fully accurate?", ["He survived because he sold his ticket to fund Coltan and Jake's GTA holiday", "He survived after missing the flight due to illness", "He survived because Jake warned him", "He survived but was banned from football"], 0],
    ["What is unusual about Gollum's listed origin?", ["He is described as being from another time", "He claims to be from Germany", "He claims to be from Mexico", "He refuses to reveal it"], 0],
    ["Which quote belongs to Coltan rather than Jake?", ["Here you witless worm", "Hello Coltan haven't seen you in time", "The work is getting too much for me", "Both A and B"], 0],
    ["Why was Cobra's \"I was going to win it so I shot\" line memorable?", ["He ignored the agreed corner tactic", "He scored from 40 yards", "It happened in a final", "He accidentally shot backwards"], 0],
    ["Which answer contains an inaccuracy?", ["Gollum left for the Real Madrid academy", "Schnitzler won the CPL Ballon d'Or", "Bean is from Mexico", "Gollum recorded over 1100 assists"], 0],
    ["Who was informing someone that Schnitzler had failed to load into the game?", ["Craig", "Gehad", "H411ison", "Pigeon"], 0],
    ["What usually prompted Gehad to say \"that was interesting\"?", ["A player showing almost no composure, skill or accuracy", "Tactical brilliance", "A transfer announcement", "A goalkeeper save"], 0],
    ["Which happened closest to the formation of Hella Bow?", ["Bow City being liquidated", "Bean being born", "Coltan being run over", "Bella Ciao being founded"], 0],
    ["Which statement about the 1984 era is correct?", ["Boys FC and Bow City supporter violence damaged the city", "Bow City won the top division", "Hella Bow was renamed", "Coltan was arrested"], 0],
    ["Why was the phrase \"I hate this stadium\" considered notable in the lore?", ["It was viewed as an outrageous statement in the history section", "It was used during a riot", "It caused a points deduction", "It got a player suspended"], 0],
    ["Which person purchased Hella Bow before rebranding it Bella Ciao?", ["Hellash Xiao", "Gofish", "Bellash", "Magnus"], 0],
    ["Which event occurred before Gofish returned as manager?", ["Hellash purchased the club", "Harrison Boy was born", "De Ridder scored his wonder goal", "Boys FC were banned"], 0],
    ["Why is Edward remembered in 2018?", ["He charged Christopher from 40 yards and flattened him", "He scored a hat-trick", "He founded Boys FC", "He survived the plane crash"], 0],
    ["Which witness was actually present for De Ridder's famous goal?", ["H411ison", "Cobra", "Apex", "King"], 0],
    ["What role did the Mexican Genetic Company play?", ["Funding tests involving Bean Alejandro", "Sponsoring Boys FC", "Building Little Polar Peak", "Purchasing Hella Bow"], 0],
    ["Which statement about prime Bella Ciao is accurate?", ["Over 1000 games were played", "Fewer than 200 games were played", "Gollum had already left", "Boys FC did not exist"], 0],
    ["Why did the 3-0 victory over Boys FC matter?", ["Both teams were fighting for Elite Division positioning", "It guaranteed a title", "It was a cup final", "It ended the rivalry"], 0],
    ["Which player is directly connected to the last-minute winner against Boys FC?", ["Bean", "Apex", "King", "Pedri"], 0],
    ["What made the second Boys FC fixture infamous?", ["Jayden Syrett was shot and killed", "Six red cards", "A goalkeeper scored", "The game never finished"], 0],
    ["Which statement about Gollum's departure is correct?", ["He joined the Fein factories of Scunthorpe", "He retired", "He joined Hoffenheim", "He joined Boys FC"], 0],
    ["Which answer contains no error?", ["Bean joined Real Madrid academy", "Bean joined Bayern", "Bean joined Hoffenheim", "Bean joined VFL Newcastle"], 0],
    ["What was Boys FC ultimately found guilty of?", ["Planting the weapons", "Match fixing", "Financial fraud", "Illegal transfers"], 0],
    ["Which signing is specifically described as having no thought behind it?", ["Broyale", "Astrea", "Apex", "Connor"], 0],
    ["Why is Randy Cabbage remembered in the history section?", ["He replaced Gollum", "He founded Boys FC", "He became manager", "He scored 1000 goals"], 0],
    ["Which pair convinced the owners to sign the real Bean and Gollum as wrestlers?", ["Sean and Sollum", "Cobra and King", "Connor and Apex", "Lucas and Ryan"], 0],
    ["What linked Schnitzler and Astrea before joining Bella Ciao?", ["They came from the same club", "They were brothers", "They were managers", "They played for Boys FC"], 0],
    ["Which statement about the merge incident is accurate?", ["Lucas Gaugue became the only merged manager left", "Bella Ciao lost its identity entirely", "Boys FC purchased Bella Ciao", "Pigeon led the merger"], 0],
    ["Why was Lucas Gaugue valued after the merger?", ["He retained a strong understanding with Schnitzler", "He funded the club", "He recruited Pigeon", "He won the Ballon d'Or"], 0],
    ["Which player appears in Bella Ciao's first official 2026 lineup?", ["Iced Out", "Gollum", "Bean", "Amanda"], 0],
    ["What score is associated with ATB's torture of Bella Ciao?", ["1-9", "2-8", "4-9", "0-7"], 0],
    ["Which team became feared in 2026?", ["VFL Newcastle", "CPL Chelsea", "Hella Bow", "Boys FC"], 0],
    ["Which detail links Pigeon to the Penguin files?", ["He was formerly known as Penguin", "He founded Little Polar Peak", "He managed Boys FC", "He wrote the files"], 0],
    ["Which player is most associated with Pigeon's rise to power?", ["Cobra", "Bean", "Gollum", "Amanda"], 0],
    ["What ultimately created the Union of the Rejects?", ["Disagreements surrounding Pigeon's management", "A transfer ban", "Financial collapse", "A failed merger"], 0],
    ["Which player was NOT listed as part of the Union of the Rejects?", ["Astrea", "Ryan", "Cobra", "Ola"], 0],
    ["What did Into The Hole FC eventually become?", ["Sainsbury's FC", "Craydon Cottage FC", "Theatre of Beans FC", "Polar Peak FC"], 0],
    ["Why is Magnus remembered as a hero?", ["He exposed the betrayal plot", "He scored the winning goal", "He replaced Gofish", "He founded Bella Ciao"], 0],
    ["Which statement best summarises the betrayal storyline?", ["Lucas and Ryan attempted to recruit players to their reject club", "Lucas and Ryan were considered loyal heroes", "Cobra and H411ison left together", "Pigeon formed Boys FC"], 0]
];

const SUPPLIED_2026_LORE_QUIZ_QUESTIONS = [
    ["Which unusual weapon did Penguin use against Bean and Gollum during their conflict?", ["Green mist", "Blue mist", "Ice shards", "A steel chair"], 1],
    ["During Penguin's confrontation with Bean and Gollum, what made the attack particularly memorable?", ["He won instantly", "He used blue mist rather than conventional wrestling attacks", "He summoned Boys FC players", "He escaped immediately"], 1],
    ["Which Bella Ciao duo directly opposed Penguin in WWE?", ["Apex and Schnitzler", "Bloke and Dirk", "Bean and Gollum", "Astrea and Connor"], 2],
    ["What is the current known status of Penguin?", ["Managing Boys FC", "Playing in CPL", "Missing", "Retired as Bella Ciao manager"], 2],
    ["What makes Penguin's disappearance particularly strange?", ["He left a note", "Boys FC has not been spotted throughout 2026", "He sold Little Polar Peak", "He joined Bella Ciao"], 1],
    ["Which club has effectively vanished alongside Penguin during 2026?", ["Chippy Chips", "Sainsbury's FC", "Boys FC", "CPL Chelsea"], 2],
    ["Which piece of evidence is considered one of the darkest elements of Penguin Files lore?", ["CPL records", "A video involving an unknown victim", "Match reports", "Stadium footage"], 1],
    ["In Penguin lore, who became suspicious simply because his name contained \"Boy\"?", ["Sean", "Jacob", "Connor", "Pedri"], 1],
    ["Which two figures decided Jacob could potentially be linked to Boys FC?", ["Bean and Gollum", "Apex and Schnitzler", "Gofish and Gary", "Sean and Sollum"], 2],
    ["What happened to HarrisonBoy when he got linked to Boys FC?", ["Suspended", "Exiled to Little Polar Peak", "Dropped into the ocean", "Sent to Boys FC"], 2],
    ["What was the primary evidence used against HarrisonBoy?", ["Messages with Penguin", "The word \"Boy\" in his name", "A Boys FC shirt", "Penguin Files documents"], 1],
    ["Which Bella Ciao figure would most likely argue that HarrisonBoy's punishment was based on extremely weak evidence?", ["Gehad", "Connor", "Almost anyone with common sense", "Penguin"], 2],
    ["Which of these happened AFTER the rise of Boys FC?", ["Bow City liquidation", "HarrisonBoy ocean sacrifice", "Bean being gifted by Mexican investors", "Gollum's birth"], 1],
    ["Penguin's wrestling entrance is most famous for being:", ["Aggressive and hella dark", "Supportive towards Bella Ciao", "Unexpectedly zesty shaking ahh", "Completely silent walk to the ring"], 2],
    ["How did Gofish shut down the Saudi league's attempt to buy Jacob?", ["Shaking ahh like Penguin's WWE entrance", "Scorched earth", "Gave them Gazz on loan instead", "Shot them on the spot"], 2],
    ["A new fan in 2027 after the return of Penguin expects Penguin to enter to terrifying music. What would older fans tell them?", ["Nah buy front row seats for the ass shaking lil bro", "Cover your eyes its gonna get scary...", "Wait until you see Big Bean enter...", "He doesn't have an entrance pal"], 2],
    ["Which phrase best describes Penguin's relationship with Boys FC?", ["Minor connection", "Historic founder/leader figure", "Goalkeeper only", "Referee"], 1],
    ["Which event came first?", ["Penguin going missing", "Boys FC disappearing from 2026 sightings", "Penguin Files becoming infamous", "Penguin's wrestling feud"], 2],
    ["Which organisation became inseparable from Penguin's reputation?", ["Chippy Chips", "CPL Chelsea", "Boys FC", "Born To Lose FC"], 2],
    ["Which location is most associated with Penguin's activities?", ["Craydon Cottage", "Little Polar Peak", "Theatre of Beans", "Weeping Woods"], 1],
    ["If somebody references \"the island\" during Penguin lore discussions, what are they probably referring to?", ["Little Polar Peak", "Villa Park", "Little Saint James", "Bean's island"], 0],
    ["Which figure benefited most from Boys FC's disappearance in 2026?", ["Their biggest rivals, Bella Ciao", "Penguin", "HarrisonBoy", "Roy Keane"], 0],
    ["Which Bella Ciao defender was originally a winger when he joined in December 2025?", ["Cobra", "Dadto4kids", "Iced_Out_Monkeys", "King"], 2],
    ["Which Bella Ciao player is credited with believing in Iced's potential and allowing him to develop into a top CB?", ["Cobra", "Astrea", "Schnitzler", "Connor"], 1],
    ["During the Iced Out Camera Incident, what did fans claim had happened?", ["Iced leaked tactics", "Iced turned his camera on", "Iced exposed Penguin Files", "Iced revealed his microphone setup"], 1],
    ["What made the Iced Out Camera Incident so strange?", ["The camera never actually turned on", "Nobody knew who Iced was", "Leo started the rumour", "Schnitzler admitted it was fake"], 0],
    ["Which player regularly slandered Iced for not having a microphone?", ["Gehad", "Astrea", "Leo", "Connor"], 2],
    ["Which Bella Ciao teammate is most closely associated with helping Iced reach top-CB level?", ["Astrea", "King", "Pedri", "Connor"], 0],
    ["What specific aspect of Iced's game does Schnitzler appreciate most?", ["Tackling", "Pace", "Knock-ons from corners", "Leadership"], 2],
    ["Which pairing best represents opposite opinions on Iced having a mic?", ["Connor and Gehad", "Leo and Astrea", "Apex and Bean", "King and Nicole"], 1],
    ["Which nationality is Iced_Out_Monkeys?", ["English", "Dutch", "German", "Mexican"], 2],
    ["Which statement about Iced's microphone situation is accurate?", ["He uses push-to-talk", "He has a broken microphone", "He has no microphone", "He only speaks in matches"], 2],
    ["A Bella Ciao player sends a cheeky message during a tense match. Which player is most likely responsible?", ["King", "Iced_Out_Monkeys", "Pedri", "Dadto4kids"], 1],
    ["Which player once referred to Iced as \"Booty Buns\"?", ["Leo", "Astrea", "Connor", "Schnitzler"], 3],
    ["Why is the \"Booty Buns\" comment considered unfair by some Bella Ciao fans?", ["Iced had scored", "Iced was captain", "Schnitzler didn't see the 10/10 version of Iced that day", "It happened after a trophy win"], 2],
    ["Since joining in December 2025, what has Iced witnessed firsthand?", ["Bow City's liquidation", "Bella Ciao's growth as a club", "Bean joining from Mexico", "Gollum's retirement season"], 1],
    ["Following the Camera Incident, how long did fans claim Iced mysteriously disappeared for?", ["One day", "Three days", "About a week", "A month"], 2],
    ["Which statement best describes Iced's positional journey?", ["Striker to goalkeeper", "Winger to centre-back", "CDM to winger", "Full-back to striker"], 1],
    ["Which of these incidents is directly associated with Iced?", ["Chingaling Incident", "Craig Through Ball Incident", "Iced Out Camera Incident", "CPL Throw Incident"], 2],
    ["If Schnitzler scores from a flick-on at a corner, which teammate is most likely involved?", ["Connor", "Iced_Out_Monkeys", "King", "Pedri"], 1],
    ["Which criticism of Iced appears most often throughout Bella Ciao?", ["Pace", "Finishing", "Lack of a microphone", "His looks"], 2],
    ["Which statement about the Camera Incident is actually true?", ["Iced turned his camera on", "Fans pretended Iced turned his camera on", "The camera stayed on for an hour", "Leo recorded it"], 1],
    ["During the infamous Boys FC shooting incident, where were Bella Ciao players forced to hide while chaos unfolded?", ["The dugout", "Stadium tunnels", "Lockers", "Referee room"], 2],
    ["Which player's off-ball challenge is blamed for sending Ice Wizard into a dark phase lasting roughly a month?", ["Apex", "Bean", "Gollum", "Schnitzler"], 1],
    ["Which missed chance is often mentioned alongside discussions about Bella Ciao failing to reach Elite Division?", ["Sean penalty", "Ice Wizard chip shot", "Schnitzler header", "Connor finesse"], 1],
    ["Lucas Gough arrived at Bella Ciao alongside which figure during the Merge Incident?", ["Connor", "LT Hutchy", "Pigeon", "Gehad"], 1],
    ["Which style of pass became so associated with Lucas that fans named it after him?", ["Fyzo Cross", "Craig Ball", "Gough Ball", "Apex Pass"], 2],
    ["Which striker was usually on the receiving end of Lucas Gough's trademark deliveries?", ["Bean", "Apex", "Schnitzler", "Sean"], 2],
    ["When Bella Ciao played poorly, Lucas often claimed what had happened?", ["Referee corruption", "Server maintenance", "Power cuts and disconnects", "Controller drift"], 2],
    ["What was unusual about Lucas' power-cut stories?", ["They happened every match", "They only seemed to exist when Bella Ciao played badly", "They lasted months", "They were proven true"], 1],
    ["Which club did Lucas leave for before attempting to recruit Bella Ciao players?", ["Boys FC", "Chippy Chips", "Sainsbury's FC", "CPL Chelsea"], 2],
    ["Why is Lucas currently on loan to Born To Lose FC according to Bella Ciao lore?", ["Injury recovery", "Tactical education", "To raise his level back up", "Contract dispute"], 2],
    ["Which major decision is Lucas forever linked with?", ["Signing Connor", "Leaving CPL Season 1", "Getting caught in the pigeon files", "Replacing Gehad"], 1],
    ["Before switching hairstyles later in life, what did Gollum famously wear?", ["Bandana", "Durag", "Strap on", "Beanie"], 1],
    ["Which Bella Ciao legend continued the durag tradition most prominently?", ["Bean", "Magnus", "Gehad", "Chunkz"], 0],
    ["Which height combination is correct?", ["Bean 6'2, Gollum 6'7", "Bean 6'7, Gollum 6'2", "Bean 6'5, Gollum 6'5", "Bean 6'2, Gollum 6'4"], 1],
    ["Noodle Hair Bean was described as:", ["Bean's cousin", "Bean's son", "Gollum's son", "Sean's brother"], 1],
    ["How tall was Noodle Hair Bean?", ["5'11", "6'0", "6'4", "6'7"], 2],
    ["Fans once massively overrated Bean's pace. What range was eventually revealed?", ["68-73", "74-79", "82-87", "90-95"], 1],
    ["Which moment best represents Bean producing something ridiculous but not quite pulling it off?", ["Missed penalty", "Bicycle-kick powershot", "Own goal", "Missed one on one to make it 6 goals in 10 minutes"], 1],
    ["What actually happened to Bean's bicycle-kick powershot?", ["Saved", "Top corner", "Hit the bar", "Went wide"], 2],
    ["During Bean's spell in Madrid, he played a famous 3-3 draw against who?", ["Ronaldo", "Neymar", "Messi", "Mbappe"], 2],
    ["Why is the Madrid match remembered?", ["Bean scored once", "Messi scored once", "Both scored hat-tricks", "Bean got sent off"], 2],
    ["Which Bella Ciao striker is known for calling out teammates who joke around instead of focusing on winning?", ["Sean", "Apex", "Connor", "Gehad"], 1],
    ["Which former club was Apex associated with before Bella Ciao?", ["Boys FC", "Chippy Chips", "Sainsbury's FC", "Into The Hole FC"], 1],
    ["Had Apex remained at Chippy Chips, Bella Ciao could have faced him in which VPC season?", ["Season 6", "Season 7", "Season 8", "Season 9"], 2],
    ["Which VPC individual award did Apex win?", ["Ballon d'Or", "Golden Glove", "Golden Boot", "Playmaker Award"], 2],
    ["Which major trophy accompanied Apex' VPC golden boot?", ["Elite Division", "UCL", "CPL", "ATB"], 1],
    ["During the 23/24 season, which player outscored Edward, Frankie and Ice Wizard?", ["Cobra", "Moretti", "Christopher", "King"], 1],
    ["Which Hella Bow/Bella Ciao figure delivered the famous Clash Royale promo on Joe?", ["Connor", "Gazz Bryant", "Pigeon", "Craig"], 1],
    ["According to Gazz whose feelings was Joe supposedly hurting?", ["Schnitzler's", "Bean's", "Harrison's", "Apex's"], 2],
    ["What game was Joe accused of choosing over Xbox?", ["Fortnite", "Clash Royale", "Rocket League", "COD"], 1],
    ["Which game was specifically named as not being \"good enough\" anymore?", ["FIFA", "Ark", "COD", "GTA"], 2],
    ["What objects were specifically mentioned in Gazz Bryant's challenge?", ["Guns, bats and chains", "Tables, ladders and chairs", "Cars and bikes", "Goals and nets"], 1],
    ["How did the Clash Royale promo ultimately conclude?", ["See you next week.", "Interesting.", "LET'S DO THIS!", "Big snitch."], 2]
];

const VPC_SEASON_7_RESULTS = [
    ["21 January 2026", "MidTierMandem", "1-1", "draw"],
    ["21 January 2026", "VPC TNS", "0-1", "loss"],
    ["21 January 2026", "Bald Ballers FC", "1-0", "win"],
    ["28 January 2026", "GattusoBall", "2-2", "draw"],
    ["28 January 2026", "Sids Neck FC", "4-0", "win"],
    ["28 January 2026", "Athletico London", "3-2", "win"],
    ["4 February 2026", "Astar Ballerz", "1-0", "win"],
    ["4 February 2026", "Royal Arms", "0-3", "loss"],
    ["4 February 2026", "LoveOfTheGame FC", "0-2", "loss"],
    ["11 February 2026", "Gunshot FC", "1-3", "loss"],
    ["11 February 2026", "DLF x CLF", "1-0", "win"],
    ["11 February 2026", "VPC Millwall", "1-0", "win"],
    ["18 February 2026", "Vincolo eSports", "1-0", "win"],
    ["18 February 2026", "ChippyChips CF", "2-1", "win"],
    ["18 February 2026", "Dusty Dynamos FC", "0-2", "loss"],
    ["25 February 2026", "MidTierMandem", "1-0", "win"],
    ["25 February 2026", "VPC TNS", "2-2", "draw"],
    ["25 February 2026", "Bald Ballers FC", "1-0", "win"],
    ["4 March 2026", "GattusoBall", "1-0", "win"],
    ["4 March 2026", "Sids Neck FC", "1-2", "loss"],
    ["4 March 2026", "Athletico London", "2-1", "win"],
    ["11 March 2026", "Astar Ballerz", "2-2", "draw"],
    ["11 March 2026", "Royal Arms", "3-3", "draw"],
    ["11 March 2026", "LoveOfTheGame FC", "2-5", "loss"],
    ["18 March 2026", "Gunshot FC", "2-2", "draw"],
    ["18 March 2026", "DLF x CLF", "6-2", "win"],
    ["18 March 2026", "VPC Millwall", "2-1", "win"],
    ["25 March 2026", "Vincolo eSports", "1-0", "win"],
    ["25 March 2026", "ChippyChips CF", "1-2", "loss"],
    ["25 March 2026", "Dusty Dynamos FC", "5-2", "win"]
];

const VPC_SEASON_7_TABLE = [
    ["Gunshot FC", 30, 21, 5, 4, 61, 21, 40, 67],
    ["ChippyChips CF", 30, 21, 5, 4, 40, 13, 27, 67],
    ["Dusty Dynamos", 30, 19, 6, 5, 43, 19, 24, 62],
    ["VPC Millwall", 30, 17, 7, 6, 38, 25, 13, 57],
    ["GattusoBall", 30, 17, 8, 5, 43, 27, 16, 56],
    ["Bella Ciao FC", 30, 16, 8, 6, 50, 41, 9, 54],
    ["LoveOfTheGame FC", 30, 17, 10, 3, 37, 32, 5, 54],
    ["Royal Arms", 30, 15, 11, 4, 33, 26, 7, 49],
    ["Sids Neck FC", 30, 14, 12, 4, 29, 30, -1, 46],
    ["Astar Ballerz", 30, 11, 13, 6, 27, 27, 0, 39],
    ["VPC TNS", 30, 9, 17, 4, 24, 36, -12, 31],
    ["DLF x CLF", 30, 8, 18, 4, 26, 61, -35, 28],
    ["Athletico London", 30, 7, 18, 5, 19, 45, -26, 26],
    ["MidTierMandem", 30, 7, 20, 3, 15, 27, -12, 24],
    ["Vincolo eSports", 30, 6, 20, 4, 14, 38, -24, 22],
    ["Bald Ballers FC", 30, 0, 27, 3, 3, 34, -31, 3]
];

const VPC_SEASON_7_QUIZ_QUESTIONS = [
    ["Where did Bella Ciao FC finish in VPC Season 7?", ["6th", "4th", "7th", "10th"], 0],
    ["How many points did Bella Ciao FC earn in VPC Season 7?", ["54", "67", "57", "49"], 0],
    ["What was Bella Ciao FC's VPC Season 7 league record?", ["16 wins, 8 losses and 6 draws", "16 wins, 6 losses and 8 draws", "17 wins, 8 losses and 5 draws", "15 wins, 8 losses and 7 draws"], 0],
    ["How many goals did Bella Ciao FC score in VPC Season 7?", ["50", "41", "54", "61"], 0],
    ["How many goals did Bella Ciao FC concede in VPC Season 7?", ["41", "50", "32", "27"], 0],
    ["What was Bella Ciao FC's goal difference in VPC Season 7?", ["+9", "+5", "+13", "-1"], 0],
    ["Which VPC Season 7 club finished on the same points as Bella Ciao FC?", ["LoveOfTheGame FC", "GattusoBall", "Royal Arms", "VPC Millwall"], 0],
    ["Who won VPC Season 7?", ["Gunshot FC", "ChippyChips CF", "Dusty Dynamos", "Bella Ciao FC"], 0],
    ["Which team did Bella Ciao FC beat 6-2 in VPC Season 7?", ["DLF x CLF", "Dusty Dynamos FC", "Sids Neck FC", "VPC Millwall"], 0],
    ["Which team did Bella Ciao FC beat 5-2 in their final VPC Season 7 match?", ["Dusty Dynamos FC", "LoveOfTheGame FC", "Athletico London", "DLF x CLF"], 0],
    ["Which team did Bella Ciao FC beat 4-0 in VPC Season 7?", ["Sids Neck FC", "Bald Ballers FC", "Vincolo eSports", "Astar Ballerz"], 0],
    ["Which VPC Season 7 opponent did Bella Ciao FC beat twice by 1-0?", ["Bald Ballers FC", "MidTierMandem", "GattusoBall", "Astar Ballerz"], 0],
    ["Which VPC Season 7 opponent did Bella Ciao FC beat twice, 1-0 and 2-1?", ["VPC Millwall", "ChippyChips CF", "VPC TNS", "Royal Arms"], 0],
    ["Which VPC Season 7 opponent took six points from Bella Ciao FC?", ["LoveOfTheGame FC", "Gunshot FC", "Royal Arms", "Sids Neck FC"], 0],
    ["What was Bella Ciao FC's VPC Season 7 result away to Royal Arms?", ["3-3 draw", "3-0 win", "3-0 loss", "2-2 draw"], 0],
    ["What was Bella Ciao FC's VPC Season 7 result away to Gunshot FC?", ["2-2 draw", "3-1 win", "3-1 loss", "1-0 win"], 0],
    ["What was Bella Ciao FC's VPC Season 7 result away to Sids Neck FC?", ["4-0 win", "2-1 win", "2-1 loss", "1-1 draw"], 0],
    ["What was Bella Ciao FC's VPC Season 7 result at home to LoveOfTheGame FC?", ["2-5 loss", "5-2 win", "2-2 draw", "2-0 win"], 0],
    ["What was Bella Ciao FC's final VPC Season 7 result?", ["5-2 win over Dusty Dynamos FC", "2-1 loss to ChippyChips CF", "6-2 win over DLF x CLF", "1-0 win over Vincolo eSports"], 0],
    ["How many VPC Season 7 league matches did Bella Ciao FC play?", ["30", "28", "32", "34"], 0]
];

const CURRENT_ROSTER_QUIZ_QUESTIONS = [
    ["In early 2026, which current roster player wore shirt number 69?", ["Gehad", "Connor", "M10", "Lynxsy"], 0],
    ["In early 2026, which player's description was linked to Kanye's \"room full of winners\" tweet?", ["Sifer", "Pedri", "Connor", "DontGoToTheDark"], 0],
    ["During the first recorded lineup of 2026, who was positioned directly behind Schnitzler?", ["OMT", "Ryan", "Astrea", "Up The Tigers"], 0],
    ["In early 2026, which pairing consisted of two current main-position defenders?", ["Cobra and King", "King and Pedri", "Cobra and Gehad", "King and Connor"], 0],
    ["In early 2026, which player could NOT be included in a midfield built entirely from CDMs?", ["Gehad", "Pedri", "H411ison", "Sifer"], 0],
    ["In early 2026, which player had the highest shirt number on the website roster?", ["Nicole", "Pigeon", "Connor", "Gehad"], 0],
    ["In early 2026, which player shared a nationality with Schnitzler?", ["Nicole", "Connor", "Pedri", "Lynxsy"], 0],
    ["Which answer correctly completes the first recorded 2026 defence?", ["Gullit, Cobra, Lucas and Alan", "Cobra, King, Lucas and Alan", "Gullit, King, Lucas and Alan", "Cobra, Dadto4kids, Alan and Lucas"], 0],
    ["In early 2026, which midfielder had the lowest shirt number?", ["Pedri", "Sifer", "H411ison", "M10"], 0],
    ["Which player was NOT in the first recorded lineup of 2026?", ["Connor", "Ryan", "OMT", "Astrea"], 0],
    ["In early 2026, what was Gehad's website description?", ["Interesting Playmaker", "Quick Feet", "Wide Creator", "Pass Sprayer"], 0],
    ["In early 2026, which defender wore number 44?", ["Iced", "Cobra", "King", "Dadto4kids"], 0],
    ["Which Bella Ciao player was both German and a goalkeeper in early 2026?", ["Nicole", "Pigeon", "Gehad", "Schnitzler"], 0],
    ["In the first recorded lineup of 2026, which pair occupied the wide attacking roles?", ["Ryan and Iced Out", "Ryan and OMT", "OMT and Iced Out", "Astrea and Ryan"], 0],
    ["Which answer contains only current website midfielders from early 2026?", ["Pedri, Gehad and Connor", "Pedri, King and Connor", "Gehad, Cobra and Connor", "Connor, Nicole and Pedri"], 0],
    ["In early 2026, which player was described as \"Comes and goes, knows and grows\"?", ["Pigeon", "Nicole", "King", "Cobra"], 0],
    ["In early 2026, which defender wore the smallest shirt number?", ["Dadto4kids", "Cobra", "King", "Iced"], 0],
    ["Which player had the website description \"Wide Creator\" in early 2026?", ["Connor", "Lynxsy", "Gehad", "M10"], 0],
    ["Which player was positioned closest to Ryan in the first recorded lineup of 2026?", ["OMT", "Iced Out", "Lucas", "Pigeon"], 0],
    ["Which current roster player shared Gehad's nationality in early 2026?", ["Nicole", "Connor", "Lynxsy", "H411ison"], 0],
    ["Which answer correctly lists both current website goalkeepers from early 2026?", ["Nicole and Pigeon", "Nicole and Emim", "Nicole and Schnitzler", "Pigeon and Christopher"], 0],
    ["Which early-2026 player had the website description \"Gets the job done\"?", ["King", "Cobra", "Iced", "Dadto4kids"], 0],
    ["Who does the nickname \"OurMightyCog\" refer to?", ["H411ison", "Pedri", "Sifer", "Big Snitch"], 0],
    ["In early 2026, which midfielder had the highest shirt number?", ["Gehad", "Connor", "Lynxsy", "M10"], 0],
    ["Which current early-2026 player was both a midfielder and German?", ["Gehad", "Connor", "Pedri", "H411ison"], 0],
    ["Which player had the website description \"Technical Ball Carrier\" in early 2026?", ["Lynxsy", "Connor", "Pedri", "Gehad"], 0],
    ["Who was the striker in the first recorded 2026 lineup?", ["Schnitzler", "Viking", "Apex", "Bean"], 0],
    ["Which files and location appeared in a Bella Ciao newspaper soon after Jayden's death?", ["Penguin files and Little Polar Peak", "Epstein files and Little Saint James", "Pigeon files and Micro Cordian Land", "Apex files and Anger and Despair Land"], 0],
    ["In early 2026, which player wore shirt number 77?", ["Connor", "Lynxsy", "M10", "Gehad"], 0],
    ["Which player could play both LM and CDM according to the early-2026 website?", ["DontGoToTheDark", "Connor", "Pedri", "Gehad"], 0],
    ["Which player had the website description \"Quick Feet\" in early 2026?", ["M10", "Gehad", "Connor", "Lynxsy"], 0],
    ["Which pair played CDM in the first recorded lineup of 2026?", ["Astrea and Up The Tigers", "Dirk and Astrea", "Ryan and Astrea", "Schnitzler and Astrea"], 0],
    ["In early 2026, which player wore shirt number 52?", ["DontGoToTheDark", "Pedri", "Sifer", "Connor"], 0],
    ["Which players started directly behind OMT in the first recorded lineup of 2026?", ["Astrea and Up The Tigers", "Astrea and Ryan", "Up The Tigers and Ryan", "Ryan and Iced Out"], 0],
    ["Which defender had the website description \"Defensive Leader\" in early 2026?", ["Cobra", "King", "Dadto4kids", "Iced"], 0],
    ["Which player was NOT listed as a midfielder on the early-2026 website?", ["Apex", "Connor", "Gehad", "M10"], 0],
    ["In early 2026, which player wore shirt number 8?", ["H411ison", "Pedri", "Sifer", "Gollum"], 0],
    ["In early 2026, which player wore shirt number 4?", ["Pedri", "King", "M10", "Cobra"], 0],
    ["Which current roster player was Dutch in early 2026?", ["DontGoToTheDark", "Connor", "Gehad", "Lynxsy"], 0],
    ["Who said \"I was going to win it so I shot\"?", ["Cobra", "Craig", "Gehad", "H411ison"], 0],
    ["Who said \"That was interesting\" after a disasterclass?", ["Gehad", "H411ison", "Craig", "Stealth"], 0],
    ["Who sent the message \"We need to talk\"?", ["Magnus", "Lucas", "Ryan", "Connor"], 0],
    ["Who was known as Viking?", ["Magnus", "Lucas", "Connor", "Pigeon"], 0],
    ["Which player was recruited by Pigeon and praised for loyalty?", ["Cobra", "Ryan", "Lucas", "Connor"], 0],
    ["Which incident involved somebody performing crosses so bad that the style was named after them?", ["Fyzo Cross", "Sebastian Slip", "Weeping Woods", "Ahhh I Gerri"], 0],
    ["Which incident involved a young opponent repeatedly saying \"big bean\" while being battered?", ["Big Bean Incident", "What Tribe Incident", "Through Ball Incident", "Weeping Woods"], 0]
];

const EXPANDED_CLUB_QUIZ_QUESTIONS = [
    ["How old was Gofish when he bought Bow City and renamed it Hella Bow?", ["24", "18", "35", "44"], 0],
    ["Which club identity came directly before Bella Ciao?", ["Hella Bow", "Bow City", "Boys FC", "Into the Hole FC"], 0],
    ["Which sequence correctly follows the club's historic identities?", ["Bow City, Hella Bow, Bella Ciao", "Hella Bow, Bow City, Bella Ciao", "Bella Ciao, Hella Bow, Bow City", "Bow City, Bella Ciao, Hella Bow"], 0],
    ["What happened one year after Bow City was formed?", ["Caprice and Sniffler helped it reach the top division", "It was liquidated", "Gofish bought it", "It became Bella Ciao"], 0],
    ["What were city funds diverted toward during the 1984 supporter violence?", ["Repairs", "A new stadium", "Player wages", "The Mexican laboratory"], 0],
    ["Which two early Bow City figures retired after the club's liquidation?", ["Caprice and Sniffler", "Gofish and Hellash", "Bean and Gollum", "Jake and Coltan"], 0],
    ["Who owned Hella Bow immediately before Hellash Xiao?", ["Gofish", "Pigeon", "Bellash", "Gary"], 0],
    ["What links the names Bellash and Bella Ciao?", ["Bella Ciao was renamed out of Hellash Xiao's love for his son Bellash", "Bellash founded Bow City", "Bellash managed Boys FC", "Bellash designed the Mercedes Benz stadium"], 0],
    ["Which event happened in the year after Bella Ciao's 2012 rebrand?", ["Gofish returned and Hellash Bow purchased the Mercedes Benz stadium", "Bow City was liquidated", "Boys FC rose to Bella Ciao's division", "Stealth registered the Esport team"], 0],
    ["Which three people witnessed De Ridder's famous 2022 shot?", ["Eatmyshorts, Stelthsmokylake and H411ison", "Pigeon, Cobra and Ryan", "Gofish, Gary and Lucas", "Bean, Gollum and Schnitzler"], 0],
    ["What role did Johny Sinns and Kanye West share in 2023?", ["Holding midfielders", "Goalkeepers", "Strikers", "Centre-backs"], 0],
    ["Which 2023 loan superstar recorded 281 G/A in the summary?", ["Johny Sinns", "Kanye West", "Gollum", "Bean Alejandro"], 0],
    ["Which 2023 loan superstar recorded 267 G/A in the summary?", ["Kanye West", "Johny Sinns", "Schnitzler", "Pigeon"], 0],
    ["What connected Bean and Gollum to Bella Ciao's Mexican investment?", ["The laboratory funded and gave them to the club", "They purchased the laboratory", "They moved the investment to Madrid", "They managed its football team"], 0],
    ["Which prime-era player was signed for 25,000,000?", ["Gollum", "Bean Alejandro", "Johny Sinns", "Schnitzler"], 0],
    ["What milestone did prime Bella Ciao exceed in 2023-24?", ["More than 1000 games played", "More than 100 trophies", "More than 100 stadiums", "More than 100 managers"], 0],
    ["Who ran Boys FC during their December 2023 rise?", ["Penguin and ButterBean", "Pigeon and Cobra", "Gofish and Gary", "Lucas and Ryan"], 0],
    ["What did Boys FC supporters whisper after losing 3-0 to Bella Ciao?", ["The date of the next fixture", "The name of a new manager", "The score of the ATB final", "The location of the academy"], 0],
    ["What happened immediately before the Jayden Syrett tragedy in the 2024 rematch?", ["Bean scored a last-minute winner", "Pigeon was demoted", "Gollum left for Scunthorpe", "Boys FC were banned"], 0],
    ["Which player reacted to the Jayden incident by eating the Boys FC manager?", ["Gollum", "Bean Alejandro", "Shane Syrett", "Pigeon"], 0],
    ["About how many league games accompanied Gollum's roughly 1100 assists?", ["800", "100", "1500", "25"], 0],
    ["Which player left for the Fein factories of Scunthorpe?", ["Gollum", "Bean Alejandro", "Schnitzler", "Johny Sinns"], 0],
    ["Which player left for Real Madrid academy with roughly 1500 goals?", ["Bean Alejandro", "Gollum", "Kanye West", "Cobra"], 0],
    ["What were Boys FC limited to after being banned from major leagues?", ["Unofficial cameos", "Academy matches", "Only cup finals", "Only VPC matches"], 0],
    ["Who trial-managed Bella Ciao through August going into 24/25?", ["Gary/Garry", "Pigeon", "Lucas Gaugue", "Gazz Bryant"], 0],
    ["What happened to the Mexican investment during the dark 24/25 spell?", ["It moved out to Madrid", "It bought Boys FC", "It funded Little Polar Peak", "It purchased the Mercedes Benz stadium"], 0],
    ["Which former failed academy player replaced Gollum?", ["Randy Cabbage", "Broyale", "Astrea", "Cobra"], 0],
    ["What did Sean and Sollum persuade the owners to do?", ["Sign the real Bean and Gollum as wrestlers", "Bring back Boys FC", "Sell the Mercedes Benz stadium", "Rename Bella Ciao Bow City"], 0],
    ["Which player was described as Sniffer Sebust/TCL's son?", ["Schnitzler", "Astrea", "Lucas Gaugue", "Bean Alejandro"], 0],
    ["Which player came from Ark before later arriving with Schnitzler from FC Hoffenheim?", ["Astrea", "Ryan", "Cobra", "OMT"], 0],
    ["What did Bella Ciao create during its end-of-2025 identity changes?", ["Its own brand and a new badge", "A new rival club", "A Mexican laboratory", "Little Polar Peak"], 0],
    ["What did the 2025 merge agreement promise to preserve?", ["Bella Ciao's identity", "Boys FC's manager", "The Mexican investment", "Bow City's old squad"], 0],
    ["Why could the merge incident's new owners not satisfy the fans?", ["They could not match Gofish's tactical genius", "They refused to sign a goalkeeper", "They sold the new badge", "They banned the academy"], 0],
    ["Who remained as the only merged manager?", ["Lucas Gaugue", "Gofish", "Pigeon", "Gary"], 0],
    ["Which partnership was viewed as a future contender among Bella Ciao's best?", ["Lucas Gaugue and Schnitzler", "Pigeon and Cobra", "Jake and Coltan", "Sean and Sollum"], 0],
    ["Who occupied the full-back positions in the first official 2026 lineup?", ["Alan and Lucas", "Gullit and Cobra", "Astrea and Up the Tigers", "Ryan and Iced Out"], 0],
    ["Who occupied the two CDM positions in the first official 2026 lineup?", ["Astrea and Up the Tigers", "Lucas and Alan", "Gullit and Cobra", "Ryan and OMT"], 0],
    ["Which player was LAM in the first official 2026 lineup?", ["Iced Out", "Ryan", "OMT", "Astrea"], 0],
    ["Which player was RAM in the first official 2026 lineup?", ["Ryan", "Iced Out", "OMT", "Schnitzler"], 0],
    ["Before becoming manager, how did Pigeon contribute behind the scenes?", ["He helped with team sheets and back-room management", "He designed the new badge", "He ran the Mexican laboratory", "He bought the stadium"], 0],
    ["Which role did Pigeon play while winning games during his rise to power?", ["Goalkeeper", "Striker", "Centre-back", "CAM"], 0],
    ["Which player links the names Penguin and Pigeon?", ["The same 2026 drama figure", "Two different Boys FC managers", "Two Bella Ciao strikers", "Two Bow City founders"], 0],
    ["Which Pigeon-linked incident involved repeatedly rushing out in goal?", ["The Breast incident", "The Craig through ball incident", "The Fyzo Cross incident", "The Sebastian Slip incident"], 0],
    ["Which Pigeon-linked incident involved a claim that he deliberately let Bella Ciao win?", ["The CPL throw incident", "The Breast incident", "The What Tribe incident", "The merge incident"], 0],
    ["What does the lore say was really behind Pigeon's CPL Chelsea performance?", ["He was playing badly and lagging", "He had been paid to throw", "He was protesting the badge", "He was playing striker"], 0],
    ["What happened to Pigeon after the 2026 management drama?", ["He was demoted", "He bought Boys FC", "He became the club hero", "He joined Real Madrid academy"], 0],
    ["Which group formed around Ryan, Ola, Cobra and Lucas after Pigeon became manager?", ["The Union of the Rejects", "The Mexican laboratory", "The Hella Bow academy", "The Penguin files"], 0],
    ["Which two names did the Rejects' club use?", ["Into the Hole FC and Sainsbury's FC", "Bow City and Hella Bow", "Boys FC and VPC Millwall", "CPL Chelsea and VFL Newcastle"], 0],
    ["What made Magnus a hero during the 2026 drama?", ["He helped expose the betrayal plot", "He became Boys FC manager", "He scored against VFL Newcastle", "He won the CPL Ballon d'Or"], 0],
    ["What phrase did Magnus send Gofish at the peak of the drama?", ["We need to talk", "That was interesting", "What tribe?", "See you next week buddy"], 0],
    ["Which pair messaged people to join a reject team?", ["Lucas Gauge and Ryan", "Pigeon and Cobra", "Stealth and Harrison", "Sean and Sollum"], 0],
    ["Why was Gofish suspended for a year?", ["He criticised how the league handled the Jayden incident", "He formed the Union of the Rejects", "He threw against CPL Chelsea", "He failed a medical"], 0],
    ["What were Stealth's and Harrison's former roles before registering the Esport team?", ["Youth team manager and physiotherapist", "Striker and goalkeeper", "Owner and director", "Scout and referee"], 0],
    ["Which two figures shared the 2025 club POTY honour?", ["Sniffer Subust/TCL and Maurice Caprice", "Pigeon and Cobra", "Bean and Gollum", "Schnitzler and Astrea"], 0],
    ["What squad-building principle did Bella Ciao target in 2026?", ["Merit over favouritism", "Favouritism over form", "Only historic players", "Only new signings"], 0],
    ["Which two final defeats shaped the 2026 comeback message?", ["The VFL Playoff final and ATB final", "The World Cup final and CPL final", "The VPC final and Boys FC final", "The Hella Bow final and PSL final"], 0],
    ["Which incident involved a late equaliser after an intercepted central through ball?", ["Craig Through Ball", "Breast", "CPL Throw", "Fyzo Cross"], 0],
    ["Which person suggested TP-Link alongside Dirk?", ["Bloke", "Pigeon", "Craig", "Magnus"], 0],
    ["What unusual weight is attached to Gollum in the lore?", ["221 pounds", "144 pounds", "25 pounds", "800 pounds"], 0],
    ["Which location is associated with the Penguin files?", ["Little Polar Peak", "Scunthorpe", "Mercedes Benz stadium", "Real Madrid academy"], 0],
    ["Which VPC Season 7 match was Bella Ciao's highest-scoring league win?", ["6-2 against DLF x CLF", "5-2 against Dusty Dynamos FC", "4-0 against Sids Neck FC", "3-2 against Athletico London"], 0],
    ["Which VPC Season 7 opponent beat Bella Ciao 1-0 before drawing the return match 2-2?", ["VPC TNS", "MidTierMandem", "Royal Arms", "Gunshot FC"], 0],
    ["Which VPC Season 7 opponent did Bella Ciao beat 1-0 in both meetings?", ["Bald Ballers FC", "Vincolo eSports", "GattusoBall", "MidTierMandem"], 0],
    ["Which VPC Season 7 opponent did Bella Ciao beat 4-0 before losing the return fixture 2-1?", ["Sids Neck FC", "Dusty Dynamos FC", "LoveOfTheGame FC", "ChippyChips CF"], 0],
    ["Which VPC Season 7 opponent beat Bella Ciao 3-0 before a 3-3 return draw?", ["Royal Arms", "Gunshot FC", "LoveOfTheGame FC", "VPC Millwall"], 0],
    ["Which VPC Season 7 opponent drew 2-2 with Bella Ciao before losing the return match 1-0?", ["GattusoBall", "Astar Ballerz", "VPC TNS", "Gunshot FC"], 0],
    ["Which VPC Season 7 opponent did Bella Ciao beat in both meetings by 1-0 and 2-1?", ["VPC Millwall", "ChippyChips CF", "Athletico London", "DLF x CLF"], 0],
    ["How many VPC Season 7 clubs finished on 54 points?", ["Two", "One", "Three", "Four"], 0],
    ["Which club shared 54 points with Bella Ciao in VPC Season 7?", ["LoveOfTheGame FC", "GattusoBall", "Royal Arms", "VPC TNS"], 0]
];

function deduplicateQuizQuestions(questions) {
    const seen = new Set();

    return questions.filter(question => {
        const key =
            String(question?.[0] || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .trim();

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

const CLUB_LORE_QUIZ_QUESTIONS = deduplicateQuizQuestions([
    ...BASE_QUIZ_QUESTIONS,
    ...CLUB_LORE_ITEMS.flatMap(item => item.quiz || []),
    ...EXTRA_LORE_QUIZ_QUESTIONS,
    ...SUPPLIED_2026_LORE_QUIZ_QUESTIONS,
    ...VPC_SEASON_7_QUIZ_QUESTIONS,
    ...CURRENT_ROSTER_QUIZ_QUESTIONS,
    ...EXPANDED_CLUB_QUIZ_QUESTIONS
]);

const STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "did",
    "do",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "how",
    "in",
    "is",
    "it",
    "of",
    "our",
    "on",
    "or",
    "tell",
    "the",
    "their",
    "there",
    "this",
    "to",
    "was",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with"
]);

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/([a-z])['’]s\b/g, "$1")
        .replace(/[’‘]/g, "'")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9'+/\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function compact(value) {
    return normalize(value)
        .replace(/[^a-z0-9]/g, "");
}

function tokenize(value) {
    return normalize(value)
        .split(/\s+/)
        .filter(token =>
            token.length > 2 &&
            !STOPWORDS.has(token)
        );
}

function aliasMatches(text, compactText, alias) {
    const normalized =
        normalize(alias);
    const compactAlias =
        compact(alias);

    if (!normalized) {
        return false;
    }

    if (normalized.length === 1) {
        return text.split(" ").includes(normalized);
    }

    return text.includes(normalized) ||
        (
            compactAlias.length > 2 &&
            compactText.includes(compactAlias)
        );
}

function isGenericAlias(alias) {
    return /^\d+$/.test(String(alias || "").replace(/[^0-9]/g, "")) ||
        /^(season|year|born|birth|formed|created|founded|signed|sign|lineup|manager|manage|returns|came back|goals|assists|incident)$/i
            .test(String(alias || "").trim());
}

function hasHistoryCue(text) {
    return /\b(history|lore|origin|origins|timeline|backstory|story|started|beginning|began|formed|founded)\b/
        .test(text);
}

function hasClubCue(text) {
    return /\b(bella ciao|bella ciao fc|bella|the club|club|our club|team|bow city|hella bow)\b/
        .test(text);
}

function hasPersonCue(text) {
    return /\b(who is|who was|who are|where is|where was|where's|tell me about|what do you know about|what's the story with|what is the story with|what happened with|what happened to|story behind|explain|describe|profile|about)\b/
        .test(text);
}

function startsWithPersonCue(text) {
    return /^(who is|who was|who are|where is|where was|where's|tell me about|what do you know about|what's the story with|what is the story with|what happened with|what happened to|story behind|explain|describe|profile)\b/
        .test(text);
}

function isPersonIdentityQuestion(text) {
    return /^(who is|who was|who are|tell me about|what do you know about|profile)\b/
        .test(text);
}

function hasSpecificFactCue(text) {
    return /\b(incident|files|who won|where is|where was|where's|where did|who said|which line|what line|quote|press conference|furious)\b/
        .test(text);
}

function hasStrongLoreRequest(text) {
    return hasSpecificFactCue(text) ||
        /\b(lore|history|story|backstory|tell me about|what happened with|what happened to|story behind|who is|who was|what is)\b/
            .test(text);
}

function isPassiveClubKnowledgeQuestion(question) {
    const text =
        normalize(question);

    if (!text) {
        return false;
    }

    return (
        (hasHistoryCue(text) && hasClubCue(text)) ||
        hasSpecificFactCue(text) ||
        startsWithPersonCue(text)
    );
}

function answerHistoryOverview(text) {
    if (!hasHistoryCue(text) || !hasClubCue(text)) {
        return null;
    }

    if (/\b(short|quick|brief|summary|summarise|summarize|simple)\b/.test(text)) {
        return CLUB_HISTORY_OVERVIEW
            .slice(0, 3)
            .join("\n");
    }

    if (/\b(full|whole|complete|all|everything|timeline)\b/.test(text)) {
        return CLUB_HISTORY_OVERVIEW.join("\n");
    }

    return CLUB_HISTORY_OVERVIEW
        .slice(0, 5)
        .join("\n");
}

function answerPersonLore(text) {
    const compactText =
        compact(text);
    const directQuestion =
        hasPersonCue(text);
    const candidates =
        PERSON_LORE
            .map(person => {
                const matched =
                    person.aliases
                        .map(alias => ({
                            alias,
                            compactAlias: compact(alias)
                        }))
                        .filter(row =>
                            row.compactAlias.length >= 2 &&
                            compactText.includes(row.compactAlias)
                        )
                        .sort((a, b) =>
                            b.compactAlias.length - a.compactAlias.length
                        )[0];

                return {
                    person,
                    score: matched?.compactAlias.length || 0
                };
            })
            .filter(row => row.score > 0)
            .sort((a, b) => b.score - a.score);

    if (!candidates.length) {
        return null;
    }

    if (
        !directQuestion &&
        !/\b(lore|history|story|incident|drama|player|manager|rival|rivals?)\b/.test(text)
    ) {
        return null;
    }

    const uniqueAnswers =
        [...new Set(candidates.map(row => row.person.answer))];

    if (
        uniqueAnswers.length > 1 &&
        /\b(who are|tell me about|and|plus|with)\b/.test(text)
    ) {
        return uniqueAnswers
            .slice(0, 3)
            .join("\n");
    }

    return uniqueAnswers[0];
}

function scoreItem(text, item) {
    const compactText =
        compact(text);
    const tokens =
        tokenize(text);
    const answerText =
        normalize(item.answer);
    let aliasScore = 0;
    let distinctiveHits = 0;

    for (const group of item.aliases) {
        const matchedAlias =
            group.find(alias =>
                aliasMatches(text, compactText, alias)
            );

        if (!matchedAlias) {
            continue;
        }

        aliasScore += 4 +
            Math.min(
                8,
                Math.floor(normalize(matchedAlias).length / 4)
            );

        if (!isGenericAlias(matchedAlias)) {
            distinctiveHits += 1;
        }
    }

    const tokenScore =
        tokens.reduce(
            (score, token) =>
                answerText.includes(token)
                    ? score + 1
                : score,
            0
        );

    return {
        score:
            hasSpecificFactCue(text)
                ? aliasScore
                : aliasScore + tokenScore,
        distinctiveHits
    };
}

function getRelevantClubLore(question, limit = 3, minimumDistinctiveHits = 1) {
    const text =
        normalize(question);
    const threshold =
        hasSpecificFactCue(text)
            ? 4
            : 7;

    if (
        !text ||
        !hasStrongLoreRequest(text)
    ) {
        return [];
    }

    return CLUB_LORE_ITEMS
        .map(item => {
            const scored =
                scoreItem(text, item);

            return {
                item,
                ...scored
            };
        })
        .filter(candidate =>
            candidate.score >= threshold &&
            candidate.distinctiveHits >= minimumDistinctiveHits
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(candidate => candidate.item.answer);
}

function answerVPCSeason7Knowledge(question) {
    const text =
        normalize(question);
    const lookupText =
        text.replace(/\bmamba esports\b/g, "vpc millwall");

    if (
        !/\bvpc\b/.test(text) ||
        !/\b(season 7|season seven|s7)\b/.test(text)
    ) {
        return null;
    }

    const formatTableRow = (row, index) => {
        const [team, played, wins, losses, draws, scored, conceded, difference, points] =
            row;
        const signedDifference =
            difference > 0 ? `+${difference}` : String(difference);

        return `${index + 1}. ${team} - ${points} pts (${played}P, ${wins}W, ${draws}D, ${losses}L, ${scored}-${conceded}, GD ${signedDifference})`;
    };
    const clubKey = value =>
        compact(
            String(value || "")
                .replace(/\b(?:fc|cf|esports)\b/gi, "")
        );
    const asksFullTable =
        /\b(full|whole|complete|all|final)\b.*\b(table|standings)\b/.test(text) ||
        /\b(table|standings)\b.*\b(full|whole|complete|all|final)\b/.test(text);

    if (asksFullTable || /^(?:what|show|give|list).*\bvpc season 7 (?:table|standings)\b/.test(text)) {
        return VPC_SEASON_7_TABLE
            .map(formatTableRow)
            .join("\n");
    }

    const positionMatch =
        text.match(/\b(?:finished|finish|position|place|placed)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);

    if (positionMatch) {
        const index =
            Number(positionMatch[1]) - 1;
        const row =
            VPC_SEASON_7_TABLE[index];

        return row
            ? formatTableRow(row, index)
            : null;
    }

    const tableRow =
        VPC_SEASON_7_TABLE
            .map((row, index) => ({
                row,
                index,
                key: clubKey(row[0])
            }))
            .filter(candidate =>
                candidate.key.length > 3 &&
                compact(lookupText).includes(candidate.key)
            )
            .sort((a, b) => b.key.length - a.key.length)[0];
    const asksTableFact =
        /\b(table|standings|finish|finished|position|place|points|pts|record|wins|losses|draws|goals|scored|conceded|goal difference|gd)\b/
            .test(text);

    if (tableRow && asksTableFact) {
        return formatTableRow(tableRow.row, tableRow.index);
    }

    const opponent =
        VPC_SEASON_7_RESULTS
            .map(row => ({
                name: row[1],
                key: clubKey(row[1])
            }))
            .filter(candidate =>
                candidate.key.length > 3 &&
                compact(lookupText).includes(candidate.key)
            )
            .sort((a, b) => b.key.length - a.key.length)[0];

    if (opponent) {
        const matches =
            VPC_SEASON_7_RESULTS.filter(row =>
                row[1] === opponent.name
            );

        return matches
            .map(([date, name, score, outcome]) =>
                `${date}: Bella Ciao FC ${score} ${name} (${outcome})`
            )
            .join("\n");
    }

    if (/\b(bella ciao|bella|our|we|us|season|record|summary|how did)\b/.test(text)) {
        return "Bella Ciao FC finished 6th in VPC Season 7 with 54 points from 30 matches: 16 wins, 6 draws and 8 losses, scoring 50 and conceding 41 for a +9 goal difference.";
    }

    return null;
}

function answerClubQuizKnowledge(question) {
    const text =
        normalize(question)
            .replace(/\bbeans\b/g, "bean")
            .replace(/\bgollums\b/g, "gollum")
            .replace(/\bshirt number\b/g, "number")
            .replace(/\bseven\b/g, "7")
            .replace(/\bsigniture\b/g, "signature")
            .replace(/\bmean\b/g, "stand for")
            .replace(/\bretire\b/g, "retirement")
            .replace(/\b2023\/24\b/g, "23/24");
    const tokens =
        tokenize(text);
    const numbers =
        text.match(/\b\d+(?:\/\d+)?\b/g) || [];
    const ranked =
        CLUB_LORE_QUIZ_QUESTIONS
            .map(([quizQuestion, answers, correctIndex]) => {
                const candidate =
                    normalize(quizQuestion);
                const candidateTokens =
                    new Set(tokenize(candidate));
                const candidateNumbers =
                    candidate.match(/\b\d+(?:\/\d+)?\b/g) || [];
                const matched =
                    tokens.filter(token =>
                        candidateTokens.has(token)
                    ).length;

                return {
                    answer: answers[correctIndex],
                    coverage:
                        tokens.length
                            ? matched / tokens.length
                            : 0,
                    exact: candidate === text,
                    numbersMatch:
                        !numbers.length ||
                        !candidateNumbers.length ||
                        numbers.every(number =>
                            candidateNumbers.includes(number)
                        )
                };
            })
            .filter(row =>
                row.numbersMatch &&
                (
                    row.exact ||
                    row.coverage >= 0.7
                )
            )
            .sort((a, b) =>
                Number(b.exact) - Number(a.exact) ||
                b.coverage - a.coverage
            );
    const best =
        ranked[0];
    const second =
        ranked[1];

    if (
        !best ||
        (
            !best.exact &&
            second &&
            best.answer !== second.answer &&
            best.coverage - second.coverage < 0.15
        )
    ) {
        return null;
    }

    return best.answer;
}

function answerClubKnowledge(question) {
    const text =
        normalize(question);
    const asksWhatHappened =
        /^what happened (?:to|with)\b/.test(text);
    const minimumDistinctiveHits =
        asksWhatHappened ? 2 : 1;
    const vpcSeason7 =
        answerVPCSeason7Knowledge(question);

    if (isPersonIdentityQuestion(text)) {
        const person =
            answerPersonLore(text);

        if (person) {
            return person;
        }
    }

    if (
        /\b(tell me about|explain|describe|what is|story behind)\b/.test(text) &&
        !/\b(full|whole|complete|all|everything|timeline)\b/.test(text)
    ) {
        const facts =
            getRelevantClubLore(text, 1, minimumDistinctiveHits);

        if (facts.length) {
            return facts.join("\n");
        }
    }

    const quizAnswer =
        answerClubQuizKnowledge(question);

    if (quizAnswer) {
        return quizAnswer;
    }

    if (vpcSeason7) {
        return vpcSeason7;
    }

    if (
        startsWithPersonCue(text) &&
        !isPersonIdentityQuestion(text) &&
        !/^what happened (?:to|with)\b/.test(text)
    ) {
        const person =
            answerPersonLore(text);

        if (person) {
            return person;
        }
    }

    if (
        hasSpecificFactCue(text) ||
        /\b(fyzo|gussy|glendick|what tribe|50 jobs|nightclub|docks|sauna)\b/.test(text)
    ) {
        const facts =
            getRelevantClubLore(text, 1, minimumDistinctiveHits);

        if (facts.length) {
            return facts.join("\n");
        }
    }

    const overview =
        answerHistoryOverview(text);

    if (overview) {
        return overview;
    }

    const person =
        asksWhatHappened
            ? null
            : answerPersonLore(text);

    if (person) {
        return person;
    }

    const facts =
        getRelevantClubLore(text, 3, minimumDistinctiveHits);

    if (!facts.length) {
        return null;
    }

    return facts.join("\n");
}

function isClubKnowledgeQuestion(question) {
    return Boolean(answerClubKnowledge(question));
}

module.exports = {
    CLUB_LORE_QUIZ_QUESTIONS,
    VPC_SEASON_7_RESULTS,
    VPC_SEASON_7_TABLE,
    answerClubKnowledge,
    getRelevantClubLore,
    isPassiveClubKnowledgeQuestion,
    isClubKnowledgeQuestion
};
