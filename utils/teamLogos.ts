const NHL_ABBREVS: Record<string, string> = {
  "Anaheim Ducks": "ANA",
  "Boston Bruins": "BOS",
  "Buffalo Sabres": "BUF",
  "Calgary Flames": "CGY",
  "Carolina Hurricanes": "CAR",
  "Chicago Blackhawks": "CHI",
  "Colorado Avalanche": "COL",
  "Columbus Blue Jackets": "CBJ",
  "Dallas Stars": "DAL",
  "Detroit Red Wings": "DET",
  "Edmonton Oilers": "EDM",
  "Florida Panthers": "FLA",
  "Los Angeles Kings": "LA",
  "Minnesota Wild": "MIN",
  "Montréal Canadiens": "MTL",
  "Nashville Predators": "NSH",
  "New Jersey Devils": "NJD",
  "New York Islanders": "NYI",
  "New York Rangers": "NYR",
  "Ottawa Senators": "OTT",
  "Philadelphia Flyers": "PHI",
  "Pittsburgh Penguins": "PIT",
  "San Jose Sharks": "SJ",
  "Seattle Kraken": "SEA",
  "St. Louis Blues": "STL",
  "Tampa Bay Lightning": "TB",
  "Toronto Maple Leafs": "TOR",
  "Utah Mammoth": "UTA",
  "Vancouver Canucks": "VAN",
  "Vegas Golden Knights": "VGK",
  "Washington Capitals": "WSH",
  "Winnipeg Jets": "WPG",
};

