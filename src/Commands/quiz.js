const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../Utils/db");
const eaApi = require("../Services/eaApi");
const {
    FOOTER,
    isRealPlayerName,
    number,
    escapeMarkdown
} = require("../Utils/embedStyle");
const {
    getClubName
} = require("../Utils/scoreboard");
const {
    AWARDS,
    COMPETITIONS,
    LEAGUE_AWARDS,
    LEAGUE_TABLES,
    LEAGUES,
    POSITION_FACTS
} = require("../Services/footballHistoryData");
const {
    CLUB_LORE_QUIZ_QUESTIONS
} = require("../Services/clubKnowledge");

const QUIZ_XP = 1;
const TIME_LIMIT_SECONDS = 20;
const RESULTS_PAGE_SIZE = 15;
const RECENT_QUESTION_MEMORY = 60;
const MIN_SPECIAL_HISTORY_SEASONS = 10;
const quizTimers = new Map();
const advancingQuestions = new Set();
const recentQuizQuestions = new Map();

const POSITION_QUIZ_CHOICES = {
    goalkeeper: "Protects the goal, commands the box, claims crosses, and starts build-up.",
    "centre back": "Defends central spaces, wins duels, tracks runners, and starts attacks with first passes.",
    "full back": "Defends wide areas, supports attacks, and overlaps or underlaps down the flank.",
    "wing back": "Provides width, joins attacks, and recovers into the defensive line.",
    cdm: "Screens the defence, wins second balls, blocks passing lanes, and offers a safe build-up option.",
    cm: "Links defence and attack, controls tempo, presses, and gives passing angles.",
    cam: "Receives between the lines, creates chances, and links midfield with the forwards.",
    winger: "Stretches the pitch, attacks one-v-one, crosses, cuts inside, and creates central space.",
    striker: "Leads the line, pins centre-backs, attacks crosses, and turns chances into goals.",
    "false nine": "Starts high, drops into midfield, pulls defenders out, and opens space for runners."
};

