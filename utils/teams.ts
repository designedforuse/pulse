const JL_SHORT_NAMES: Record<string, string> = {
  "Brave Lupus Tokyo": "Brave Lupus",
  "Black Rams Tokyo": "Black Rams",
  "Kobelco Kobe Steelers": "Steelers",
  "Saitama Wild Knights": "Wild Knights",
  "Tokyo-Bay Urayasu D-Rocks": "D-Rocks",
  "Urayasu D-Rocks": "D-Rocks",
  "Toyota Verblitz": "Verblitz",
  "Mie Honda Heat": "Heat",
  "Tokyo Sungoliath": "Sungoliath",
  "Yokohama Canon Eagles": "Canon Eagles",
  "Sagamihara Dynaboars": "Dynaboars",
  "Shizuoka Blue Revs": "Blue Revs",
};

export function displayTeamName(team: string, league?: string): string {
  if (league === "Japan League One") {
    return JL_SHORT_NAMES[team] || team;
  }
  return team;
}