const ESPN_SOCCER_IDS: Record<string, string> = {
  "Arsenal": "359",
  "Aston Villa": "362",
  "Bournemouth": "349",
  "Brentford": "337",
  "Brighton": "331",
  "Brighton & Hove Albion": "331",
  "Chelsea": "363",
  "Crystal Palace": "384",
  "Everton": "368",
  "Fulham": "370",
  "Leeds": "357",
  "Leeds United": "357",
  "Leicester City": "375",
  "Liverpool": "364",
  "Man City": "382",
  "Manchester City": "382",
  "Man Utd": "360",
  "Manchester United": "360",
  "Newcastle United": "361",
  "Newcastle": "361",
  "Nott'm Forest": "393",
  "Nottingham Forest": "393",
  "Southampton": "376",
  "Spurs": "367",
  "Tottenham Hotspur": "367",
  "West Ham": "371",
  "West Ham United": "371",
  "Wolves": "380",
  "Wolverhampton Wanderers": "380",
  "Burnley": "379",
  "Birmingham City": "332",
  "Bristol City": "340",
  "Burton Albion": "2288",
  "Grimsby Town": "402",
  "Mansfield Town": "414",
  "Norwich City": "381",
  "Oxford United": "420",
  "Port Vale": "426",
  "Salford City": "7280",
  "Stoke City": "336",
  "Sunderland": "366",
  "West Bromwich Albion": "383",
  "Wigan Athletic": "395",
  "Macclesfield FC": "7957",
  "FC Barcelona": "83",
  "Real Madrid": "86",
  "Atlético de Madrid": "1068",
  "Atlético Madrid": "1068",
  "Sevilla FC": "243",
  "Sevilla": "243",
  "Real Betis": "244",
  "Real Sociedad": "89",
  "Villarreal CF": "102",
  "Villarreal": "102",
  "Athletic Club": "93",
  "Celta": "85",
  "Celta Vigo": "85",
  "Valencia CF": "94",
  "Valencia": "94",
  "Getafe CF": "2922",
  "Getafe": "2922",
  "CA Osasuna": "97",
  "Osasuna": "97",
  "RCD Mallorca": "3709",
  "Mallorca": "3709",
  "Rayo Vallecano": "101",
  "Girona FC": "9812",
  "Girona": "9812",
  "Deportivo Alavés": "96",
  "Alavés": "96",
  "RCD Espanyol de Barcelona": "88",
  "Espanyol": "88",
  "Elche CF": "3751",
  "Elche": "3751",
  "Levante UD": "1538",
  "Levante": "1538",
  "Real Oviedo": "92",
  "Barcelona": "83",
  "Juventus": "111",
  "Inter": "110",
  "Internazionale": "110",
  "AC Milan": "103",
  "Milan": "103",
  "Napoli": "114",
  "AS Roma": "104",
  "Roma": "104",
  "Lazio": "112",
  "Atalanta": "105",
  "Fiorentina": "109",
  "Bologna": "107",
  "Torino": "239",
  "Genoa": "3263",
  "Udinese": "118",
  "Cagliari": "2925",
  "Lecce": "113",
  "Parma": "115",
  "Hellas Verona": "119",
  "Como": "2572",
  "Sassuolo": "3997",
  "Cremonese": "4050",
  "Pisa": "3956",
  "FC Bayern München": "132",
  "Bayern Munich": "132",
  "Borussia Dortmund": "124",
  "RB Leipzig": "11420",
  "Bayer 04 Leverkusen": "131",
  "Bayer Leverkusen": "131",
  "Eintracht Frankfurt": "125",
  "VfB Stuttgart": "134",
  "Borussia Mönchengladbach": "268",
  "SV Werder Bremen": "137",
  "Werder Bremen": "137",
  "VfL Wolfsburg": "138",
  "1. FC Union Berlin": "598",
  "Sport-Club Freiburg": "126",
  "SC Freiburg": "126",
  "TSG Hoffenheim": "7911",
  "1. FSV Mainz 05": "2950",
  "Mainz": "2950",
  "FC Augsburg": "3841",
  "1. FC Heidenheim 1846": "6418",
  "FC St. Pauli": "270",
  "St. Pauli": "270",
  "1. FC Köln": "122",
  "FC Cologne": "122",
  "Hamburger SV": "127",
  "Hamburg SV": "127",
  "Paris Saint-Germain": "160",
  "PSG": "160",
  "Olympique de Marseille": "176",
  "Marseille": "176",
  "Olympique Lyonnais": "167",
  "Lyon": "167",
  "AS Monaco": "174",
  "LOSC Lille": "166",
  "Lille": "166",
  "RC Lens": "170",
  "Lens": "170",
  "OGC Nice": "2502",
  "Nice": "2502",
  "Stade Rennais FC": "169",
  "Stade Rennais": "169",
  "Stade Brestois 29": "6997",
  "Brest": "6997",
  "Toulouse FC": "179",
  "Toulouse": "179",
  "RC Strasbourg Alsace": "180",
  "Strasbourg": "180",
  "FC Nantes": "165",
  "Nantes": "165",
  "FC Lorient": "273",
  "Lorient": "273",
  "AJ Auxerre": "172",
  "Angers SCO": "7868",
  "Angers": "7868",
  "FC Metz": "177",
  "Metz": "177",
  "Havre Athletic Club": "3236",
  "Le Havre AC": "3236",
  "Le Havre": "3236",
  "Paris FC": "6851",
  "Atlanta United": "18418",
  "Atlanta United FC": "18418",
  "Austin FC": "20906",
  "CF Montréal": "9720",
  "Charlotte FC": "21300",
  "Chicago Fire FC": "182",
  "Colorado Rapids": "184",
  "Columbus Crew": "183",
  "D.C. United": "193",
  "FC Cincinnati": "18267",
  "FC Dallas": "185",
  "Houston Dynamo FC": "6077",
  "Inter Miami CF": "20232",
  "LA Galaxy": "187",
  "LAFC": "18966",
  "Los Angeles Football Club": "18966",
  "Minnesota United FC": "17362",
  "Nashville SC": "18986",
  "New England Revolution": "189",
  "New York City FC": "17606",
  "New York City Football Club": "17606",
  "Orlando City": "12011",
  "Orlando City SC": "12011",
  "Philadelphia Union": "10739",
  "Portland Timbers": "9723",
  "Real Salt Lake": "4771",
  "Red Bull New York": "190",
  "San Diego FC": "22529",
  "San Jose Earthquakes": "191",
  "Seattle Sounders FC": "9726",
  "Sporting Kansas City": "186",
  "St. Louis CITY SC": "21812",
  "Toronto FC": "7318",
  "Vancouver Whitecaps": "9727",
  "Vancouver Whitecaps FC": "9727",
  "Atleti": "1068",
  "B. Dortmund": "124",
  "Benfica": "219",
  "Bodø/Glimt": "14862",
  "Club Brugge": "271",
  "Galatasaray": "432",
  "Leverkusen": "131",
  "Monaco": "174",
  "Olympiacos": "237",
  "Paris": "160",
  "Qarabag": "12826",
  "Wrexham": "18513",
  "Birmingham Legion FC": "19405",
  "Charleston Battery": "9729",
  "Colorado Springs Switchbacks FC": "17830",
  "Detroit City FC": "19179",
  "El Paso Locomotive FC": "19407",
  "FC Tulsa": "18446",
  "Hartford Athletic": "19411",
  "Indy Eleven": "17360",
  "Las Vegas Lights FC": "18987",
  "Loudoun United FC": "19410",
  "Louisville City FC": "17832",
  "Miami FC": "18159",
  "New Mexico United": "19408",
  "Oakland Roots": "20687",
  "Orange County SC": "18455",
  "Phoenix Rising FC": "17850",
  "Pittsburgh Riverhounds": "17827",
  "Rhode Island FC": "22164",
  "Sacramento Republic FC": "17828",
  "San Antonio FC": "18265",
  "Tampa Bay Rowdies": "17361",
  "Brooklyn FC": "131579",
  "Lexington": "21822",
  "Lexington SC": "21822",
  "Monterey Bay": "21370",
  "Monterey Bay FC": "21370",
  "Sporting JAX": "131578",
  "Angel City": "21422",
  "Angel City FC": "21422",
  "Bay FC": "22187",
  "Bay": "22187",
  "Chicago Stars": "15360",
  "Chicago Stars FC": "15360",
  "Gotham FC": "15364",
  "Houston Dash": "17346",
  "Kansas City Current": "20907",
  "North Carolina Courage": "15366",
  "Orlando Pride": "18206",
  "Portland Thorns": "15362",
  "Portland Thorns FC": "15362",
  "Racing Louisville": "20905",
  "Racing Louisville FC": "20905",
  "San Diego Wave": "21423",
  "San Diego Wave FC": "21423",
  "Seattle Reign": "15363",
  "Seattle Reign FC": "15363",
  "Utah Royals": "19141",
  "Washington Spirit": "15365",
};