const STATIC_QUESTIONS = [
    ...CLUB_LORE_QUIZ_QUESTIONS,
    ["In Clubs data, what does pass success rate tell you better than raw completed passes?", ["How efficiently a player keeps possession when attempting distribution", "How many shots a player should have taken", "Whether a player was offside", "How many saves the goalkeeper made"], 0],
    ["What does a high expected assists profile usually suggest about a player?", ["They are creating valuable chances for teammates", "They are avoiding forward passes", "They are mostly making defensive clearances", "They are guaranteed to score next game"], 0],
    ["Why is average rating useful when judging a player beyond goals and assists?", ["It captures broader match influence across several actions", "It ignores defensive work completely", "It only counts penalties", "It replaces the need to watch games"], 0],
    ["Why can a compact low block be difficult to break down?", ["It reduces central space and forces lower-quality chances", "It leaves defenders spread across the halfway line", "It removes the goalkeeper from build-up", "It guarantees counter-attacking goals"], 0],
    ["What is the main danger of holding an aggressive high defensive line?", ["Space behind the defence can be attacked quickly", "The goalkeeper cannot pass short", "Wingers are forced to defend corners", "The team cannot win throw-ins"], 0],
    ["What does a box-to-box midfielder primarily offer?", ["Two-way involvement between defensive and attacking phases", "Only penalty taking", "Only goalkeeper cover", "Only staying wide on the touchline"], 0],
    ["What is a third-man run?", ["A supporting runner receives after two teammates combine", "A goalkeeper overlapping beyond the striker", "A substitute entering the pitch early", "A defender clearing under pressure"], 0],
    ["Why does a false nine drop away from the centre-backs?", ["To drag markers out and open space for runners", "To stand offside deliberately", "To mark the opposition goalkeeper", "To avoid receiving the ball"], 0],
    ["What is the purpose of counter-pressing immediately after losing possession?", ["To win the ball back before the opponent can settle", "To retreat into the six-yard box", "To force every attack into a throw-in", "To swap centre-backs with full-backs"], 0],
    ["What is the strongest evidence of chemistry between two attackers?", ["Shared goal contributions, wins, and repeated high ratings together", "Similar boots", "Taking turns on corners", "Using the same celebration"], 0],
    ["What is a progressive pass?", ["A pass that meaningfully moves possession closer to goal", "Any pass played backwards", "A pass taken after a foul", "A goalkeeper save that stays in play"], 0],
    ["In tactical analysis, what does rest defence refer to?", ["The structure left behind to defend transitions while attacking", "The order substitutes sit on the bench", "Time-wasting after scoring", "A goalkeeper conserving stamina"], 0],
    ["Why do teams overload one side of the pitch?", ["To draw pressure and create a free player or space elsewhere", "To reduce passing options", "To guarantee a red card", "To make offside impossible"], 0],
    ["What usually makes a high press easy to play through?", ["Poor compactness and no cover behind the first line", "Too much communication", "Good pressing angles", "Fast recovery runs"], 0],
    ["What is a cutback in attacking play?", ["A pass pulled back from near the byline into a dangerous area", "A long clearance into the channel", "A sliding tackle near midfield", "A direct free-kick routine"], 0],
    ["Which stat pairing is the clearest basic measure of direct attacking output?", ["Goals and assists", "Saves and red cards", "Tackles and fouls", "Pass attempts and yellow cards"], 0],
    ["Why are clean sheets especially relevant for defenders and goalkeepers?", ["They show the team conceded zero goals", "They prove the team had all possession", "They add three goals to the score", "They automatically mean promotion"], 0],
    ["Why are assists per game more useful than raw assists alone?", ["They adjust creative output for number of appearances", "They only count corners", "They remove every bit of context", "They ignore minutes and matches completely"], 0],
    ["What is a switch of play?", ["Moving the ball quickly to the opposite side of the pitch", "Changing the captain", "Replacing the goalkeeper", "Passing only backwards"], 0],
    ["What does receiving between the lines mean?", ["Finding space between the opposition's defensive units", "Standing directly on the touchline", "Waiting in the defensive wall", "Sitting between substitutes"], 0],
    ["Why is a holding midfielder valuable in possession and defence?", ["They protect the back line and connect phases of play", "They take every shot", "They stay permanently offside", "They replace the referee"], 0],
    ["What is an underlap?", ["A supporting run made inside a wide teammate", "A goalkeeper sprinting outside the centre-back", "A kick-off routine", "A penalty save technique"], 0],
    ["What is a transition in football?", ["The phase immediately after possession changes hands", "Only the half-time break", "A kit change", "A corner flag movement"], 0],
    ["What should a winger usually do when doubled up by two defenders?", ["Move the ball quickly or combine with support", "Dribble into both every time", "Stop attacking completely", "Shoot from the halfway line"], 0],
    ["Why does sample size matter when judging form?", ["One match can distort the picture", "It removes all wins from the record", "It only applies to goalkeepers", "It blocks assists from counting"], 0],
    ["Which country won the first men's FIFA World Cup in 1930?", ["Uruguay", "Brazil", "Argentina", "Italy"], 0],
    ["Which country has won the most men's FIFA World Cups?", ["Brazil", "Germany", "Italy", "Argentina"], 0],
    ["Who is the all-time leading scorer in men's FIFA World Cup history?", ["Miroslav Klose", "Ronaldo Nazario", "Lionel Messi", "Gerd Muller"], 0],
    ["Who won the Golden Boot at the 2022 FIFA World Cup?", ["Kylian Mbappe", "Lionel Messi", "Olivier Giroud", "Julian Alvarez"], 0],
    ["Who won the Golden Ball at the 2022 FIFA World Cup?", ["Lionel Messi", "Kylian Mbappe", "Luka Modric", "Antoine Griezmann"], 0],
    ["Which nation did Argentina beat in the 2022 World Cup final?", ["France", "Croatia", "Netherlands", "Brazil"], 0],
    ["Which player scored a hat-trick in the 2022 World Cup final?", ["Kylian Mbappe", "Lionel Messi", "Angel Di Maria", "Julian Alvarez"], 0],
    ["Which country hosted and won the 1998 FIFA World Cup?", ["France", "Germany", "Brazil", "Spain"], 0],
    ["Who scored twice for Brazil in the 2002 World Cup final?", ["Ronaldo Nazario", "Ronaldinho", "Rivaldo", "Kaka"], 0],
    ["Which country won the 2010 FIFA World Cup?", ["Spain", "Netherlands", "Germany", "Argentina"], 0],
    ["Who scored Spain's winning goal in the 2010 World Cup final?", ["Andres Iniesta", "Xavi", "David Villa", "Fernando Torres"], 0],
    ["Which nation won the 2014 FIFA World Cup?", ["Germany", "Argentina", "Brazil", "Netherlands"], 0],
    ["Who scored the winning goal in the 2014 World Cup final?", ["Mario Gotze", "Thomas Muller", "Miroslav Klose", "Mesut Ozil"], 0],
    ["Which country won the 2018 FIFA World Cup?", ["France", "Croatia", "Belgium", "England"], 0],
    ["Which team did France beat in the 2018 World Cup final?", ["Croatia", "Belgium", "Argentina", "Portugal"], 0],
    ["Who won the Golden Ball at the 2018 World Cup?", ["Luka Modric", "Kylian Mbappe", "Antoine Griezmann", "Harry Kane"], 0],
    ["Who won the Golden Boot at the 2018 World Cup?", ["Harry Kane", "Romelu Lukaku", "Kylian Mbappe", "Cristiano Ronaldo"], 0],
    ["Which country did Diego Maradona score the 'Hand of God' goal against in 1986?", ["England", "Italy", "Brazil", "France"], 0],
    ["Which country won the 1986 FIFA World Cup?", ["Argentina", "West Germany", "Brazil", "Italy"], 0],
    ["Which goalkeeper is famous for the 1970 World Cup save from Pele's header?", ["Gordon Banks", "Dino Zoff", "Lev Yashin", "Sepp Maier"], 0],
    ["Which country won the 1966 FIFA World Cup?", ["England", "West Germany", "Portugal", "Brazil"], 0],
    ["Who scored a hat-trick in the 1966 World Cup final?", ["Geoff Hurst", "Bobby Charlton", "Eusebio", "Gerd Muller"], 0],
    ["Which player scored in every match of Brazil's 1970 World Cup campaign?", ["Jairzinho", "Pele", "Tostao", "Rivelino"], 0],
    ["Which African nation reached a World Cup semi-final in 2022?", ["Morocco", "Senegal", "Nigeria", "Ghana"], 0],
    ["Which country won UEFA EURO 2024?", ["Spain", "England", "France", "Germany"], 0],
    ["Who did Spain beat in the UEFA EURO 2024 final?", ["England", "France", "Italy", "Portugal"], 0],
    ["Which country won UEFA EURO 2020, played in 2021?", ["Italy", "England", "Spain", "Denmark"], 0],
    ["Where was the EURO 2020 final played?", ["Wembley Stadium", "Stade de France", "Olympiastadion Berlin", "San Siro"], 0],
    ["Which country won UEFA EURO 2016?", ["Portugal", "France", "Germany", "Spain"], 0],
    ["Who scored Portugal's winning goal in the EURO 2016 final?", ["Eder", "Cristiano Ronaldo", "Nani", "Joao Moutinho"], 0],
    ["Which country surprisingly won UEFA EURO 2004?", ["Greece", "Portugal", "Czech Republic", "France"], 0],
    ["Which country won UEFA EURO 1992 after entering late as a replacement?", ["Denmark", "Sweden", "Netherlands", "Germany"], 0],
    ["Which country won the first European Championship in 1960?", ["Soviet Union", "Spain", "France", "Italy"], 0],
    ["Which nation won back-to-back European Championships in 2008 and 2012?", ["Spain", "Germany", "France", "Italy"], 0],
    ["Who scored the winning goal for Spain in the EURO 2008 final?", ["Fernando Torres", "David Villa", "Xavi", "Cesc Fabregas"], 0],
    ["Which country won UEFA EURO 1988?", ["Netherlands", "West Germany", "Soviet Union", "Italy"], 0],
    ["Who scored the famous volley for the Netherlands in the EURO 1988 final?", ["Marco van Basten", "Ruud Gullit", "Frank Rijkaard", "Ronald Koeman"], 0],
    ["Which club has won the most European Cups and Champions League titles?", ["Real Madrid", "AC Milan", "Liverpool", "Bayern Munich"], 0],
    ["Who won the first European Cup in 1956?", ["Real Madrid", "Reims", "AC Milan", "Barcelona"], 0],
    ["Which club completed 'La Decima' by winning a tenth European title in 2014?", ["Real Madrid", "Barcelona", "Bayern Munich", "AC Milan"], 0],
    ["Which club came from 3-0 down to win the 2005 Champions League final?", ["Liverpool", "AC Milan", "Chelsea", "Manchester United"], 0],
    ["Which city is strongly associated with Liverpool's 2005 Champions League comeback?", ["Istanbul", "Athens", "Cardiff", "Paris"], 0],
    ["Which club won the Champions League for the first time in 2012?", ["Chelsea", "Manchester City", "Tottenham Hotspur", "Arsenal"], 0],
    ["Who scored Chelsea's late equaliser in the 2012 Champions League final?", ["Didier Drogba", "Frank Lampard", "Fernando Torres", "Juan Mata"], 0],
    ["Which English club won the Champions League in 1999 with two stoppage-time goals?", ["Manchester United", "Liverpool", "Chelsea", "Arsenal"], 0],
    ["Which manager led Manchester United to the 1999 treble?", ["Sir Alex Ferguson", "Jose Mourinho", "Arsene Wenger", "Carlo Ancelotti"], 0],
    ["Which club won the Champions League in 2023 as part of a treble?", ["Manchester City", "Inter", "Real Madrid", "Bayern Munich"], 0],
    ["Who managed Manchester City during their 2023 treble season?", ["Pep Guardiola", "Jurgen Klopp", "Carlo Ancelotti", "Thomas Tuchel"], 0],
    ["Who was the first Ballon d'Or winner in 1956?", ["Stanley Matthews", "Alfredo Di Stefano", "Raymond Kopa", "Pele"], 0],
    ["Who is the only goalkeeper to win the Ballon d'Or?", ["Lev Yashin", "Gianluigi Buffon", "Manuel Neuer", "Dino Zoff"], 0],
    ["Which player has won the most men's Ballon d'Or awards?", ["Lionel Messi", "Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"], 0],
    ["Which player won three consecutive Ballon d'Or awards from 1983 to 1985?", ["Michel Platini", "Marco van Basten", "Johan Cruyff", "Zinedine Zidane"], 0],
    ["Who became the first African player to win the Ballon d'Or in 1995?", ["George Weah", "Samuel Eto'o", "Didier Drogba", "Roger Milla"], 0],
    ["Who won the men's Ballon d'Or in 2018, ending Messi and Ronaldo's long run?", ["Luka Modric", "Antoine Griezmann", "Kylian Mbappe", "Neymar"], 0],
    ["Who won the men's Ballon d'Or in 2022?", ["Karim Benzema", "Lionel Messi", "Robert Lewandowski", "Sadio Mane"], 0],
    ["Who won the men's Ballon d'Or in 2024?", ["Rodri", "Vinicius Junior", "Jude Bellingham", "Erling Haaland"], 0],
    ["Who won the men's Ballon d'Or in 2025?", ["Ousmane Dembele", "Lamine Yamal", "Vitinha", "Kylian Mbappe"], 0],
    ["Who won the women's Ballon d'Or in 2025?", ["Aitana Bonmati", "Alexia Putellas", "Caroline Graham Hansen", "Sophia Smith"], 0],
    ["Which award is given to the best goalkeeper at the Ballon d'Or ceremony?", ["Yashin Trophy", "Kopa Trophy", "Gerd Muller Trophy", "Socrates Award"], 0],
    ["Which Ballon d'Or award recognises the best young player?", ["Kopa Trophy", "Yashin Trophy", "Gerd Muller Trophy", "Golden Foot"], 0],
    ["Which country did Pele represent?", ["Brazil", "Argentina", "Portugal", "France"], 0],
    ["Which country did Johan Cruyff represent?", ["Netherlands", "Belgium", "Germany", "Denmark"], 0],
    ["Which country did Zinedine Zidane represent?", ["France", "Italy", "Algeria", "Spain"], 0],
    ["Which country did Eusebio represent internationally?", ["Portugal", "Brazil", "Angola", "Mozambique"], 0],
    ["Which country did George Best represent?", ["Northern Ireland", "Republic of Ireland", "Scotland", "England"], 0],
    ["Which club is most associated with Johan Cruyff's playing and coaching legacy?", ["Barcelona", "Chelsea", "Juventus", "Benfica"], 0],
    ["Which player is known as 'Il Fenomeno'?", ["Ronaldo Nazario", "Ronaldinho", "Romario", "Rivaldo"], 0],
    ["Which goalkeeper was nicknamed the 'Black Spider'?", ["Lev Yashin", "Gordon Banks", "Peter Schmeichel", "Oliver Kahn"], 0],
    ["Which manager is associated with the tactical term 'gegenpressing' in modern English football?", ["Jurgen Klopp", "Jose Mourinho", "Carlo Ancelotti", "Diego Simeone"], 0],
    ["What is the main idea behind gegenpressing?", ["Immediately press to regain possession after losing the ball", "Drop every player onto the goal line", "Only attack through long throws", "Keep possession without ever pressing"], 0],
    ["What does an inverted full-back usually do in possession?", ["Moves into central midfield areas", "Stays permanently on the touchline", "Plays as a second goalkeeper", "Marks the corner flag"], 0],
    ["Why is a double pivot useful in midfield?", ["It gives two central options for build-up and protection", "It removes passing angles", "It guarantees penalties", "It forces both strikers wide"], 0],
    ["What does 'playing through the thirds' mean?", ["Progressing from defence to midfield to attack with structure", "Only shooting from long range", "Clearing into the stands", "Taking three corners in a row"], 0],
    ["What is a half-space?", ["The channel between the centre and the wing", "The penalty spot", "The technical area", "The centre circle only"], 0],
    ["Why are runners beyond the striker important against a deep defence?", ["They threaten space behind and disrupt marking", "They stop counter-attacks by standing still", "They make the pitch smaller", "They prevent crosses"], 0],
    ["What does a target forward usually provide?", ["A focal point for hold-up play and aerial duels", "Only short corners", "A spare goalkeeper", "A permanent offside trap"], 0],
    ["What does a sweeper-keeper add to a team?", ["They defend space behind the back line and support build-up", "They avoid all passes", "They only take throw-ins", "They never leave the six-yard box"], 0],
    ["Why is pressing in a curved run useful?", ["It blocks one passing lane while applying pressure", "It avoids the ball completely", "It guarantees a foul", "It forces the goalkeeper to score"], 0],
    ["What is the purpose of a decoy run?", ["To move defenders and open space for someone else", "To waste substitutions", "To leave the pitch", "To stop teammates receiving"], 0],
    ["What does 'vertical compactness' describe?", ["How close a team's lines are from back to front", "How tall the players are", "How many crosses are attempted", "How high the stadium roof is"], 0],
    ["Why are second balls important after direct passes?", ["Winning them can turn a clearance into sustained pressure", "They reset the score", "They cancel offsides", "They count as assists automatically"], 0],
    ["What is the usual benefit of a 4-2-3-1 shape?", ["Midfield protection with three attacking midfield lanes", "No central midfielders", "Only one defender", "A guaranteed clean sheet"], 0],
    ["What is the usual benefit of a back three in possession?", ["It can create safer build-up angles and wing-back width", "It prevents all crosses", "It removes the midfield", "It makes fouls impossible"], 0],
    ["Why is the far-post runner dangerous on crosses?", ["They can attack the blind side of defenders", "They are always offside", "They cannot be marked", "They stop the goalkeeper moving"], 0],
    ["What is the main purpose of a tactical foul?", ["To stop a dangerous transition before it develops", "To improve pass accuracy", "To gain extra substitutions", "To force a corner"], 0],
    ["What is the best interpretation of a high tackle success rate?", ["The player wins a strong share of attempted tackles", "The player never defends", "The player scores from tackles", "The player attempted no tackles"], 0],
    ["Why can raw goals be misleading without appearances?", ["More matches create more scoring opportunities", "Goals are never useful", "Appearances remove assists", "It only affects goalkeepers"], 0],
    ["Which stat best shows whether two players are producing together in attack?", ["Combined goals and assists when both play", "Their shirt numbers", "Their boot colour", "Their height difference"], 0],
    ["Which stat is most relevant when asking if a pair helps the team defend well together?", ["Clean sheet rate when both play", "Celebrations per match", "Corner flag touches", "Kit number average"], 0],
    ["Which nation won the 1970 FIFA World Cup with a side often regarded as one of the greatest ever?", ["Brazil", "Italy", "West Germany", "Netherlands"], 0],
    ["Who captained Brazil during their iconic 1970 World Cup triumph?", ["Carlos Alberto", "Pele", "Jairzinho", "Rivelino"], 0],
    ["Which country won the 1974 FIFA World Cup?", ["West Germany", "Netherlands", "Brazil", "Argentina"], 0],
    ["Which team were famous for Total Football at the 1974 World Cup?", ["Netherlands", "West Germany", "Italy", "England"], 0],
    ["Who was the star Dutch playmaker associated with Total Football in the 1970s?", ["Johan Cruyff", "Marco van Basten", "Ruud Gullit", "Dennis Bergkamp"], 0],
    ["Which country won the 1978 FIFA World Cup?", ["Argentina", "Netherlands", "Brazil", "France"], 0],
    ["Who won the 1982 FIFA World Cup?", ["Italy", "West Germany", "Brazil", "France"], 0],
    ["Which Italian striker was the standout goalscorer at the 1982 World Cup?", ["Paolo Rossi", "Roberto Baggio", "Gianluca Vialli", "Alessandro Del Piero"], 0],
    ["Which country won the 1990 FIFA World Cup?", ["West Germany", "Argentina", "Italy", "Brazil"], 0],
    ["Who scored the penalty that decided the 1990 World Cup final?", ["Andreas Brehme", "Jurgen Klinsmann", "Lothar Matthaus", "Rudi Voller"], 0],
    ["Which country won the 1994 FIFA World Cup?", ["Brazil", "Italy", "Argentina", "France"], 0],
    ["Which Italian player famously missed the decisive penalty in the 1994 World Cup final shootout?", ["Roberto Baggio", "Paolo Maldini", "Franco Baresi", "Demetrio Albertini"], 0],
    ["Which country won the 2006 FIFA World Cup?", ["Italy", "France", "Germany", "Spain"], 0],
    ["Who did Italy beat in the 2006 World Cup final?", ["France", "Germany", "Brazil", "Portugal"], 0],
    ["Which player was sent off in the 2006 World Cup final after a headbutt?", ["Zinedine Zidane", "Marco Materazzi", "Fabio Cannavaro", "Patrick Vieira"], 0],
    ["Which defender won the Ballon d'Or after captaining Italy to the 2006 World Cup?", ["Fabio Cannavaro", "Paolo Maldini", "Alessandro Nesta", "Gianluigi Buffon"], 0],
    ["Who won the Ballon d'Or in 1970?", ["Gerd Muller", "Johan Cruyff", "Franz Beckenbauer", "George Best"], 0],
    ["Who won the Ballon d'Or in 1971, 1973 and 1974?", ["Johan Cruyff", "Franz Beckenbauer", "Gerd Muller", "Kevin Keegan"], 0],
    ["Who won the Ballon d'Or in both 1972 and 1976?", ["Franz Beckenbauer", "Johan Cruyff", "Gerd Muller", "Karl-Heinz Rummenigge"], 0],
    ["Which Liverpool forward won back-to-back Ballon d'Or awards in 1978 and 1979?", ["Kevin Keegan", "Kenny Dalglish", "Ian Rush", "Graeme Souness"], 0],
    ["Which German forward won the Ballon d'Or in 1980 and 1981?", ["Karl-Heinz Rummenigge", "Lothar Matthaus", "Rudi Voller", "Jurgen Klinsmann"], 0],
    ["Which Dutch forward won the Ballon d'Or three times between 1988 and 1992?", ["Marco van Basten", "Ruud Gullit", "Frank Rijkaard", "Dennis Bergkamp"], 0],
    ["Which player won the Ballon d'Or in 1990 after West Germany's World Cup win?", ["Lothar Matthaus", "Jurgen Klinsmann", "Andreas Brehme", "Rudi Voller"], 0],
    ["Who won the Ballon d'Or in 1998 after France's World Cup triumph?", ["Zinedine Zidane", "Ronaldo Nazario", "Davor Suker", "Lilian Thuram"], 0],
    ["Who won the Ballon d'Or in 1999?", ["Rivaldo", "Luis Figo", "Zinedine Zidane", "David Beckham"], 0],
    ["Which club won three straight European Cups from 1974 to 1976?", ["Bayern Munich", "Ajax", "Liverpool", "AC Milan"], 0],
    ["Which club won three straight European Cups from 1971 to 1973?", ["Ajax", "Bayern Munich", "Inter", "Benfica"], 0],
    ["Which English club won back-to-back European Cups in 1979 and 1980?", ["Nottingham Forest", "Liverpool", "Aston Villa", "Leeds United"], 0],
    ["Which club won the 1982 European Cup?", ["Aston Villa", "Bayern Munich", "Liverpool", "Hamburg"], 0],
    ["Which Romanian club won the 1986 European Cup?", ["Steaua Bucharest", "Dinamo Bucharest", "CFR Cluj", "Rapid Bucharest"], 0],
    ["Which Dutch club won the first Champions League-branded final in 1995?", ["Ajax", "PSV Eindhoven", "Feyenoord", "Barcelona"], 0],
    ["Which club won the 1994 Champions League final 4-0 against Barcelona?", ["AC Milan", "Ajax", "Juventus", "Real Madrid"], 0],
    ["Which club won the 1997 Champions League final against Juventus?", ["Borussia Dortmund", "Bayern Munich", "Ajax", "Porto"], 0],
    ["Which club won the 2004 Champions League under Jose Mourinho?", ["Porto", "Chelsea", "Inter", "Real Madrid"], 0],
    ["Which club won the 2010 Champions League under Jose Mourinho?", ["Inter", "Chelsea", "Porto", "Real Madrid"], 0],
    ["Which national team won EURO 1968?", ["Italy", "Soviet Union", "West Germany", "England"], 0],
    ["Which national team won EURO 1972?", ["West Germany", "Soviet Union", "Belgium", "Czechoslovakia"], 0],
    ["Which nation won EURO 1976 after Antonin Panenka's famous penalty?", ["Czechoslovakia", "West Germany", "Netherlands", "Italy"], 0],
    ["Which nation won EURO 1984 with Michel Platini as the tournament star?", ["France", "Spain", "Italy", "Portugal"], 0],
    ["Which country won EURO 1996?", ["Germany", "England", "Czech Republic", "Netherlands"], 0],
    ["Who scored Germany's golden goal in the EURO 1996 final?", ["Oliver Bierhoff", "Jurgen Klinsmann", "Matthias Sammer", "Thomas Hassler"], 0],
    ["Which country won EURO 2000?", ["France", "Italy", "Netherlands", "Portugal"], 0],
    ["Who scored France's golden goal in the EURO 2000 final?", ["David Trezeguet", "Zinedine Zidane", "Thierry Henry", "Robert Pires"], 0],
    ["Which club is most associated with Arrigo Sacchi's late-1980s pressing and defensive organisation?", ["AC Milan", "Juventus", "Inter", "Roma"], 0],
    ["Which manager led Arsenal's Invincibles in the 2003-04 Premier League season?", ["Arsene Wenger", "Sir Alex Ferguson", "Jose Mourinho", "Rafael Benitez"], 0],
    ["Which team went unbeaten through the 2003-04 Premier League season?", ["Arsenal", "Chelsea", "Manchester United", "Liverpool"], 0],
    ["Which club did Jose Mourinho call a 'special' project when arriving in England in 2004?", ["Chelsea", "Manchester United", "Liverpool", "Arsenal"], 0],
    ["Which manager led Barcelona to the 2009 sextuple?", ["Pep Guardiola", "Frank Rijkaard", "Luis Enrique", "Johan Cruyff"], 0],
    ["Which player scored Barcelona's second goal in the 2009 Champions League final?", ["Lionel Messi", "Samuel Eto'o", "Xavi", "Andres Iniesta"], 0],
    ["Which club won the Champions League in 2011 at Wembley?", ["Barcelona", "Manchester United", "Chelsea", "Bayern Munich"], 0]
];

