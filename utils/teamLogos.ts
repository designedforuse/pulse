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
  "Los Angeles Kings": "LAK",
  "Minnesota Wild": "MIN",
  "Montréal Canadiens": "MTL",
  "Nashville Predators": "NSH",
  "New Jersey Devils": "NJD",
  "New York Islanders": "NYI",
  "New York Rangers": "NYR",
  "Ottawa Senators": "OTT",
  "Philadelphia Flyers": "PHI",
  "Pittsburgh Penguins": "PIT",
  "San Jose Sharks": "SJS",
  "Seattle Kraken": "SEA",
  "St. Louis Blues": "STL",
  "Tampa Bay Lightning": "TBL",
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
  "Sevilla FC": "243",
  "Real Betis": "244",
  "Real Sociedad": "89",
  "Villarreal CF": "102",
  "Athletic Club": "93",
  "Celta": "558",
  "Valencia CF": "94",
  "Getafe CF": "3751",
  "CA Osasuna": "97",
  "RCD Mallorca": "3709",
  "Rayo Vallecano": "2283",
  "Girona FC": "9812",
  "Deportivo Alavés": "96",
  "RCD Espanyol de Barcelona": "88",
  "Elche CF": "3750",
  "Levante UD": "3887",
  "Real Oviedo": "3722",
  "Juventus": "111",
  "Inter": "110",
  "Milan": "103",
  "Napoli": "114",
  "Roma": "104",
  "Lazio": "105",
  "Atalanta": "107",
  "Fiorentina": "109",
  "Bologna": "108",
  "Torino": "113",
  "Genoa": "2154",
  "Udinese": "115",
  "Cagliari": "2134",
  "Lecce": "1230",
  "Parma": "3166",
  "Hellas Verona": "3063",
  "Como": "3153",
  "Sassuolo": "3152",
  "Cremonese": "3157",
  "Pisa": "3158",
  "FC Bayern München": "132",
  "Borussia Dortmund": "124",
  "RB Leipzig": "11420",
  "Bayer 04 Leverkusen": "131",
  "Eintracht Frankfurt": "125",
  "VfB Stuttgart": "134",
  "Borussia Mönchengladbach": "130",
  "SV Werder Bremen": "133",
  "VfL Wolfsburg": "128",
  "1. FC Union Berlin": "10999",
  "Sport-Club Freiburg": "129",
  "TSG Hoffenheim": "3205",
  "1. FSV Mainz 05": "3201",
  "FC Augsburg": "3209",
  "1. FC Heidenheim 1846": "14261",
  "FC St. Pauli": "3180",
  "1. FC Köln": "122",
  "Hamburger SV": "127",
  "Paris Saint-Germain": "160",
  "Olympique de Marseille": "176",
  "Olympique Lyonnais": "167",
  "AS Monaco": "174",
  "LOSC Lille": "166",
  "RC Lens": "170",
  "OGC Nice": "169",
  "Stade Rennais FC": "177",
  "Stade Brestois 29": "1832",
  "Toulouse FC": "178",
  "RC Strasbourg Alsace": "161",
  "FC Nantes": "172",
  "FC Lorient": "1831",
  "AJ Auxerre": "159",
  "Angers SCO": "156",
  "FC Metz": "173",
  "Havre Athletic Club": "1834",
  "Paris FC": "2137",
  "Atlanta United": "18512",
  "Austin FC": "24122",
  "CF Montréal": "10270",
  "Charlotte FC": "24020",
  "Chicago Fire FC": "9924",
  "Colorado Rapids": "7257",
  "Columbus Crew": "9925",
  "D.C. United": "9927",
  "FC Cincinnati": "18509",
  "FC Dallas": "9929",
  "Houston Dynamo FC": "9930",
  "Inter Miami CF": "21623",
  "LA Galaxy": "9931",
  "Los Angeles Football Club": "17362",
  "Minnesota United FC": "14880",
  "Nashville SC": "21618",
  "New England Revolution": "9933",
  "New York City Football Club": "14863",
  "Orlando City": "14856",
  "Philadelphia Union": "9945",
  "Portland Timbers": "9935",
  "Real Salt Lake": "9936",
  "Red Bull New York": "9937",
  "San Diego FC": "25296",
  "San Jose Earthquakes": "9938",
  "Seattle Sounders FC": "9726",
  "Sporting Kansas City": "9939",
  "St. Louis CITY SC": "24025",
  "Toronto FC": "9940",
  "Vancouver Whitecaps FC": "9941",
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
};