const ESPN_RUGBY_IDS: Record<string, string> = {
  "Leinster": "25924",
  "Munster": "25925",
  "Ulster": "25926",
  "Connacht": "25923",
  "Glasgow": "25952",
  "Edinburgh": "25951",
  "Cardiff": "25965",
  "Dragons": "25967",
  "Ospreys": "25968",
  "Scarlets": "25966",
  "Bulls Super": "25953",
  "Lions Super": "25958",
  "Stormers": "25962",
  "The Sharks": "25961",
  "Benetton": "25927",
  "Zebre": "167124",
  "ACT Brumbies": "25889",
  "Blues": "25932",
  "Chiefs": "25934",
  "Crusaders": "25936",
  "Fijian Drua": "289338",
  "Highlanders": "25938",
  "Hurricanes": "25939",
  "Moana Pasifika": "289319",
  "NSW Waratahs": "227",
  "Queensland Reds": "182",
  "Western Force": "25893",
  "Bath": "25898",
  "Bath Rugby": "25898",
  "Exeter Chiefs": "116227",
  "Exeter": "116227",
  "Gloucester": "25900",
  "Gloucester Rugby": "25900",
  "Harlequins": "25901",
  "Leicester Tigers": "25903",
  "Leicester": "25903",
  "Newcastle Falcons": "25906",
  "Northampton Saints": "25907",
  "Northampton": "25907",
  "Sale Sharks": "25908",
  "Sale": "25908",
  "Saracens": "25909",
  "Bristol": "25899",
  "Bristol Bears": "25899",
};