function shuffleAnswers(question, answers, correctIndex) {
    const correctAnswer =
        String(answers?.[correctIndex] || "").trim();
    const unique =
        uniqueAnswers(
            correctAnswer,
            (answers || [])
                .filter((_, index) => index !== correctIndex)
        );

    if (!question || !unique) {
        return null;
    }

    const rows =
        unique.map((answer, index) => ({
            answer,
            correct: index === 0
        }));

    for (let index = rows.length - 1; index > 0; index--) {
        const swapIndex =
            Math.floor(Math.random() * (index + 1));
        [rows[index], rows[swapIndex]] = [rows[swapIndex], rows[index]];
    }

    return {
        question,
        answers: rows.map(row => row.answer),
        correct: rows.findIndex(row => row.correct)
    };
}

function staticQuestion() {
    const roll =
        Math.random();

    if (roll < 0.08) {
        const position =
            positionQuestion();

        if (position) return position;
    }

    if (roll < 0.62) {
        const history =
            historyQuestion();

        if (history) return history;
    }

    const row =
        STATIC_QUESTIONS[
            Math.floor(Math.random() * STATIC_QUESTIONS.length)
        ];

    return shuffleAnswers(row[0], row[1], row[2]);
}

function historyQuestion() {
    const special =
        [
            leagueTableQuestion,
            leagueAwardQuestion
        ]
            .sort(() => Math.random() - 0.5);

    if (Math.random() < 0.15) {
        for (const build of special) {
            const question =
                build();

            if (question) {
                return question;
            }
        }
    }

    const pools =
        [
            ...Object.values(AWARDS),
            ...Object.values(COMPETITIONS),
            ...Object.values(LEAGUES)
        ]
            .filter(pool =>
                Object.keys(pool.winners || {}).length >= 4
            );
    const entries =
        pools.flatMap(pool =>
            Object.entries(pool.winners || {})
                .map(([year, winner]) => ({
                    pool,
                    year,
                    winner
                }))
        );

    if (entries.length < 4) {
        return null;
    }

    const selected =
        entries[Math.floor(Math.random() * entries.length)];
    const sameCompetition =
        Object.values(selected.pool.winners || {})
            .filter(value => value !== selected.winner)
            .sort(() => Math.random() - 0.5)
    const allWinners =
        entries
            .map(row => row.winner)
            .filter(value => value !== selected.winner)
            .sort(() => Math.random() - 0.5);
    const answers =
        uniqueAnswers(
            selected.winner,
            [
                ...sameCompetition,
                ...allWinners
            ]
        );

    if (!answers) {
        return null;
    }

    return shuffleAnswers(
        `Who won the ${selected.pool.label} in ${selected.year}?`,
        answers,
        0
    ) ||
    special
        .map(build => build())
        .find(Boolean);
}

