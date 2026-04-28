export interface NhlAffiliation {
  nhl: string;
  ahl?: string;
  echl?: string[];
}

export const NHL_AFFILIATIONS_LAST_VERIFIED = "2025-26 season";

export const NHL_AFFILIATIONS: NhlAffiliation[] = [
  { nhl: "Anaheim Ducks",         ahl: "San Diego Gulls",                echl: ["Tulsa Oilers"] },
  { nhl: "Boston Bruins",         ahl: "Providence Bruins",              echl: ["Maine Mariners"] },
  { nhl: "Buffalo Sabres",        ahl: "Rochester Americans",            echl: ["Jacksonville Icemen"] },
  { nhl: "Calgary Flames",        ahl: "Calgary Wranglers",              echl: ["Rapid City Rush"] },
  { nhl: "Carolina Hurricanes",   ahl: "Chicago Wolves",                 echl: ["Greensboro Gargoyles"] },
  { nhl: "Chicago Blackhawks",    ahl: "Rockford IceHogs",               echl: ["Indy Fuel"] },
  { nhl: "Colorado Avalanche",    ahl: "Colorado Eagles",                echl: ["Utah Grizzlies"] },
  { nhl: "Columbus Blue Jackets", ahl: "Cleveland Monsters",             echl: [] },
  { nhl: "Dallas Stars",          ahl: "Texas Stars",                    echl: ["Idaho Steelheads"] },
  { nhl: "Detroit Red Wings",     ahl: "Grand Rapids Griffins",          echl: ["Toledo Walleye"] },
  { nhl: "Edmonton Oilers",       ahl: "Bakersfield Condors",            echl: ["Fort Wayne Komets"] },
  { nhl: "Florida Panthers",      ahl: "Charlotte Checkers",             echl: ["Savannah Ghost Pirates"] },
  { nhl: "Los Angeles Kings",     ahl: "Ontario Reign",                  echl: ["Greenville Swamp Rabbits"] },
  { nhl: "Minnesota Wild",        ahl: "Iowa Wild",                      echl: ["Iowa Heartlanders"] },
  { nhl: "Montréal Canadiens",    ahl: "Laval Rocket",                   echl: ["Trois-Rivières Lions"] },
  { nhl: "Nashville Predators",   ahl: "Milwaukee Admirals",             echl: ["Atlanta Gladiators"] },
  { nhl: "New Jersey Devils",     ahl: "Utica Comets",                   echl: ["Adirondack Thunder"] },
  { nhl: "New York Islanders",    ahl: "Bridgeport Islanders",           echl: ["Worcester Railers"] },
  { nhl: "New York Rangers",      ahl: "Hartford Wolf Pack",             echl: ["Bloomington Bison"] },
  { nhl: "Ottawa Senators",       ahl: "Belleville Senators",            echl: ["Allen Americans"] },
  { nhl: "Philadelphia Flyers",   ahl: "Lehigh Valley Phantoms",         echl: ["Reading Royals"] },
  { nhl: "Pittsburgh Penguins",   ahl: "Wilkes-Barre/Scranton Penguins", echl: ["Wheeling Nailers"] },
  { nhl: "San Jose Sharks",       ahl: "San Jose Barracuda",             echl: ["Wichita Thunder"] },
  { nhl: "Seattle Kraken",        ahl: "Coachella Valley Firebirds",     echl: ["Kansas City Mavericks"] },
  { nhl: "St. Louis Blues",       ahl: "Springfield Thunderbirds",       echl: ["Florida Everblades"] },
  { nhl: "Tampa Bay Lightning",   ahl: "Syracuse Crunch",                echl: ["Orlando Solar Bears"] },
  { nhl: "Toronto Maple Leafs",   ahl: "Toronto Marlies",                echl: ["Cincinnati Cyclones"] },
  { nhl: "Utah Mammoth",          ahl: "Tucson Roadrunners",             echl: [] },
  { nhl: "Vancouver Canucks",     ahl: "Abbotsford Canucks",             echl: ["Kalamazoo Wings"] },
  { nhl: "Vegas Golden Knights",  ahl: "Henderson Silver Knights",       echl: ["Tahoe Knight Monsters"] },
  { nhl: "Washington Capitals",   ahl: "Hershey Bears",                  echl: ["South Carolina Stingrays"] },
  { nhl: "Winnipeg Jets",         ahl: "Manitoba Moose",                 echl: ["Norfolk Admirals"] },
];