const ESPN_COLLEGE_IDS: Record<string, string> = {
  "Boston University": "104",
  "Boston College": "103",
  "New Hampshire": "160",
  "Mass.-Lowell": "2349",
  "UMass Lowell": "2349",
};

const JL1_LOGO_MAP: Record<string, string> = {
  "Saitama Wild Knights": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11186_200x200_670e724c02c54.png",
  "Mie Honda Heat": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11191_200x200_670e756fdc7f9.png",
  "Kobelco Kobe Steelers": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11185_200x200_670e71b093142.png",
  "Tokyo Sungoliath": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11188_200x200_670e738b02420.png",
  "Brave Lupus Tokyo": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11189_200x200_670e7448a796a.png",
  "Kubota Spears": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11182_200x200_670e7046b8c3a.png",
  "Urayasu D-Rocks": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11184_200x200_670e70ccbfbc7.png",
  "Yokohama Canon Eagles": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11193_200x200_670e75f78a9bc.png",
  "Shizuoka Blue Revs": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11187_200x200_670e72d6dee20.png",
  "Toyota Verblitz": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11190_200x200_670e74a74f0b5.png",
  "Black Rams Tokyo": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11194_200x200_670e765eedceb.png",
  "Sagamihara Dynaboars": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11192_200x200_670e75a955eea.png",
};

const LNR_BASE = "https://cdn.lnr.fr/club";
const LNR_HASH = "3b11bd4ce6d123075823c85941013c743abb7668";
const lnr = (slug: string) => `${LNR_BASE}/${slug}/photo/logo.${LNR_HASH}`;

const TOP14_LOGO_MAP: Record<string, string> = {
  // Official logos from top14.lnr.fr/classement
  "Toulouse":       lnr("toulouse"),
  "Pau":            lnr("pau"),
  "Stade Français": lnr("paris"),
  "Bordeaux":       lnr("bordeaux-begles"),
  "Montpellier":    lnr("montpellier"),
  "Clermont":       lnr("clermont"),
  "Racing 92":      lnr("racing-92"),
  "Castres":        lnr("castres"),
  "La Rochelle":    lnr("la-rochelle"),
  "Bayonne":        lnr("bayonne"),
  "Toulon":         lnr("toulon"),
  "Lyon":           lnr("lyon"),
  "Perpignan":      lnr("perpignan"),
  "Montauban":      lnr("montauban"),
  // Legacy name aliases
  "Racing Métro":   lnr("racing-92"),
};