function ordinalSuffix(value) {
    const numberValue =
        Number(value);
    const mod100 =
        numberValue % 100;

    if (mod100 >= 11 && mod100 <= 13) {
        return "th";
    }

    switch (numberValue % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

function ordinalLabel(value) {
    return `${value}${ordinalSuffix(value)}`;
}

function leagueTableQuestion() {
    const leagueEntries =
        Object.entries(LEAGUE_TABLES || {})
            .flatMap(([leagueKey, seasons]) =>
                Object.keys(seasons || {}).length >=
                    MIN_SPECIAL_HISTORY_SEASONS
                    ? Object.entries(seasons || {})
                    .map(([year, table]) => ({
                        leagueKey,
                        year,
                        table
                    }))
                    : []
            )
            .filter(row =>
                Array.isArray(row.table) &&
                row.table.length >= 4
            );

    if (!leagueEntries.length) {
        return null;
    }

    const selected =
        leagueEntries[Math.floor(Math.random() * leagueEntries.length)];
    const place =
        Math.floor(Math.random() * selected.table.length) + 1;
    const team =
        selected.table[place - 1];
    const distractors =
        selected.table
            .filter(value => value !== team)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
    const label =
        LEAGUES[selected.leagueKey]?.label || selected.leagueKey;

    if (distractors.length < 3) {
        return null;
    }

    return shuffleAnswers(
        `Who finished ${ordinalLabel(place)} in the ${label} in ${selected.year}?`,
        [
            team,
            ...distractors
        ],
        0
    );
}

function leagueAwardQuestion() {
    const entries =
        Object.entries(LEAGUE_AWARDS || {})
            .flatMap(([leagueKey, awards]) =>
                Object.entries(awards || {})
                    .flatMap(([, seasons]) =>
                        Object.entries(seasons || {})
                            .map(([year, award]) => ({
                                leagueKey,
                                year,
                                award
                            }))
                    )
            )
            .filter(row =>
                row.award?.winners?.length
            );

    if (entries.length < MIN_SPECIAL_HISTORY_SEASONS) {
        return null;
    }

    const selected =
        entries[Math.floor(Math.random() * entries.length)];
    const correct =
        selected.award.winners.join(" and ");
    const distractors =
        entries
            .map(row => row.award.winners.join(" and "))
            .filter(value => value !== correct)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
    const fallbackDistractors = [
        "Gerd Muller",
        "Robert Lewandowski",
        "Karl-Heinz Rummenigge",
        "Jupp Heynckes",
        "Klaus Fischer",
        "Pierre-Emerick Aubameyang"
    ]
        .filter(value => value !== correct);
    const answers =
        uniqueAnswers(
            correct,
            [
                ...distractors,
                ...fallbackDistractors
            ]
        );

    if (!answers) {
        return null;
    }

    return shuffleAnswers(
        `Who won the ${selected.award.label} in ${selected.year}?`,
        answers,
        0
    );
}

function positionQuestion() {
    const entries =
        Object.entries(POSITION_QUIZ_CHOICES);
    const [position, answer] =
        entries[Math.floor(Math.random() * entries.length)];
    const distractors =
        entries
            .map(([, value]) => value)
            .filter(value => value !== answer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

    if (distractors.length < 3) {
        return null;
    }

    return shuffleAnswers(
        `What is the main job of a ${position.toUpperCase()}?`,
        [
            answer,
            ...distractors
        ],
        0
    );
}

function playerName(stats) {
    return isRealPlayerName(stats?.playername)
        ? stats.playername
        : null;
}

function playerLabel(name) {
    return isRealPlayerName(name)
        ? name
        : null;
}

function uniqueAnswers(correct, candidates) {
    const seen = new Set([String(correct).toLowerCase()]);
    const answers = [correct];

    for (const candidate of candidates) {
        const value = String(candidate || "").trim();
        const key = value.toLowerCase();

        if (!value || seen.has(key)) {
            continue;
        }

        seen.add(key);
        answers.push(value);

        if (answers.length >= 4) {
            break;
        }
    }

    return answers.length === 4
        ? answers
        : null;
}

function getOurClubId(match, clubId) {
    const ids = Object.keys(match.clubs || {});

    return ids.includes(String(clubId))
        ? String(clubId)
        : ids[0];
}

function latestMatchQuestions(matches, clubId) {
    const latest = matches[0];

    if (!latest) {
        return [];
    }

    const ourId = getOurClubId(latest, clubId);
    const opponentId =
        Object.keys(latest.clubs || {})
            .find(id => id !== ourId);
    const ourClub = latest.clubs?.[ourId];
    const opponentClub = latest.clubs?.[opponentId];
    const players =
        Object.entries(latest.players?.[ourId] || {})
            .map(([playerId, stats]) => ({
                ...stats,
                playerId
            }))
            .filter(player =>
                isRealPlayerName(player.playername)
            );
    const playerNames =
        players
            .map(playerName)
            .filter(Boolean)
            .sort(() => Math.random() - 0.5);

    if (!ourClub || !opponentClub || players.length < 4) {
        return [];
    }

    const score =
        `${number(ourClub.goals)}-${number(opponentClub.goals)}`;
    const allScores =
        [
            score,
            `${number(opponentClub.goals)}-${number(ourClub.goals)}`,
            `${number(ourClub.goals)}-${number(Number(opponentClub.goals || 0) + 1)}`,
            `${number(Number(ourClub.goals || 0) + 1)}-${number(opponentClub.goals)}`
        ];
    const statLeader = key =>
        players
            .slice()
            .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))[0];
    const goalsLeader = statLeader("goals");
    const assistsLeader = statLeader("assists");
    const ratingLeader = statLeader("rating");
    const questions = [
        {
            question: "What was the score in our latest tracked game?",
            answers: uniqueAnswers(score, allScores.slice(1)),
            correct: score
        },
        {
            question: "What was the name of the latest team we played?",
            answers: uniqueAnswers(
                getClubName(opponentClub),
                matches
                    .map(match => {
                        const id = getOurClubId(match, clubId);
                        const oppId =
                            Object.keys(match.clubs || {})
                                .find(candidate => candidate !== id);
                        return getClubName(match.clubs?.[oppId]);
                    })
            ),
            correct: getClubName(opponentClub)
        },
        {
            question: "Who scored the most goals in our latest tracked game?",
            answers: uniqueAnswers(
                playerLabel(playerName(goalsLeader)),
                playerNames.map(name => playerLabel(name))
            ),
            correct:
                Number(goalsLeader?.goals || 0) > 0
                    ? playerLabel(playerName(goalsLeader))
                    : null
        },
        {
            question: "Who got the most assists in our latest tracked game?",
            answers: uniqueAnswers(
                playerLabel(playerName(assistsLeader)),
                playerNames.map(name => playerLabel(name))
            ),
            correct:
                Number(assistsLeader?.assists || 0) > 0
                    ? playerLabel(playerName(assistsLeader))
                    : null
        },
        {
            question: "Who had the highest rating in our latest tracked game?",
            answers: uniqueAnswers(
                playerLabel(playerName(ratingLeader)),
                playerNames.map(name => playerLabel(name))
            ),
            correct: playerLabel(playerName(ratingLeader))
        }
    ];

    return questions
        .filter(row => row.answers && row.correct)
        .map(row => shuffleAnswers(row.question, row.answers, 0));
}

function bestChemistryQuestion(matches, clubId) {
    const pairs = new Map();

    for (const match of matches || []) {
        const ourId = getOurClubId(match, clubId);
        const players =
            Object.entries(match.players?.[ourId] || {});

        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const [idA, a] = players[i];
                const [idB, b] = players[j];

                if (
                    !isRealPlayerName(a.playername) ||
                    !isRealPlayerName(b.playername)
                ) {
                    continue;
                }

                const key =
                    [idA, idB].sort().join(":");
                const existing =
                    pairs.get(key) || {
                        names: [
                            playerLabel(playerName(a)),
                            playerLabel(playerName(b))
                        ].sort(),
                        matches: 0,
                        wins: 0,
                        rating: 0,
                        goalContrib: 0
                    };
                const ourClub = match.clubs?.[ourId];
                const opponentId =
                    Object.keys(match.clubs || {})
                        .find(id => id !== ourId);
                const opponentClub = match.clubs?.[opponentId];
                const won =
                    Number(ourClub?.goals || 0) >
                    Number(opponentClub?.goals || 0);

                existing.matches += 1;
                existing.wins += won ? 1 : 0;
                existing.rating +=
                    (Number(a.rating || 0) + Number(b.rating || 0)) / 2;
                existing.goalContrib +=
                    Number(a.goals || 0) +
                    Number(a.assists || 0) +
                    Number(b.goals || 0) +
                    Number(b.assists || 0);
                pairs.set(key, existing);
            }
        }
    }

    const ranked =
        [...pairs.values()]
            .filter(pair => pair.matches >= 2)
            .map(pair => ({
                label: pair.names.join(" + "),
                score:
                    ((pair.wins / pair.matches) * 45) +
                    ((pair.rating / pair.matches) * 6) +
                    ((pair.goalContrib / pair.matches) * 8)
            }))
            .sort((a, b) => b.score - a.score);

    if (ranked.length < 4) {
        return null;
    }

    return shuffleAnswers(
        "Which two players currently have the best tracked chemistry?",
        ranked.slice(0, 4).map(pair => pair.label),
        0
    );
}