const ESPN_COLLEGE_IDS: Record<string, string> = {
  "Boston University": "104",
  "Boston College": "103",
  "New Hampshire": "160",
};

const JL1_LOGO_MAP: Record<string, string> = {
  "Saitama Wild Knights": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11186_200x200_670e724c02c54.png",
  "Mie Honda Heat": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11191_200x200_670e756fdc7f9.png",
  "Kobelco Kobe Steelers": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11185_200x200_670e71b093142.png",
  "Tokyo Sungoliath": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11188_200x200_670e738b02420.png",
  "Brave Lupus Tokyo": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11189_200x200_670e7448a796a.png",
  "Tokyo-Bay Urayasu D-Rocks": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11184_200x200_670e70ccbfbc7.png",
  "Urayasu D-Rocks": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11184_200x200_670e70ccbfbc7.png",
  "Yokohama Canon Eagles": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11193_200x200_670e75f78a9bc.png",
  "Shizuoka Blue Revs": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11187_200x200_670e72d6dee20.png",
  "Toyota Verblitz": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11190_200x200_670e74a74f0b5.png",
  "Black Rams Tokyo": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11194_200x200_670e765eedceb.png",
  "Sagamihara Dynaboars": "https://league-one.s3.ap-northeast-1.amazonaws.com/image/team_info/11192_200x200_670e75a955eea.png",
};

const TOP14_LOGO_MAP: Record<string, string> = {
  "Toulouse": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25922.png",
  "La Rochelle": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/119318.png",
  "Toulon": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25986.png",
  "Racing Métro": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/99855.png",
  "Stade Français": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25921.png",
  "Bordeaux": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/143737.png",
  "Clermont": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25917.png",
  "Lyon": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/143736.png",
  "Montpellier": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25918.png",
  "Castres": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25916.png",
  "Pau": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/270567.png",
  "Bayonne": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25912.png",
  "Perpignan": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25920.png",
  "Montauban": "https://a.espncdn.com/i/teamlogos/rugby/teams/500/25918.png",
};

const CRICKET_COUNTRY_FLAGS: Record<string, string> = {
  "India": "https://a.espncdn.com/i/teamlogos/countries/500/ind.png",
  "Australia": "https://a.espncdn.com/i/teamlogos/countries/500/aus.png",
  "England": "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
  "New Zealand": "https://a.espncdn.com/i/teamlogos/countries/500/nzl.png",
  "South Africa": "https://a.espncdn.com/i/teamlogos/countries/500/rsa.png",
  "Pakistan": "https://a.espncdn.com/i/teamlogos/countries/500/pak.png",
  "Sri Lanka": "https://a.espncdn.com/i/teamlogos/countries/500/lka.png",
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
};

const SIX_NATIONS_FLAGS: Record<string, string> = {
  "France": "https://a.espncdn.com/i/teamlogos/countries/500/fra.png",
  "Ireland": "https://a.espncdn.com/i/teamlogos/countries/500/irl.png",
  "Italy": "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
  "Wales": "https://a.espncdn.com/i/teamlogos/countries/500/wal.png",
  "England": "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
  "Scotland": "https://a.espncdn.com/i/teamlogos/countries/500/sco.png",
};

export function getTeamLogoUrl(teamName: string, league: string, sport?: string): string | null {
  if (!teamName || teamName === "TBC") return null;

  if (league === "NHL") {
    const abbrev = NHL_ABBREVS[teamName];
    if (abbrev) return `https://a.espncdn.com/i/teamlogos/nhl/500/${abbrev.toLowerCase()}.png`;
  }

  if (league === "AHL" || league === "ECHL") {
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

  if (sportLower === "rugby" || league === "URC" || league === "Super Rugby" || league === "English Premiership" || league === "European Champions Cup") {
    const id = ESPN_RUGBY_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/rugby/teams/500/${id}.png`;
  }

  if (sportLower === "cricket" || league === "ICC") {
    return CRICKET_COUNTRY_FLAGS[teamName] || null;
  }

  if (sportLower === "soccer" || league === "EPL" || league === "MLS" || league === "La Liga" || league === "Serie A" || league === "Bundesliga" || league === "Ligue 1" || league === "Champions League" || league === "FA Cup" || league === "USL") {
    const id = ESPN_SOCCER_IDS[teamName];
    if (id) return `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
  }

  return null;
}