const CRICKET_COUNTRY_FLAGS: Record<string, string> = {
  "India": "https://a.espncdn.com/i/teamlogos/countries/500/ind.png",
  "Australia": "https://a.espncdn.com/i/teamlogos/countries/500/aus.png",
  "England": "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
  "New Zealand": "https://a.espncdn.com/i/teamlogos/countries/500/nzl.png",
  "South Africa": "https://a.espncdn.com/i/teamlogos/countries/500/rsa.png",
  "Pakistan": "https://a.espncdn.com/i/teamlogos/countries/500/pak.png",
  "Sri Lanka": "https://a.espncdn.com/i/teamlogos/countries/500/sri.png",
  "West Indies": "https://a.espncdn.com/i/teamlogos/countries/500/wnd.png",
  "Afghanistan": "https://a.espncdn.com/i/teamlogos/countries/500/afg.png",
  "Zimbabwe": "https://a.espncdn.com/i/teamlogos/countries/500/zim.png",
  "Netherlands": "https://a.espncdn.com/i/teamlogos/countries/500/ned.png",
  "Scotland": "https://a.espncdn.com/i/teamlogos/countries/500/sco.png",
  "Namibia": "https://a.espncdn.com/i/teamlogos/countries/500/nam.png",
  "Nepal": "https://a.espncdn.com/i/teamlogos/countries/500/nep.png",
  "Oman": "https://a.espncdn.com/i/teamlogos/countries/500/omn.png",
  "UAE": "https://a.espncdn.com/i/teamlogos/countries/500/uae.png",
  "USA": "https://a.espncdn.com/i/teamlogos/countries/500/usa.png",
  "Canada": "https://a.espncdn.com/i/teamlogos/countries/500/can.png",
  "Ireland": "https://a.espncdn.com/i/teamlogos/countries/500/irl.png",
  "Italy": "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
  "Bangladesh": "https://a.espncdn.com/i/teamlogos/countries/500/ban.png",
  "Papua New Guinea": "https://a.espncdn.com/i/teamlogos/countries/500/png.png",
  "Uganda": "https://a.espncdn.com/i/teamlogos/countries/500/uga.png",
};

const OLYMPIC_HOCKEY_FLAGS: Record<string, string> = {
  "Canada": "https://a.espncdn.com/i/teamlogos/countries/500/can.png",
  "USA": "https://a.espncdn.com/i/teamlogos/countries/500/usa.png",
  "Finland": "https://a.espncdn.com/i/teamlogos/countries/500/fin.png",
  "Sweden": "https://a.espncdn.com/i/teamlogos/countries/500/swe.png",
  "Czechia": "https://a.espncdn.com/i/teamlogos/countries/500/cze.png",
  "Germany": "https://a.espncdn.com/i/teamlogos/countries/500/ger.png",
  "Switzerland": "https://a.espncdn.com/i/teamlogos/countries/500/sui.png",
  "Slovakia": "https://a.espncdn.com/i/teamlogos/countries/500/svk.png",
  "Denmark": "https://a.espncdn.com/i/teamlogos/countries/500/den.png",
  "Latvia": "https://a.espncdn.com/i/teamlogos/countries/500/lat.png",
  "France": "https://a.espncdn.com/i/teamlogos/countries/500/fra.png",
  "Italy": "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
};

const SIX_NATIONS_FLAGS: Record<string, string> = {
  "France": "https://a.espncdn.com/i/teamlogos/countries/500/fra.png",
  "Ireland": "https://a.espncdn.com/i/teamlogos/countries/500/irl.png",
  "Italy": "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
  "Wales": "https://a.espncdn.com/i/teamlogos/countries/500/wal.png",
  "England": "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
  "Scotland": "https://a.espncdn.com/i/teamlogos/countries/500/sco.png",
};

const ESPN_F1_IDS: Record<string, string> = {
  "Red Bull Racing": "1",
  "Red Bull": "1",
  "Ferrari": "2",
  "McLaren": "3",
  "Mercedes": "4",
  "Aston Martin": "5",
  "Alpine": "6",
  "Williams": "7",
  "Haas": "8",
  "Haas F1 Team": "8",
  "RB": "9",
  "VCARB": "9",
  "Visa Cash App RB": "9",
  "Sauber": "10",
  "Kick Sauber": "10",
};