async function dynamicQuestion(guildId) {
    const club =
        await db.get(
            `SELECT * FROM clubs WHERE guild_id = ?`,
            [guildId]
        );
    const [players, recentMatches] =
        await Promise.all([
            db.all(
                `
                SELECT *
                FROM players
                WHERE guild_id = ?
                AND COALESCE(matches, 0) > 0
                AND player_name IS NOT NULL
                AND TRIM(player_name) != ''
                AND TRIM(player_name) != '-'
                AND TRIM(player_name) != '--'
                `,
                [guildId]
            ),
            club?.club_id
                ? eaApi.getRecentMatches(
                    club.club_id,
                    {
                        forceRefresh: true,
                        limit: 100,
                        maxResultCount: 100
                    }
                ).catch(() => [])
                : []
        ]);
    const quizPlayers =
        players.filter(player =>
            isRealPlayerName(player.player_name)
        );

    if (quizPlayers.length < 2) {
        const liveQuestions =
            club?.club_id
                ? latestMatchQuestions(recentMatches, club.club_id)
                : [];

        return liveQuestions.length
            ? liveQuestions[Math.floor(Math.random() * liveQuestions.length)]
            : null;
    }

    const sortedBy = key =>
        quizPlayers
            .slice()
            .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0));
    const topRated =
        quizPlayers
            .filter(player => Number(player.matches || 0) > 0)
            .slice()
            .sort((a, b) =>
                (Number(b.total_rating || 0) / Math.max(Number(b.matches || 0), 1)) -
                (Number(a.total_rating || 0) / Math.max(Number(a.matches || 0), 1))
            );
    const categories = [
        {
            question: "Who is currently the team's top tracked goalscorer?",
            correctRow: sortedBy("goals")[0]
        },
        {
            question: "Who currently leads the team for tracked assists?",
            correctRow: sortedBy("assists")[0]
        },
        {
            question: "Who has the highest tracked average rating?",
            correctRow: topRated[0]
        },
        {
            question: "Who has played the most tracked matches?",
            correctRow: sortedBy("matches")[0]
        },
        {
            question: "Who has made the most tracked appearances?",
            correctRow: sortedBy("matches")[0]
        },
        {
            question: "Who has recorded the most tracked clean sheets?",
            correctRow: sortedBy("clean_sheets")[0]
        },
        {
            question: "Who has won the most tracked Man of the Match awards?",
            correctRow: sortedBy("motm")[0]
        },
        {
            question: "Who has the most tracked red cards?",
            correctRow:
                Number(sortedBy("red_cards")[0]?.red_cards || 0) > 0
                    ? sortedBy("red_cards")[0]
                    : null
        }
    ]
        .map(row => ({
            ...row,
            correct: row.correctRow
                ? playerLabel(row.correctRow.player_name)
                : null
        }))
        .filter(row => row.correct);

    if (club?.club_id) {
        categories.push(
            ...latestMatchQuestions(recentMatches, club.club_id)
        );

        const chemistryQuestion =
            bestChemistryQuestion(recentMatches, club.club_id);

        if (chemistryQuestion) {
            categories.push(chemistryQuestion);
        }
    }

    if (!categories.length) {
        return null;
    }

    const selected =
        categories[
            Math.floor(Math.random() * categories.length)
        ];
    if (selected.answers) {
        return selected;
    }

    const distractors =
        quizPlayers
            .map(player =>
                playerLabel(player.player_name)
            )
            .filter(name => name && name !== selected.correct)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

    if (distractors.length < 3) {
        return null;
    }

    return shuffleAnswers(
        selected.question,
        [
            selected.correct,
            ...distractors
        ],
        0
    );
}

async function nextQuestion(guildId) {
    let fallback = null;

    if (Math.random() < 0.2) {
        const dynamic =
            await dynamicQuestion(guildId);

        if (
            dynamic &&
            !wasRecentlyAsked(guildId, dynamic)
        ) {
            rememberQuestion(guildId, dynamic);
            return dynamic;
        }

        fallback = dynamic;
    }

    for (let attempt = 0; attempt < 40; attempt++) {
        const candidate =
            staticQuestion();

        if (!candidate) {
            continue;
        }

        fallback =
            fallback || candidate;

        if (!wasRecentlyAsked(guildId, candidate)) {
            rememberQuestion(guildId, candidate);
            return candidate;
        }
    }

    const safeFallback =
        fallback ||
        STATIC_QUESTIONS
            .map(row => shuffleAnswers(row[0], row[1], row[2]))
            .find(Boolean);

    rememberQuestion(guildId, safeFallback);
    return safeFallback;
}

function createQuestionId() {
    return Math.random()
        .toString(36)
        .slice(2, 10);
}

function questionKey(question) {
    return String(question?.question || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function wasRecentlyAsked(guildId, question) {
    const key =
        questionKey(question);

    if (!key) {
        return false;
    }

    return (recentQuizQuestions.get(guildId) || [])
        .includes(key);
}

function rememberQuestion(guildId, question) {
    const key =
        questionKey(question);

    if (!key) {
        return;
    }

    const recent =
        recentQuizQuestions.get(guildId) || [];

    recent.unshift(key);

    recentQuizQuestions.set(
        guildId,
        [...new Set(recent)]
            .slice(0, RECENT_QUESTION_MEMORY)
    );
}

function buildQuestionEmbed(question, askedCount) {
    return new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle(`\u{1F9E0} Quiz - Question ${askedCount}`)
        .setDescription(
            [
                escapeMarkdown(question.question),
                "",
                ...question.answers.map((answer, index) =>
                    `**${index + 1}.** ${escapeMarkdown(answer)}`
                ),
                "",
                `You have **${TIME_LIMIT_SECONDS} seconds**. Correct answers earn **${QUIZ_XP} XP**.`,
                "Press **Stop** when the room is done."
            ].join("\n")
        )
        .setFooter(FOOTER);
}

function buildButtons(sessionId, questionId) {
    const row =
        new ActionRowBuilder();

    for (let index = 0; index < 4; index++) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`quiz_answer:${sessionId}:${questionId}:${index}`)
                .setLabel(String(index + 1))
                .setStyle(ButtonStyle.Secondary)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`quiz_stop:${sessionId}`)
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger)
    );

    return row;
}