const ECHL_HOCKEYTECH_IDS: Record<string, string> = {
  "Adirondack Thunder": "74",
  "Allen Americans": "66",
  "Atlanta Gladiators": "10",
  "Bloomington Bison": "107",
  "Cincinnati Cyclones": "5",
  "Florida Everblades": "8",
  "Fort Wayne Komets": "60",
  "Greensboro Gargoyles": "108",
  "Greenville Swamp Rabbits": "52",
  "Idaho Steelheads": "11",
  "Indy Fuel": "65",
  "Iowa Heartlanders": "98",
  "Jacksonville Icemen": "79",
  "Kalamazoo Wings": "50",
  "Kansas City Mavericks": "68",
  "Maine Mariners": "82",
  "Norfolk Admirals": "76",
  "Orlando Solar Bears": "61",
  "Rapid City Rush": "70",
  "Reading Royals": "17",
  "Savannah Ghost Pirates": "102",
  "South Carolina Stingrays": "18",
  "Tahoe Knight Monsters": "106",
  "Toledo Walleye": "21",
  "Trois-Rivières Lions": "99",
  "Tulsa Oilers": "71",
  "Utah Grizzlies": "23",
  "Wheeling Nailers": "25",
  "Wichita Thunder": "72",
  "Worcester Railers": "77",
};

const AHL_LOGO_URLS: Record<string, string> = {
  "Abbotsford Canucks":           "https://theahl.com/wp-content/uploads/sites/3/2021/07/abbotsford21_64-1.png",
  "Bakersfield Condors":          "https://theahl.com/wp-content/uploads/sites/3/2022/07/bakersfield22_64.png",
  "Belleville Senators":          "https://theahl.com/wp-content/uploads/sites/3/2019/09/belleville18_64-1.png",
  "Bridgeport Islanders":         "https://theahl.com/wp-content/uploads/sites/3/2024/07/bridgeport24_64-1.png",
  "Calgary Wranglers":            "https://theahl.com/wp-content/uploads/sites/3/2022/08/calgary22_64-1.png",
  "Charlotte Checkers":           "https://theahl.com/wp-content/uploads/sites/3/2019/09/charlotte64-1.png",
  "Chicago Wolves":               "https://theahl.com/wp-content/uploads/sites/3/2019/09/chicago64-1.png",
  "Cleveland Monsters":           "https://theahl.com/wp-content/uploads/sites/3/2023/07/cleveland23_64-1.png",
  "Coachella Valley Firebirds":   "https://theahl.com/wp-content/uploads/sites/3/2021/11/coachellavalley_64.png",
  "Colorado Eagles":              "https://theahl.com/wp-content/uploads/sites/3/2022/07/colorado_64.png",
  "Grand Rapids Griffins":        "https://theahl.com/wp-content/uploads/sites/3/2019/09/grandrapids64-1.png",
  "Hartford Wolf Pack":           "https://theahl.com/wp-content/uploads/sites/3/2019/09/hartford64-1.png",
  "Henderson Silver Knights":     "https://theahl.com/wp-content/uploads/sites/3/2020/05/henderson20_64.png",
  "Hershey Bears":                "https://theahl.com/wp-content/uploads/sites/3/2019/09/hershey64-1.png",
  "Iowa Wild":                    "https://theahl.com/wp-content/uploads/sites/3/2019/09/iowa_word64-1.png",
  "Laval Rocket":                 "https://theahl.com/wp-content/uploads/sites/3/2019/09/laval64-1.png",
  "Lehigh Valley Phantoms":       "https://theahl.com/wp-content/uploads/sites/3/2019/09/lv_64_dark.png",
  "Manitoba Moose":               "https://theahl.com/wp-content/uploads/sites/3/2019/09/manitoba64-1.png",
  "Milwaukee Admirals":           "https://theahl.com/wp-content/uploads/sites/3/2019/09/milwaukee64-1.png",
  "Ontario Reign":                "https://theahl.com/wp-content/uploads/sites/3/2016/04/ontario64.png",
  "Providence Bruins":            "https://theahl.com/wp-content/uploads/sites/3/2019/09/providence64_dark.png",
  "Rochester Americans":          "https://theahl.com/wp-content/uploads/sites/3/2019/09/rochester64.png",
  "Rockford IceHogs":             "https://theahl.com/wp-content/uploads/sites/3/2022/05/rockford22_64.png",
  "San Diego Gulls":              "https://theahl.com/wp-content/uploads/sites/3/2016/04/sandiego64.png",
  "San Jose Barracuda":           "https://theahl.com/wp-content/uploads/sites/3/2024/09/sanjose24_64.png",
  "Springfield Thunderbirds":     "https://theahl.com/wp-content/uploads/sites/3/2022/03/springfield22_64.png",
  "Syracuse Crunch":              "https://theahl.com/wp-content/uploads/sites/3/2019/09/syracuse64-1.png",
  "Texas Stars":                  "https://theahl.com/wp-content/uploads/sites/3/2019/09/texas64-1-1.png",
  "Toronto Marlies":              "https://theahl.com/wp-content/uploads/sites/3/2019/09/toronto64_white.png",
  "Tucson Roadrunners":           "https://theahl.com/wp-content/uploads/sites/3/2025/07/tucson25_64.png",
  "Utica Comets":                 "https://theahl.com/wp-content/uploads/sites/3/2021/05/utica21_64.png",
  "Wilkes-Barre/Scranton Penguins": "https://theahl.com/wp-content/uploads/sites/3/2019/09/wbs64.png",
};

export function getTeamLogoUrl(teamName: string, league: string, sport?: string): string | null {
  if (!teamName || teamName === "TBC" || teamName === "TBD") return null;

  if (league === "NHL") {
    const abbrev = NHL_ABBREVS[teamName];
    if (abbrev) return `https://a.espncdn.com/i/teamlogos/nhl/500-dark/${abbrev.toLowerCase()}.png`;
  }

  if (league === "AHL") {
    return AHL_LOGO_URLS[teamName] ?? null;
  }

  if (league === "ECHL") {
    const id = ECHL_HOCKEYTECH_IDS[teamName];
    if (id) return `https://lscluster.hockeytech.com/download.php?client_code=echl&file_path=img/logos/${id}.png`;
    return null;
  }

  if (league === "NCAA Hockey") {
    const id = ESPN_COLLEGE_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
  }

  if (league === "Olympic Hockey") {
    return OLYMPIC_HOCKEY_FLAGS[teamName] || null;
  }

  if (league === "Japan League One") {
    return JL1_LOGO_MAP[teamName] || null;
  }

  if (league === "Top 14") {
    return TOP14_LOGO_MAP[teamName] || null;
  }

  if (league === "Six Nations") {
    return SIX_NATIONS_FLAGS[teamName] || null;
  }

  const sportLower = sport?.toLowerCase();

  if (sportLower === "rugby" || league === "URC" || league === "Super Rugby" || league === "English Premiership" || league === "Champions Cup") {
    const id = ESPN_RUGBY_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/rugby/teams/500/${id}.png`;
  }

  if (sportLower === "racing" || league === "F1") {
    const id = ESPN_F1_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/f1/500/${id}.png`;
    return null;
  }

  if (league === "IPL") {
    const IPL_URLS: Record<string, string> = {
      "Chennai Super Kings":        "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png",
      "Delhi Capitals":             "https://documents.iplt20.com/ipl/DC/Logos/LogoOutline/DCoutline.png",
      "Gujarat Titans":             "https://documents.iplt20.com/ipl/GT/Logos/Logooutline/GToutline.png",
      "Kolkata Knight Riders":      "https://documents.iplt20.com/ipl/KKR/Logos/Logooutline/KKRoutline.png",
      "Lucknow Super Giants":       "https://documents.iplt20.com/ipl/LSG/Logos/Logooutline/LSGoutline.png",
      "Mumbai Indians":             "https://documents.iplt20.com/ipl/MI/Logos/Logooutline/MIoutline.png",
      "Punjab Kings":               "https://documents.iplt20.com/ipl/PBKS/Logos/Logooutline/PBKSoutline.png",
      "Rajasthan Royals":           "https://documents.iplt20.com/ipl/RR/Logos/Logooutline/RRoutline.png",
      "Royal Challengers Bengaluru":"https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png",
      "Royal Challengers Bangalore":"https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png",
      "Sunrisers Hyderabad":        "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png",
    };
    return IPL_URLS[teamName] || null;
  }

  if (sportLower === "cricket" || league === "ICC") {
    return CRICKET_COUNTRY_FLAGS[teamName] || null;
  }

  if (league === "NCAAB") {
    const NCAAB_IDS: Record<string, string> = {
      "UC Irvine Anteaters": "300",
      "UC Davis Aggies": "302",
      "UC Santa Barbara Gauchos": "2540",
      "UC San Diego Tritons": "28",
      "UC Riverside Highlanders": "27",
      "Cal Poly Mustangs": "13",
      "Hawai'i Rainbow Warriors": "62",
      "Long Beach State Beach": "299",
      "Cal State Fullerton Titans": "2239",
      "Cal State Northridge Matadors": "2463",
      "Cal State Bakersfield Roadrunners": "2934",
    };
    const id = NCAAB_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
    return null;
  }

  if (sportLower === "baseball" || league === "MLB") {
    const MLB_IDS: Record<string, string> = {
      "Arizona Diamondbacks": "29", "Atlanta Braves": "15", "Baltimore Orioles": "1",
      "Boston Red Sox": "2", "Chicago Cubs": "16", "Chicago White Sox": "4",
      "Cincinnati Reds": "17", "Cleveland Guardians": "5", "Colorado Rockies": "27",
      "Detroit Tigers": "6", "Houston Astros": "18", "Kansas City Royals": "7",
      "Los Angeles Angels": "3", "Los Angeles Dodgers": "19", "Miami Marlins": "28",
      "Milwaukee Brewers": "8", "Minnesota Twins": "9", "New York Mets": "21",
      "New York Yankees": "10", "Oakland Athletics": "11", "Philadelphia Phillies": "22",
      "Pittsburgh Pirates": "23", "San Diego Padres": "25", "San Francisco Giants": "26",
      "Seattle Mariners": "12", "St. Louis Cardinals": "24", "Tampa Bay Rays": "30",
      "Texas Rangers": "13", "Toronto Blue Jays": "14", "Washington Nationals": "20",
      "Anaheim Angels": "3", "Athletics": "11",
    };
    const id = MLB_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/mlb/500/${id}.png`;
    return null;
  }

  if (sportLower === "basketball" || league === "NBA") {
    const NBA_IDS: Record<string, string> = {
      "Atlanta Hawks": "1", "Boston Celtics": "2", "Brooklyn Nets": "17",
      "Charlotte Hornets": "30", "Chicago Bulls": "4", "Cleveland Cavaliers": "5",
      "Dallas Mavericks": "6", "Denver Nuggets": "7", "Detroit Pistons": "8",
      "Golden State Warriors": "9", "Houston Rockets": "10", "Indiana Pacers": "11",
      "LA Clippers": "12", "Los Angeles Lakers": "13", "Memphis Grizzlies": "29",
      "Miami Heat": "14", "Milwaukee Bucks": "15", "Minnesota Timberwolves": "16",
      "New Orleans Pelicans": "3", "New York Knicks": "18", "Oklahoma City Thunder": "25",
      "Orlando Magic": "19", "Philadelphia 76ers": "20", "Phoenix Suns": "21",
      "Portland Trail Blazers": "22", "Sacramento Kings": "23", "San Antonio Spurs": "24",
      "Toronto Raptors": "28", "Utah Jazz": "26", "Washington Wizards": "27",
    };
    const id = NBA_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/nba/500/${id}.png`;
    return null;
  }

  if (sportLower === "soccer" || league === "EPL" || league === "MLS" || league === "La Liga" || league === "Serie A" || league === "Bundesliga" || league === "Ligue 1" || league === "Champions League" || league === "Europa League" || league === "FA Cup" || league === "USL" || league === "NWSL") {
    const id = ESPN_SOCCER_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/soccer/500-dark/${id}.png`;
  }

  return null;
}