function buildResultsButtons(sessionId, page, totalPages) {
    if (totalPages <= 1) {
        return [];
    }

    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quiz_results:${sessionId}:${page - 1}`)
                    .setLabel("Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 0),
                new ButtonBuilder()
                    .setCustomId(`quiz_results:${sessionId}:${page + 1}`)
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            )
    ];
}

async function awardPlayerXp(guildId, userId, amount) {
    const linked =
        await db.get(
            `
            SELECT *
            FROM linked_players
            WHERE guild_id = ?
            AND discord_id = ?
            `,
            [guildId, userId]
        );

    if (!linked) return false;

    const result =
        await db.run(
            `
            UPDATE players
            SET xp = COALESCE(xp, 0) + ?,
                all_time_xp = COALESCE(all_time_xp, 0) + ?,
                season_xp = COALESCE(season_xp, 0) + ?
            WHERE guild_id = ?
            AND (
                player_id = ?
                OR player_name = ?
            )
            `,
            [
                amount,
                amount,
                amount,
                guildId,
                linked.player_id,
                linked.player_name
            ]
        );

    return result.changes > 0;
}

async function recordAttempt(guildId, userId, correct) {
    await db.run(
        `
        INSERT INTO quiz_scores
        (guild_id, user_id, correct, attempts, xp_awarded, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(guild_id, user_id)
        DO UPDATE SET
            correct = correct + ?,
            attempts = attempts + 1,
            xp_awarded = xp_awarded + ?,
            updated_at = excluded.updated_at
        `,
        [
            guildId,
            userId,
            correct ? 1 : 0,
            correct ? QUIZ_XP : 0,
            Date.now(),
            correct ? 1 : 0,
            correct ? QUIZ_XP : 0
        ]
    );

    if (correct) {
        await awardPlayerXp(guildId, userId, QUIZ_XP);
    }
}

async function getActiveQuiz(guildId) {
    const session =
        await db.get(
        `
        SELECT *
        FROM quiz_sessions
        WHERE guild_id = ?
        AND active = 1
        LIMIT 1
        `,
        [guildId]
    );

    if (
        session &&
        !quizTimers.has(session.session_id)
    ) {
        await db.run(
            `
            UPDATE quiz_sessions
            SET active = 0,
                updated_at = ?
            WHERE session_id = ?
            `,
            [
                Date.now(),
                session.session_id
            ]
        );

        return null;
    }

    return session;
}

async function getEligibleAnswerCount(guild) {
    if (!guild) {
        return 0;
    }

    const fetched =
        await guild.members.fetch().catch(() => null);
    const members =
        fetched || guild.members.cache;
    const humans =
        members?.filter(member => !member.user?.bot);

    if (humans?.size) {
        return humans.size;
    }

    return Math.max(0, Number(guild.memberCount || 0) - 1);
}

function mentionSummary(rows) {
    if (!rows.length) {
        return "No one";
    }

    return rows
        .map(row => `<@${row.user_id}>`)
        .join(", ")
        .slice(0, 900);
}

async function buildResultContent(session, question, reason) {
    const answers =
        await db.all(
            `
            SELECT *
            FROM quiz_answers
            WHERE session_id = ?
            AND question_id = ?
            ORDER BY answered_at ASC
            `,
            [
                session.session_id,
                session.current_question_id
            ]
        );
    const correctRows =
        answers.filter(row => Number(row.correct));
    const wrongRows =
        answers.filter(row => !Number(row.correct));

    for (const row of answers) {
        await recordAttempt(
            session.guild_id,
            row.user_id,
            Boolean(Number(row.correct))
        );
    }

    const correctAnswer =
        question.answers?.[question.correct] || "unknown";
    const closeLine =
        reason === "all_answered"
            ? "\u{1F4E3} Everyone answered."
            : "\u23F1\uFE0F Time is up.";

    return [
        closeLine,
        `Correct answer: **${escapeMarkdown(correctAnswer)}**`,
        `\u2705 Correct: ${mentionSummary(correctRows)}`,
        `\u274C Wrong: ${mentionSummary(wrongRows)}`,
        correctRows.length
            ? `Awarded **${QUIZ_XP} XP** to each correct answer.`
            : "No XP awarded this round.",
        "",
        "Next question:"
    ].join("\n").slice(0, 1900);
}

async function getCurrentQuestionAnswerCount(session) {
    const row =
        await db.get(
            `
            SELECT COUNT(*) AS count
            FROM quiz_answers
            WHERE session_id = ?
            AND question_id = ?
            `,
            [
                session.session_id,
                session.current_question_id
            ]
        );

    return Number(row?.count || 0);
}

async function stopQuizForNoAnswers(client, session, question) {
    await db.run(
        `
        UPDATE quiz_sessions
        SET active = 0,
            updated_at = ?
        WHERE session_id = ?
        `,
        [
            Date.now(),
            session.session_id
        ]
    );

    clearQuizTimer(session.session_id);

    const correctAnswer =
        question.answers?.[question.correct] || "unknown";
    const payload =
        await buildQuizResultsPayload(
            session.guild_id,
            session.session_id,
            0
        );

    await postReplacementQuizMessage(
        client,
        session,
        {
            content:
                [
                    "Quiz stopped because no one answered the last question.",
                    `Correct answer: **${escapeMarkdown(correctAnswer)}**`,
                    `Stopped after ${number(session.asked_count)} question${Number(session.asked_count) === 1 ? "" : "s"}.`
                ].join("\n"),
            ...payload
        }
    );
}

async function scoreCurrentQuestionOnStop(session) {
    const answers =
        await db.all(
            `
            SELECT *
            FROM quiz_answers
            WHERE session_id = ?
            AND question_id = ?
            `,
            [
                session.session_id,
                session.current_question_id
            ]
        );

    for (const row of answers) {
        await recordAttempt(
            session.guild_id,
            row.user_id,
            Boolean(Number(row.correct))
        );
    }

    return answers;
}

async function buildQuizResultsPayload(guildId, sessionId, page = 0) {
    const [session, rows] =
        await Promise.all([
            db.get(
                `
                SELECT *
                FROM quiz_sessions
                WHERE session_id = ?
                AND guild_id = ?
                `,
                [sessionId, guildId]
            ),
            db.all(
                `
                SELECT
                    user_id,
                    COUNT(*) AS attempts,
                    SUM(correct) AS correct
                FROM quiz_answers
                WHERE session_id = ?
                AND guild_id = ?
                GROUP BY user_id
                HAVING attempts > 0
                ORDER BY correct DESC, attempts ASC, user_id ASC
                `,
                [sessionId, guildId]
            )
        ]);

    const totalPages =
        Math.max(
            1,
            Math.ceil(rows.length / RESULTS_PAGE_SIZE)
        );
    const safePage =
        Math.max(
            0,
            Math.min(
                Number(page || 0),
                totalPages - 1
            )
        );
    const pageRows =
        rows.slice(
            safePage * RESULTS_PAGE_SIZE,
            safePage * RESULTS_PAGE_SIZE + RESULTS_PAGE_SIZE
        );
    const totalAttempts =
        rows.reduce(
            (sum, row) => sum + Number(row.attempts || 0),
            0
        );
    const totalCorrect =
        rows.reduce(
            (sum, row) => sum + Number(row.correct || 0),
            0
        );
    const lines =
        pageRows.length
            ? pageRows.map((row, index) => {
                const rank =
                    safePage * RESULTS_PAGE_SIZE + index + 1;
                const correct =
                    Number(row.correct || 0);
                const attempts =
                    Number(row.attempts || 0);
                const percent =
                    attempts
                        ? Math.round((correct / attempts) * 100)
                        : 0;

                return `**#${rank}** <@${row.user_id}> - **${correct}/${attempts}** (${percent}%) - ${number(correct * QUIZ_XP)} XP`;
            })
            : ["No one answered any questions."];
    const embed =
        new EmbedBuilder()
            .setColor("#ffffff")
            .setTitle("\u{1F9E0} Quiz Results")
            .setDescription(
                [
                    `Questions: **${number(session?.asked_count || 0)}**`,
                    `Players: **${number(rows.length)}**`,
                    `Answered: **${number(totalAttempts)}**`,
                    `Correct: **${number(totalCorrect)}**`,
                    "",
                    lines.join("\n")
                ].join("\n")
            )
            .setFooter({
                ...FOOTER,
                text:
                    `${FOOTER.text} - Page ${safePage + 1}/${totalPages}`
            });

    return {
        embeds: [embed],
        components: buildResultsButtons(
            sessionId,
            safePage,
            totalPages
        )
    };
}

function clearQuizTimer(sessionId) {
    const timer =
        quizTimers.get(sessionId);

    if (timer) {
        clearTimeout(timer);
        quizTimers.delete(sessionId);
    }
}

async function postReplacementQuizMessage(client, session, payload) {
    const channel =
        await client.channels
            .fetch(session.channel_id)
            .catch(() => null);

    if (!channel) {
        return null;
    }

    const previous =
        session.message_id
            ? await channel.messages
                .fetch(session.message_id)
                .catch(() => null)
            : null;
    const sent =
        await channel.send(payload)
            .catch(err => {
                console.error("quiz repost error:", err);
                return null;
            });

    if (sent) {
        if (previous) {
            await previous.delete().catch(() => null);
        }

        return sent;
    }

    if (previous) {
        await previous.edit(payload).catch(() => null);
        return previous;
    }

    return null;
}

async function advanceQuiz(client, sessionId, expectedQuestionId, reason = "time") {
    const advanceKey =
        `${sessionId}:${expectedQuestionId}`;

    if (advancingQuestions.has(advanceKey)) {
        return;
    }

    advancingQuestions.add(advanceKey);
    clearQuizTimer(sessionId);

    const session =
        await db.get(
            `
            SELECT *
            FROM quiz_sessions
            WHERE session_id = ?
            `,
            [sessionId]
        );

    if (
        !session ||
        !Number(session.active) ||
        session.current_question_id !== expectedQuestionId
    ) {
        advancingQuestions.delete(advanceKey);
        return;
    }

    try {
        const current =
            JSON.parse(session.current_question_json || "{}");
        const answerCount =
            await getCurrentQuestionAnswerCount(session);

        if (
            reason === "time" &&
            answerCount === 0
        ) {
            await stopQuizForNoAnswers(
                client,
                session,
                current
            );
            return;
        }

        const next =
            await nextQuestion(session.guild_id);
        const nextQuestionId =
            createQuestionId();
        const nextCount =
            Number(session.asked_count || 0) + 1;
        const resultContent =
            await buildResultContent(session, current, reason);
        const message =
            await postReplacementQuizMessage(
                client,
                session,
                {
                    content: resultContent,
                    embeds: [buildQuestionEmbed(next, nextCount)],
                    components: [buildButtons(sessionId, nextQuestionId)]
                }
            );

        await db.run(
            `
            UPDATE quiz_sessions
            SET current_question_id = ?,
                current_question_json = ?,
                asked_count = ?,
                message_id = ?,
                updated_at = ?
            WHERE session_id = ?
            `,
            [
                nextQuestionId,
                JSON.stringify(next),
                nextCount,
                message?.id || session.message_id,
                Date.now(),
                sessionId
            ]
        );

        scheduleQuizAdvance(client, sessionId, nextQuestionId);
    } finally {
        advancingQuestions.delete(advanceKey);
    }
}

function scheduleQuizAdvance(client, sessionId, expectedQuestionId) {
    clearQuizTimer(sessionId);

    const timer =
        setTimeout(() => {
            advanceQuiz(
                client,
                sessionId,
                expectedQuestionId,
                "time"
            ).catch(err =>
                console.error("quiz advance error:", err)
            );
        }, TIME_LIMIT_SECONDS * 1000);

    quizTimers.set(sessionId, timer);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("quiz")
        .setDescription("Football quiz")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("Start a continuous timed quiz")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("leaderboard")
                .setDescription("Show quiz leaderboard")
        ),

    async execute(interaction) {
        const subcommand =
            interaction.options.getSubcommand();

        if (subcommand === "leaderboard") {
            await interaction.deferReply();

            const rows =
                await db.all(
                    `
                    SELECT *
                    FROM quiz_scores
                    WHERE guild_id = ?
                    ORDER BY correct DESC, xp_awarded DESC
                    LIMIT 10
                    `,
                    [interaction.guild.id]
                );
            const lines =
                rows.length
                    ? rows.map((row, index) =>
                        `**#${index + 1}** <@${row.user_id}> - ${number(row.correct)} correct, ${number(row.xp_awarded)} XP`
                    )
                    : ["No quiz scores yet."];
            const embed =
                new EmbedBuilder()
                    .setColor("#ffffff")
                    .setTitle("\u{1F9E0} Quiz Leaderboard")
                    .setDescription(lines.join("\n"))
                    .setFooter(FOOTER);

            return interaction.editReply({ embeds: [embed] });
        }

        const sessionId =
            interaction.id;
        const question =
            await nextQuestion(interaction.guild.id);
        const questionId =
            createQuestionId();

        await db.run(
            `
            INSERT INTO quiz_sessions
            (session_id, guild_id, channel_id, message_id, creator_id, current_question_id, current_question_json, active, asked_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
            `,
            [
                sessionId,
                interaction.guild.id,
                interaction.channel.id,
                null,
                interaction.user.id,
                questionId,
                JSON.stringify(question),
                Date.now(),
                Date.now()
            ]
        );

        const reply =
            await interaction.reply({
                embeds: [buildQuestionEmbed(question, 1)],
                components: [buildButtons(sessionId, questionId)],
                fetchReply: true
            });

        await db.run(
            `UPDATE quiz_sessions SET message_id = ? WHERE session_id = ?`,
            [reply.id, sessionId]
        );

        scheduleQuizAdvance(
            interaction.client,
            sessionId,
            questionId
        );
    },

    async handleAnswer(interaction) {
        const [, sessionId, clickedQuestionId, answerRaw] =
            interaction.customId.split(":");
        const session =
            await db.get(
                `
                SELECT *
                FROM quiz_sessions
                WHERE session_id = ?
                AND guild_id = ?
                `,
                [sessionId, interaction.guild.id]
            );

        if (!session || !Number(session.active)) {
            return interaction.reply({
                content: "That quiz has already stopped.",
                ephemeral: true
            });
        }

        if (session.current_question_id !== clickedQuestionId) {
            return interaction.reply({
                content: "That question has already moved on.",
                ephemeral: true
            });
        }

        const question =
            JSON.parse(session.current_question_json || "{}");
        const answer =
            Number(answerRaw);
        const isCorrect =
            answer === Number(question.correct);
        const alreadyAnswered =
            await db.get(
                `
                SELECT *
                FROM quiz_answers
                WHERE session_id = ?
                AND question_id = ?
                AND user_id = ?
                `,
                [
                    sessionId,
                    clickedQuestionId,
                    interaction.user.id
                ]
            );

        if (alreadyAnswered) {
            return interaction.reply({
                content: "You have already answered this question.",
                ephemeral: true
            });
        }

        await db.run(
            `
            INSERT INTO quiz_answers
            (session_id, guild_id, question_id, user_id, answer_index, correct, answered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                sessionId,
                interaction.guild.id,
                clickedQuestionId,
                interaction.user.id,
                answer,
                isCorrect ? 1 : 0,
                Date.now()
            ]
        );

        await interaction.reply({
            content: "Answer submitted. Results will show when the question closes.",
            ephemeral: true
        });

        const answered =
            await db.get(
                `
                SELECT COUNT(*) AS count
                FROM quiz_answers
                WHERE session_id = ?
                AND question_id = ?
                `,
                [
                    sessionId,
                    clickedQuestionId
                ]
            );
        const eligibleCount =
            await getEligibleAnswerCount(interaction.guild);

        if (
            eligibleCount > 0 &&
            Number(answered?.count || 0) >= eligibleCount
        ) {
            await advanceQuiz(
                interaction.client,
                sessionId,
                clickedQuestionId,
                "all_answered"
            );
        }
    },

    async handleStop(interaction) {
        const [, sessionId] =
            interaction.customId.split(":");
        const session =
            await db.get(
                `
                SELECT *
                FROM quiz_sessions
                WHERE session_id = ?
                AND guild_id = ?
                `,
                [sessionId, interaction.guild.id]
            );

        if (!session) {
            return interaction.reply({
                content: "That quiz session no longer exists.",
                ephemeral: true
            });
        }

        if (!Number(session.active)) {
            return interaction.reply({
                content: "That quiz has already stopped.",
                ephemeral: true
            });
        }

        const currentQuestion =
            JSON.parse(session.current_question_json || "{}");
        const answers =
            await scoreCurrentQuestionOnStop(session);

        await db.run(
            `
            UPDATE quiz_sessions
            SET active = 0,
                updated_at = ?
            WHERE session_id = ?
            `,
            [Date.now(), sessionId]
        );

        clearQuizTimer(sessionId);

        const payload =
            await buildQuizResultsPayload(
                interaction.guild.id,
                sessionId,
                0
            );

        const stopLines = [
            `Quiz stopped after ${number(session.asked_count)} question${Number(session.asked_count) === 1 ? "" : "s"}.`
        ];

        if (answers.length) {
            const correctAnswer =
                currentQuestion.answers?.[currentQuestion.correct] || "unknown";
            const correctRows =
                answers.filter(row => Number(row.correct));
            const wrongRows =
                answers.filter(row => !Number(row.correct));

            stopLines.push(
                `Last question answer: **${escapeMarkdown(correctAnswer)}**`,
                `\u2705 Correct: ${mentionSummary(correctRows)}`,
                `\u274C Wrong: ${mentionSummary(wrongRows)}`
            );
        }

        return interaction.update({
            content: stopLines.join("\n").slice(0, 1900),
            ...payload
        });
    },

    async handleResultsPage(interaction) {
        const [, sessionId, pageRaw] =
            interaction.customId.split(":");
        const payload =
            await buildQuizResultsPayload(
                interaction.guild.id,
                sessionId,
                Number(pageRaw || 0)
            );

        return interaction.update(payload);
    },

    async hasActiveQuiz(guildId) {
        return Boolean(
            await getActiveQuiz(guildId)
        );
    }
};
