import React from "react";
import { View, Text, Image, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import ProviderLogo from "@/components/ProviderLogo";
import { TeamLogo } from "@/components/TeamLogo";
import { getSportColor, getSportIcon, resolveProviderDisplay, type SportEvent } from "@/lib/data";
import { displayTeamName, compactTeamName } from "@/utils/teams";
import { normalizeGameState } from "@/utils/gameState";
import { useScoreFlash } from "@/hooks/useScoreFlash";
import { useFavorites } from "@/lib/favorites-context";
import { isTeamFavorite } from "@/utils/favorites";
import { formatTimeUntilStart } from "@/utils/time";
import { getTennisRoundShort, getTennisRoundPriority } from "@/data/tennisTopPlayers";
import type { ScoreData, TennisSetScore, SeriesStatus } from "@/lib/scores-context";
import { useScores } from "@/lib/scores-context";
import { useSvnsMatches, extractSvnsCity, formatSvnsMatchLine, formatSvnsMatchTime, getSvnsTeamFlag, getSvnsCityFlag, extractSvnsSessionDay, type SvnsMatch } from "@/lib/svns-context";
import { useWrcStages, getWrcRoundBaseId, getStagesForLeg, wrcFlagUrl, type WrcStage } from "@/lib/wrc-stages-context";

const MASTERS_LOGO = require("@/assets/images/masters-logo.png");
const BOSTON_MARATHON_LOGO = require("@/assets/images/boston-marathon-logo.png");
const DIAMOND_LEAGUE_LOGO = require("@/assets/images/diamond-league-logo.png");
const GIRO_DITALIA_LOGO = require("@/assets/images/giro-ditalia-logo.png");

const isGiroDItalia = (name: string | null | undefined) =>
  !!name && /giro\s*d['’]?\s*italia/i.test(name);

// ESPN country flag CDN uses FIFA/IOC-style 3-letter codes.
export function countryFlagUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  return `https://a.espncdn.com/i/teamlogos/countries/500/${code.toLowerCase()}.png`;
}

const GP_CODES: Record<string, string> = {
  "Australian": "aus",
  "Bahrain": "brn",
  "Saudi Arabian": "ksa",
  "Japanese": "jpn",
  "Chinese": "chn",
  "Miami": "usa",
  "Emilia Romagna": "ita",
  "Monaco": "mon",
  "Spanish": "esp",
  "Canadian": "can",
  "Austrian": "aut",
  "British": "gbr",
  "Belgian": "bel",
  "Hungarian": "hun",
  "Dutch": "ned",
  "Italian": "ita",
  "Azerbaijan": "aze",
  "Singapore": "sin",
  "United States": "usa",
  "Mexico City": "mex",
  "Mexican": "mex",
  "São Paulo": "bra",
  "Brazilian": "bra",
  "Las Vegas": "usa",
  "Qatar": "qat",
  "Abu Dhabi": "uae",
};

export function getGrandPrixFlag(gpName: string): string | null {
  for (const [key, code] of Object.entries(GP_CODES)) {
    if (gpName.includes(key)) return countryFlagUrl(code);
  }
  return null;
}

const WRC_ROUNDS: Record<string, { code: string; country: string }> = {
  "Rallye Monte-Carlo": { code: "mon", country: "Monaco" },
  "Rally Sweden": { code: "swe", country: "Sweden" },
  "Safari Rally Kenya": { code: "ken", country: "Kenya" },
  "Croatia Rally": { code: "cro", country: "Croatia" },
  "Rally Islas Canarias": { code: "esp", country: "Canary Islands" },
  "Rally de Portugal": { code: "por", country: "Portugal" },
  "Rally Japan": { code: "jpn", country: "Japan" },
  "Acropolis Rally Greece": { code: "gre", country: "Greece" },
  "Rally Estonia": { code: "est", country: "Estonia" },
  "Rally Finland": { code: "fin", country: "Finland" },
  "Rally del Paraguay": { code: "par", country: "Paraguay" },
  "Rally Chile": { code: "chi", country: "Chile" },
  "Rally Italia Sardegna": { code: "ita", country: "Italy" },
  "Rally Saudi Arabia": { code: "ksa", country: "Saudi Arabia" },
};

export function getWrcRoundInfo(name: string | null | undefined): { flag: string | null; country: string } | null {
  if (!name) return null;
  const round = WRC_ROUNDS[name];
  if (!round) return null;
  return { flag: countryFlagUrl(round.code), country: round.country };
}

const COUNTRY_CODES: Record<string, string> = {
  "Afghanistan": "afg", "Albania": "alb", "Algeria": "alg", "Angola": "ang",
  "Argentina": "arg", "Armenia": "arm", "Australia": "aus", "Austria": "aut",
  "Azerbaijan": "aze", "Bahrain": "brn", "Bangladesh": "ban", "Belgium": "bel",
  "Bolivia": "bol", "Bosnia and Herzegovina": "bih", "Bosnia & Herzegovina": "bih",
  "Brazil": "bra", "Bulgaria": "bul", "Burkina Faso": "bfa", "Cameroon": "cmr",
  "Canada": "can", "Chile": "chi", "China": "chn", "Colombia": "col",
  "Costa Rica": "crc", "Croatia": "cro", "Cuba": "cub", "Czech Republic": "cze",
  "Czechia": "cze", "Denmark": "den", "Ecuador": "ecu", "Egypt": "egy",
  "El Salvador": "slv", "England": "eng", "Estonia": "est", "Ethiopia": "eth",
  "Finland": "fin", "France": "fra", "Germany": "ger", "Ghana": "gha",
  "Greece": "gre", "Guatemala": "gua", "Honduras": "hon", "Hungary": "hun",
  "Iceland": "isl", "India": "ind", "Indonesia": "idn", "Iran": "irn",
  "Iraq": "irq", "Ireland": "irl", "Republic of Ireland": "irl",
  "Israel": "isr", "Italy": "ita", "Ivory Coast": "civ", "Jamaica": "jam",
  "Japan": "jpn", "Jordan": "jor", "Kenya": "ken", "South Korea": "kor",
  "Korea Republic": "kor", "Kosovo": "kos", "Kuwait": "kuw", "Latvia": "lat",
  "Lebanon": "lbn", "Libya": "lby", "Lithuania": "ltu", "Luxembourg": "lux",
  "Malaysia": "mas", "Mali": "mli", "Malta": "mlt", "Mexico": "mex",
  "Moldova": "mda", "Montenegro": "mne", "Morocco": "mar", "Mozambique": "moz",
  "Netherlands": "ned", "New Zealand": "nzl", "Nicaragua": "nca",
  "Nigeria": "nga", "North Korea": "prk", "North Macedonia": "mkd",
  "Norway": "nor", "Oman": "oma", "Pakistan": "pak", "Panama": "pan",
  "Paraguay": "par", "Peru": "per", "Philippines": "phi", "Poland": "pol",
  "Portugal": "por", "Qatar": "qat", "Romania": "rou", "Russia": "rus",
  "Saudi Arabia": "ksa", "Scotland": "sco", "Senegal": "sen",
  "Serbia": "srb", "Slovakia": "svk", "Slovenia": "svn", "South Africa": "rsa",
  "Spain": "esp", "Sri Lanka": "sri", "Sweden": "swe", "Switzerland": "sui",
  "Syria": "syr", "Tanzania": "tan", "Thailand": "tha", "Trinidad and Tobago": "tri",
  "Tunisia": "tun", "Turkey": "tur", "Türkiye": "tur", "Uganda": "uga",
  "Ukraine": "ukr", "United Arab Emirates": "uae", "UAE": "uae",
  "United States": "usa", "USA": "usa", "Uruguay": "uru", "Venezuela": "ven",
  "Vietnam": "vie", "Wales": "wal", "Zambia": "zam", "Zimbabwe": "zim",
  "Haiti": "hai", "Curaçao": "cuw", "Suriname": "sur",
};

export function getCountryFlagUrl(country: string): string | null {
  return countryFlagUrl(COUNTRY_CODES[country]);
}

const ATHLETICS_CITY_CODES: Record<string, string> = {
  // Diamond League meets
  "doha": "qat",
  "shanghai": "chn",
  "xiamen": "chn",
  "rabat": "mar",
  "rome": "ita",
  "stockholm": "swe",
  "oslo": "nor",
  "paris": "fra",
  "eugene": "usa",
  "monaco": "mon",
  "london": "eng",
  "lausanne": "sui",
  "silesia": "pol",
  "chorzow": "pol",
  "zurich": "sui",
  "brussels": "bel",
  // Marathon Majors
  "tokyo": "jpn",
  "boston": "usa",
  "sydney": "aus",
  "berlin": "ger",
  "chicago": "usa",
  "new york": "usa",
  "new york city": "usa",
  "cape town": "rsa",
  "comrades": "rsa",
  "pietermaritzburg": "rsa",
  "durban": "rsa",
  // UTMB World Series stops
  "val d'aran": "esp",
  "val daran": "esp",
  "verbier": "sui",
  "st-bernard": "sui",
  "monte rosa": "ita",
  "walser": "ita",
  "mont-blanc": "fra",
  "chamonix": "fra",
  "wildstrubel": "sui",
  "nice": "fra",
  "côte d'azur": "fra",
  "cote d'azur": "fra",
  "kodiak": "usa",
  "big bear": "usa",
  "chiang mai": "tha",
  "ultra-trail australia": "aus",
  "blue mountains": "aus",
};

function getAthleticsCityFlagUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [city, code] of Object.entries(ATHLETICS_CITY_CODES)) {
    if (lower.includes(city)) return countryFlagUrl(code);
  }
  return null;
}

const INTL_SOCCER_LEAGUES = new Set(["FIFA World Cup", "International Friendly"]);

const GP_LOCATIONS: Record<string, string> = {
  "Australian": "Australia",
  "Bahrain": "Bahrain",
  "Saudi Arabian": "Saudi Arabia",
  "Japanese": "Japan",
  "Chinese": "China",
  "Miami": "Miami",
  "Emilia Romagna": "Imola",
  "Monaco": "Monaco",
  "Spanish": "Spain",
  "Canadian": "Canada",
  "Austrian": "Austria",
  "British": "Britain",
  "Belgian": "Belgium",
  "Hungarian": "Hungary",
  "Dutch": "Netherlands",
  "Italian": "Italy",
  "Azerbaijan": "Azerbaijan",
  "Singapore": "Singapore",
  "United States": "USA",
  "Mexico City": "Mexico",
  "Mexican": "Mexico",
  "São Paulo": "Brazil",
  "Brazilian": "Brazil",
  "Las Vegas": "Las Vegas",
  "Qatar": "Qatar",
  "Abu Dhabi": "Abu Dhabi",
};

function getGrandPrixLocation(gpName: string): string {
  const raw = gpName.replace(/\s*Grand\s*Prix$/i, "").trim();
  return GP_LOCATIONS[raw] || raw || gpName;
}

const DRIVER_COUNTRY_CODES: Record<string, string> = {
  "Monaco": "mon", "Netherlands": "ned", "United Kingdom": "gbr", "Great Britain": "gbr", "Britain": "gbr",
  "Spain": "esp", "Mexico": "mex", "Australia": "aus", "France": "fra",
  "Finland": "fin", "Canada": "can", "Germany": "ger", "Japan": "jpn",
  "Thailand": "tha", "Denmark": "den", "China": "chn", "United States": "usa",
  "Italy": "ita", "New Zealand": "nzl", "Brazil": "bra", "Argentina": "arg",
  "Belgium": "bel", "Switzerland": "sui", "Austria": "aut", "Poland": "pol",
  "Sweden": "swe", "Norway": "nor", "Ireland": "irl", "Russia": "rus",
  "South Africa": "rsa", "India": "ind", "Colombia": "col", "Venezuela": "ven",
  "Indonesia": "idn", "Israel": "isr",
};

export function getDriverFlag(countryName?: string): string | null {
  if (!countryName) return null;
  return countryFlagUrl(DRIVER_COUNTRY_CODES[countryName]);
}

function getSportDisplayName(sport: string): string {
  const names: Record<string, string> = {
    hockey: "Hockey",
    rugby: "Rugby",
    cricket: "Cricket",
    soccer: "Soccer",
    tennis: "Tennis",
    racing: "Racing",
    athletics: "Athletics",
  };
  return names[sport] || sport.charAt(0).toUpperCase() + sport.slice(1);
}

const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  "English Premiership": "Premiership",
  "F1": "Formula 1",
  "CAF Champions League": "CAF CL",
  "SA Schools Rugby": "Schools Rugby",
};

function getLeagueLabel(event: SportEvent): string {
  if (event.isIccT20Wc) return "T20 World Cup";
  if (event.isOlympic) return "Olympics";
  if (event.leagueKey === "svns" && event.eventType === "session") {
    const city = extractSvnsCity(event.homeTeam);
    if (city) return `${city} SVNS`;
  }
  if (event.sport === "athletics" && (event.id?.startsWith("athletics-diamond-league-") || event.leagueKey === "diamond-league" || event.league === "Diamond League")) {
    return "Diamond League";
  }
  if (event.sport === "athletics" && (event.id?.startsWith("athletics-golden-trail-") || event.leagueKey === "golden-trail")) {
    return "Golden Trail";
  }
  if (event.sport === "racing" && event.leagueKey === "wrc") return "WRC";
  if (event.tournamentName) return event.tournamentName;
  return LEAGUE_DISPLAY_NAMES[event.league] ?? event.league;
}

function getPhaseChipLabel(event: SportEvent, score: ScoreData | undefined, isLive: boolean): string | null {
  if (event.tennisRound) return getTennisRoundShort(event.tennisRound);
  if (event.olympicRound) {
    const r = event.olympicRound;
    if (r.length <= 6) return r;
    if (/final/i.test(r)) return "Final";
    if (/semi/i.test(r)) return "SF";
    if (/quarter/i.test(r)) return "QF";
    if (/group/i.test(r)) return r.replace(/Group\s*/i, "Grp ");
    return r.substring(0, 6);
  }
  if (event.roundLabel) return event.roundLabel;
  return null;
}

function isGreyPhaseChip(event: SportEvent): boolean {
  return !!(event.tennisRound || event.roundLabel);
}

function formatSeriesStatus(ss: SeriesStatus): { label: string; gameLabel: string | null } {
  const top = ss.topSeedTeamAbbrev;
  const bottom = ss.bottomSeedTeamAbbrev;
  const topW = ss.topSeedWins;
  const botW = ss.bottomSeedWins;
  const need = ss.neededToWin ?? 4;
  const gameNum = ss.gameNumberOfSeries;
  const gameLabel = gameNum ? `Game ${gameNum}` : null;

  let label: string;
  if (topW === botW) {
    if (topW === 0) {
      label = `Series tied 0–0`;
    } else {
      label = `Series tied ${topW}–${botW}`;
    }
  } else {
    const leader = topW > botW ? top : bottom;
    const hi = Math.max(topW, botW);
    const lo = Math.min(topW, botW);
    if (hi >= need) {
      label = `${leader} wins ${hi}–${lo}`;
    } else {
      label = `${leader} leads ${hi}–${lo}`;
    }
  }
  return { label, gameLabel };
}

function getPhaseChipPriority(event: SportEvent): number {
  if (event.tennisRound) return getTennisRoundPriority(event.tennisRound);
  return 0;
}

function getCricketTeamAbbr(teamName: string): string {
  const abbrs: Record<string, string> = {
    "india": "IND", "australia": "AUS", "england": "ENG", "south africa": "SA",
    "new zealand": "NZ", "pakistan": "PAK", "sri lanka": "SL", "bangladesh": "BAN",
    "west indies": "WI", "afghanistan": "AFG", "ireland": "IRE", "zimbabwe": "ZIM",
    "netherlands": "NED", "scotland": "SCO", "nepal": "NEP", "namibia": "NAM",
    "oman": "OMA", "usa": "USA", "uae": "UAE", "canada": "CAN", "uganda": "UGA",
    "papua new guinea": "PNG",
  };
  const lower = teamName.toLowerCase().trim();
  if (abbrs[lower]) return abbrs[lower];
  if (lower.length <= 4) return lower.toUpperCase();
  return lower.substring(0, 3).toUpperCase();
}

export function formatCricketLiveDetail(
  event: SportEvent,
  score: ScoreData | undefined,
  isLive: boolean
): string | null {
  if (!isLive || !score || event.sport !== "cricket") return null;

  const period = (score.period || "").trim();

  const breakPatterns = /innings break|rain delay|strategic timeout|drinks|stumps|bad light|match delayed|tea|lunch/i;
  if (breakPatterns.test(period)) {
    const parts: string[] = [];
    const awayAbbr = getCricketTeamAbbr(event.awayTeam);
    const homeAbbr = getCricketTeamAbbr(event.homeTeam);
    if (score.cricketAway && score.cricketAway !== "Yet to bat") parts.push(`${awayAbbr} ${score.cricketAway}`);
    if (score.cricketHome && score.cricketHome !== "Yet to bat") parts.push(`${homeAbbr} ${score.cricketHome}`);
    return parts.length > 0 ? `${parts.join(" • ")} · ${period}` : period;
  }

  const parts: string[] = [];
  const awayAbbr = getCricketTeamAbbr(event.awayTeam);
  const homeAbbr = getCricketTeamAbbr(event.homeTeam);

  if (score.cricketAway && score.cricketAway !== "Yet to bat") {
    parts.push(`${awayAbbr} ${score.cricketAway}`);
  }
  if (score.cricketHome && score.cricketHome !== "Yet to bat") {
    parts.push(`${homeAbbr} ${score.cricketHome}`);
  }

  if (parts.length === 0) {
    if (period && period !== "In Progress") return period;
    return null;
  }

  let detail = parts.join(" • ");

  const needMatch = period.match(/need\s+(\d+)\s+runs?\s*(?:in\s+([\d.]+)\s*(?:ov(?:ers?)?|balls?)?)?/i);
  const rrrMatch = period.match(/req.*rate[:\s]*([\d.]+)/i);
  const trailMatch = period.match(/trail\s+by\s+(\d+)/i);
  const leadMatch = period.match(/lead\s+by\s+(\d+)/i);
  if (needMatch) {
    detail += needMatch[2] ? ` · need ${needMatch[1]} in ${needMatch[2]}` : ` · need ${needMatch[1]}`;
  } else if (rrrMatch) {
    detail += ` · RRR ${rrrMatch[1]}`;
  } else if (trailMatch) {
    detail += ` · trail by ${trailMatch[1]}`;
  } else if (leadMatch) {
    detail += ` · lead by ${leadMatch[1]}`;
  }

  return detail;
}

function LiveDot() {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[uStyles.liveDotStatic, animStyle]} />;
}

function PulsingLightning() {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={animStyle}>
      <Ionicons name="flash" size={10} color="#FF453A" />
    </Animated.View>
  );
}

function LiveScanBar({ color }: { color: string }) {
  const BAR = 18;
  const [trackW, setTrackW] = React.useState(80);
  const tx = useSharedValue(-BAR);
  React.useEffect(() => {
    tx.value = -BAR;
    tx.value = withRepeat(
      withSequence(
        withTiming(trackW, { duration: 900 }),
        withTiming(-BAR, { duration: 900 })
      ),
      -1,
      false
    );
  }, [trackW]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <View
      style={{ width: "100%", height: 2, overflow: "hidden", marginTop: 3, borderRadius: 1 }}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[{ width: BAR, height: 2, borderRadius: 1, backgroundColor: color }, animStyle]} />
    </View>
  );
}

function PhaseChip({ label, sportColor, isHot, grey }: { label: string; sportColor: string; isHot: boolean; grey?: boolean }) {
  return (
    <View style={[uStyles.phaseChip, grey ? { backgroundColor: "rgba(255,255,255,0.10)" } : { backgroundColor: sportColor + "22" }, !grey && isHot && { backgroundColor: sportColor + "38" }]}>
      <Text style={[uStyles.phaseChipText, grey ? { color: Colors.textSecondary } : { color: sportColor }]}>
        {label}
      </Text>
    </View>
  );
}


const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
  "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077",
  "8": "\u2078", "9": "\u2079",
};

function superscriptDigits(s: string): string {
  return s.split("").map(c => SUPERSCRIPT_MAP[c] || c).join("");
}

export function TennisScoreboard({
  event,
  score,
  isLive,
  isFinal,
  featured,
  compact,
  scoreColor = "#FFFFFF",
}: {
  event: SportEvent;
  score?: ScoreData;
  isLive: boolean;
  isFinal: boolean;
  featured?: boolean;
  compact?: boolean;
  scoreColor?: string;
}) {
  const p1Name = event.tennisPlayer1 || event.awayTeam;
  const p2Name = event.tennisPlayer2 || event.homeTeam;
  const p1Flag = event.tennisPlayer1Flag;
  const p2Flag = event.tennisPlayer2Flag;
  const p1Rank = event.tennisPlayer1Rank;
  const p2Rank = event.tennisPlayer2Rank;
  const sportColor = getSportColor("tennis");
  const logoSize = featured ? 22 : compact ? 16 : 20;

  const sets = score?.tennisSetScores || [];
  const gameScore = score?.tennisGameScore;
  const server = score?.tennisServer;
  const winner = score?.tennisWinner;
  const hasScoreData = sets.length > 0;
  const statusDetail = score?.tennisStatusDetail;

  const isSuspended = statusDetail &&
    /suspended|rain|delay|medical|retired|walkover/i.test(statusDetail);

  const renderPlayerRow = (
    playerNum: 1 | 2,
    name: string,
    flag?: string,
    rank?: number,
  ) => {
    const isWinner = winner === playerNum;
    const isServing = server === playerNum;
    const nameOpacity = isFinal && winner && !isWinner ? 0.5 : 1;

    return (
      <View style={[tsStyles.playerRow, compact && tsStyles.playerRowCompact]}>
        {flag ? (
          <Image
            source={{ uri: flag }}
            style={[tsStyles.flag, { width: logoSize, height: Math.round(logoSize * 0.7) }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[tsStyles.flag, { width: logoSize, height: Math.round(logoSize * 0.7) }]} />
        )}
        <View style={tsStyles.nameContainer}>
          <Text
            style={[
              tsStyles.playerName,
              featured && tsStyles.playerNameFeatured,
              compact && tsStyles.playerNameCompact,
              { opacity: nameOpacity },
              isWinner && tsStyles.playerNameWinner,
            ]}
            numberOfLines={1}
          >
            {name}
            {rank ? (
              <Text style={[tsStyles.rankText, { color: sportColor }]}>{` (${rank})`}</Text>
            ) : null}
          </Text>
          {isServing && isLive && (
            <View style={[tsStyles.servingDot, { backgroundColor: scoreColor }]} />
          )}
        </View>
        {hasScoreData && (
          <View style={tsStyles.setsContainer}>
            {sets.map((s, i) => {
              const val = playerNum === 1 ? s.p1 : s.p2;
              const isSetWinner = s.winner === playerNum;
              const isCurrentSet = i === sets.length - 1 && !s.winner && isLive;
              const showTb = s.tiebreak && isSetWinner;
              return (
                <View key={i} style={tsStyles.setScoreCell}>
                  <Text
                    style={[
                      tsStyles.setScore,
                      isSetWinner && tsStyles.setScoreWon,
                      isCurrentSet && isLive && tsStyles.setScoreCurrent,
                    ]}
                  >
                    {val}
                    {showTb ? (
                      <Text style={tsStyles.tiebreakScore}>
                        {superscriptDigits(s.tiebreak || "")}
                      </Text>
                    ) : null}
                  </Text>
                </View>
              );
            })}
            {gameScore && isLive && (
              <View style={[tsStyles.setScoreCell, tsStyles.gameScoreCell]}>
                <Text style={[tsStyles.gameScore, isLive && tsStyles.gameScoreLive, isLive && { color: scoreColor }]}>
                  {playerNum === 1 ? gameScore.p1 : gameScore.p2}
                </Text>
              </View>
            )}
          </View>
        )}
        {!hasScoreData && isLive && (
          <Text style={[tsStyles.liveNow, { color: Colors.textPrimary }]}>0</Text>
        )}
        {!hasScoreData && isFinal && score && (
          <Text style={tsStyles.finalSetsText}>
            {score.awayScore}–{score.homeScore}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[tsStyles.scoreboard, compact && tsStyles.scoreboardCompact]}>
      {renderPlayerRow(1, p1Name, p1Flag, p1Rank)}
      {renderPlayerRow(2, p2Name, p2Flag, p2Rank)}
      {isSuspended && (
        <Text style={tsStyles.statusLabel}>{statusDetail}</Text>
      )}
    </View>
  );
}

const tsStyles = StyleSheet.create({
  scoreboard: {
    gap: 4,
    paddingLeft: 4,
  },
  scoreboardCompact: {
    paddingLeft: 0,
    gap: 2,
  },
  playerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    minHeight: 24,
  },
  playerRowCompact: {
    gap: 4,
    minHeight: 20,
  },
  flag: {
    borderRadius: 2,
  },
  nameContainer: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  servingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
  },
  playerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  playerNameFeatured: {
    fontSize: 16,
  },
  playerNameCompact: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  playerNameWinner: {
    fontFamily: "Inter_700Bold",
  },
  rankText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  setsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 0,
  },
  setScoreCell: {
    width: 22,
    alignItems: "center" as const,
  },
  setScore: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textAlign: "center" as const,
  },
  setScoreWon: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  setScoreCurrent: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  tiebreakScore: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  gameScoreCell: {
    width: 28,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(72,72,74,0.4)",
    marginLeft: 2,
    paddingLeft: 2,
  },
  gameScore: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  gameScoreLive: {
    color: Colors.accent,
  },
  liveNow: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#FFB74D",
    marginTop: 2,
    paddingLeft: 4,
  },
  finalSetsText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textAlign: "right" as const,
  },
});

function SvnsMatchRow({ match, isLive }: { match: SvnsMatch; isLive: boolean }) {
  const isMatchLive = match.status.startsWith("L");
  const isCompleted = match.status === "C";
  const isUpcoming = match.status === "U";
  const genderLabel = match.gender === "womens" ? "W" : "M";
  const phaseShort = match.phase.replace("Cup Semi Finals", "Semi").replace("Cup Final", "Final").replace("3rd Place Play-Off", "3rd Place").replace("5th Place Play-Off", "5th Place").replace("7th Place Play-Off", "7th Place").replace("5th Place Semi Final", "5th SF");
  const timeStr = formatSvnsMatchTime(match);
  const hasScore = isMatchLive || isCompleted;
  const flag1 = getSvnsTeamFlag(match.team1Abbr);
  const flag2 = getSvnsTeamFlag(match.team2Abbr);

  return (
    <View style={svnsStyles.matchRow}>
      {isMatchLive && (
        <View style={svnsStyles.matchLiveDot} />
      )}
      <Text style={[svnsStyles.matchGender, { color: match.gender === "womens" ? "#FF6B9D" : "#64B5F6" }]}>
        {genderLabel}
      </Text>
      {flag1 ? <Image source={{ uri: flag1 }} style={svnsStyles.matchFlag} resizeMode="contain" /> : null}
      <Text style={svnsStyles.matchTeams} numberOfLines={1}>
        {match.team1Abbr} {hasScore ? `${match.team1Score}–${match.team2Score}` : "vs"} {match.team2Abbr}
      </Text>
      {flag2 ? <Image source={{ uri: flag2 }} style={svnsStyles.matchFlag} resizeMode="contain" /> : null}
      <Text style={svnsStyles.matchPhase} numberOfLines={1}>{phaseShort}</Text>
      {isUpcoming && <Text style={svnsStyles.matchTime}>{timeStr}</Text>}
      {isMatchLive && <Text style={svnsStyles.matchLiveLabel}>LIVE</Text>}
    </View>
  );
}

const svnsStyles = StyleSheet.create({
  matchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 6,
    gap: 6,
  },
  matchLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF3B30",
  },
  matchGender: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  matchTeams: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    flex: 1,
  },
  matchFlag: {
    width: 18,
    height: 12,
    borderRadius: 2,
  },
  matchPhase: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  matchTime: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  matchLiveLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FF3B30",
  },
});

export interface UnifiedEventCardProps {
  event: SportEvent;
  now: Date;
  score?: ScoreData;
  isFav?: boolean;
  featured?: boolean;
  onSetFeatured?: (eventId: string) => void;
  tensionRank?: number;
  showTension?: boolean;
  showCountdown?: boolean;
  accentBarColor?: string;
  espnLayout?: boolean;
}

export function WrcStageWinners({ stages, totalStages }: { stages: WrcStage[]; totalStages: number }) {
  if (stages.length === 0) return null;
  const sportColor = getSportColor("racing");
  return (
    <View style={uStyles.wrcStagesSection}>
      <View style={uStyles.wrcStagesHeaderRow}>
        <Text style={[uStyles.wrcStagesHeader, { color: sportColor }]}>STAGE WINNERS</Text>
        {totalStages > 0 && (
          <Text style={uStyles.wrcStagesCount}>{stages.length} of {totalStages}</Text>
        )}
      </View>
      {stages.map((s) => {
        const flag = wrcFlagUrl(s.winner?.flag);
        return (
          <View key={s.stageNumber} style={uStyles.wrcStageRow}>
            <Text style={[uStyles.wrcStageBadge, { color: sportColor }]}>SS{s.stageNumber}</Text>
            <Text style={uStyles.wrcStageName} numberOfLines={1}>{s.name}</Text>
            {flag && <Image source={{ uri: flag }} style={uStyles.wrcStageFlag} resizeMode="contain" />}
            <Text style={uStyles.wrcStageWinner} numberOfLines={1}>{s.winner?.name}</Text>
            <Text style={uStyles.wrcStageTime}>{s.winner?.time}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function UnifiedEventCard({
  event,
  now,
  score,
  isFav = false,
  featured = false,
  onSetFeatured,
  tensionRank = 0,
  showTension = false,
  showCountdown = true,
  accentBarColor,
  espnLayout = false,
}: UnifiedEventCardProps) {
  const { favorites } = useFavorites();
  const { getSeriesStatus } = useScores();
  const isFavAway = isTeamFavorite(event.awayTeam, event.sport, favorites);
  const isFavHome = isTeamFavorite(event.homeTeam, event.sport, favorites);
  const sportColor = getSportColor(event.sport);
  const sportIcon = getSportIcon(event.sport) as any;
  const seriesStatus = event.sport === "hockey" ? getSeriesStatus(event.id) : undefined;
  const seriesDisplay = seriesStatus ? formatSeriesStatus(seriesStatus) : null;
  const { gameState, displayClockText } = normalizeGameState(event, score, now);
  const isLive = gameState === "LIVE";
  const isFinal = gameState === "FINAL";
  const flashStyle = useScoreFlash(score?.awayScore, score?.homeScore, score?.cricketAway, score?.cricketHome);
  const hasScore = !!score;

  const d = new Date(event.startTimeLocal);
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const phaseLabel = getPhaseChipLabel(event, score, isLive);
  const isHotPhase = getPhaseChipPriority(event) >= 80;

  const isSession = event.eventType === "session" && event.sessionTitle;
  const isSvnsSession = isSession && event.leagueKey === "svns";
  const svnsCity = isSvnsSession ? extractSvnsCity(event.homeTeam) : null;
  const svnsData = useSvnsMatches(svnsCity);
  const svnsDisplayMatch: SvnsMatch | null = svnsData?.liveMatch || svnsData?.nextMatch || svnsData?.lastCompletedMatch || null;

  const isTbc = (event.awayTeam === "TBC" || event.homeTeam === "TBC") && event.t20WcMatchLabel;
  const isTbd = event.isOlympic && (event.awayTeam === "TBD" || event.homeTeam === "TBD") && event.olympicRound;
  const showTeamLayout = !isSession && !isTbc && !isTbd;

  const svnsSessionLabel = isSvnsSession && event.sessionTitle ? extractSvnsSessionDay(event.sessionTitle) : null;
  const matchupFallback = isSvnsSession && svnsSessionLabel
    ? svnsSessionLabel
    : isSession
      ? event.sessionTitle
      : isTbc
        ? event.t20WcMatchLabel
        : isTbd
          ? event.olympicRound
          : null;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onSetFeatured) {
      onSetFeatured(event.id);
      return;
    }
    router.push({ pathname: "/event-sheet", params: { eventId: event.id } });
  };

  const tensionLabel =
    showTension && tensionRank >= 4
      ? "High Drama"
      : showTension && tensionRank === 3
        ? "Tight Game"
        : showTension && tensionRank === 2
          ? "Heating Up"
          : null;

  const liveTensionColor =
    isLive && tensionRank >= 4 ? "#00B4FF"
      : isLive && tensionRank === 3 ? "#0EA5E9"
        : isLive && tensionRank === 2 ? "#38BDF8"
          : "rgba(28,176,246,0.35)";

  const awayName = event.tennisPlayer1 || compactTeamName(event.awayTeam, event.league);
  const homeName = event.tennisPlayer2 || compactTeamName(event.homeTeam, event.league);

  const isTennis = event.sport === "tennis";
  const isCricket = event.sport === "cricket";
  const isRacing = event.sport === "racing";
  const isGolf = event.sport === "golf";
  const isAthletics = event.sport === "athletics";
  const isHorseRacing = event.sport === "horse-racing";
  const isCycling = event.sport === "cycling";
  const isPaddling = event.sport === "paddling";
  const isWrc = isRacing && event.leagueKey === "wrc";
  const wrcInfo = isWrc ? getWrcRoundInfo(event.tournamentName || event.homeTeam) : null;
  const wrcRoundShort = isWrc && event.sessionTitle
    ? (event.sessionTitle.match(/Round\s+\d+/i)?.[0] ?? event.sessionTitle)
    : null;
  const wrcRoundId = isWrc ? getWrcRoundBaseId(event.id) : null;
  const wrcStagesResult = useWrcStages(wrcRoundId, isWrc && (isLive || isFinal), isWrc && isLive);
  const wrcLegAllStages = isWrc && event.dayNumber != null
    ? getStagesForLeg(wrcStagesResult, event.dayNumber)
    : [];
  const wrcLegStages = wrcLegAllStages.filter((s) => s.winner != null);
  const wrcLegTotal = wrcLegAllStages.filter((s) => !s.cancelled).length;
  const gpFlag = isRacing ? (wrcInfo?.flag ?? getGrandPrixFlag(event.competitionName || event.homeTeam)) : null;
  const golfTournament = isGolf ? (event.tournamentName || event.homeTeam) : null;
  const golfRound = isGolf && event.sessionTitle
    ? (event.sessionTitle.match(/Round \d+/)?.[0] || event.sessionTitle.split("—")[1]?.trim() || event.sessionTitle)
    : null;
  const isDiamondLeague = isAthletics && (event.id?.startsWith("athletics-diamond-league-") || /diamond\s+league/i.test(event.tournamentName || event.homeTeam || ""));
  const isUtmb = isAthletics && (event.id?.startsWith("athletics-utmb-") || event.leagueKey === "utmb");
  const isGoldenTrail = isAthletics && (event.id?.startsWith("athletics-golden-trail-") || event.leagueKey === "golden-trail");
  const rawAthleticsTournament = isAthletics ? (event.tournamentName || event.homeTeam) : null;
  const athleticsTournament = rawAthleticsTournament
    ? rawAthleticsTournament.replace(/^\s*(diamond\s+league|gtws|utmb)\s*[—–\-:]\s*/i, "").trim()
    : rawAthleticsTournament;
  const horseRacingName = isHorseRacing ? (event.tournamentName || event.homeTeam) : null;
  const cyclingTourName = isCycling ? (event.tournamentName || event.homeTeam) : null;


  const awayRank = isTennis ? event.tennisPlayer1Rank : undefined;
  const homeRank = isTennis ? event.tennisPlayer2Rank : undefined;
  const awayFlag = isTennis ? event.tennisPlayer1Flag : undefined;
  const homeFlag = isTennis ? event.tennisPlayer2Flag : undefined;
  const isIntlSoccer = INTL_SOCCER_LEAGUES.has(event.league);
  const awayFlagUrl = isIntlSoccer ? getCountryFlagUrl(event.awayTeam) : null;
  const homeFlagUrl = isIntlSoccer ? getCountryFlagUrl(event.homeTeam) : null;

  const logoSize = featured ? 22 : 20;
  const isUpcoming = !isLive && !isFinal;
  const showEspnStyle = espnLayout && (isUpcoming || (isLive && isCricket)) && showTeamLayout && !isRacing && !isGolf && !isAthletics && !isHorseRacing && !isPaddling;
  const showRacingEspnStyle = espnLayout && (isUpcoming || isLive) && isRacing;
  const showGolfEspnStyle = espnLayout && isUpcoming && isGolf;
  const showAthleticsEspnStyle = espnLayout && isUpcoming && isAthletics;
  const showCyclingEspnStyle = espnLayout && isUpcoming && isCycling;
  const showPaddlingEspnStyle = espnLayout && isUpcoming && isPaddling;
  const showSvnsEspnStyle = espnLayout && isUpcoming && isSvnsSession;
  const paddlingRaceName = isPaddling ? (event.tournamentName || event.homeTeam) : null;
  const paddlingDayLabel = isPaddling ? (() => {
    const start = new Date(event.startTimeLocal).getTime();
    const end = new Date(event.endTimeLocal || event.startTimeLocal).getTime();
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const dayIdx = Math.min(totalDays, Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1));
    return `Day ${dayIdx} of ${totalDays}`;
  })() : null;
  const cyclingStageLabel = isCycling && event.sessionTitle
    ? (event.sessionTitle.match(/Stage \d+(?:\s+—\s+Final)?/)?.[0]
      || event.sessionTitle.split("—").slice(1).join("—").trim()
      || event.sessionTitle)
    : null;
  const providerBrandId = resolveProviderDisplay(event).brandId;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        uStyles.card,
        featured && uStyles.cardFeatured,
        {
          opacity: pressed ? 0.85 : isFinal ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      testID={`event-${event.id}`}
    >
      <Animated.View style={[uStyles.cardInner, featured && uStyles.cardInnerFeatured, flashStyle]}>
        {!showEspnStyle && !showRacingEspnStyle && !showGolfEspnStyle && !showAthleticsEspnStyle && !showCyclingEspnStyle && !showPaddlingEspnStyle && !showSvnsEspnStyle && (
          <View style={[uStyles.accentBar, { backgroundColor: isLive ? liveTensionColor : (accentBarColor ?? sportColor) }]} />
        )}
        {(showEspnStyle || showRacingEspnStyle || showGolfEspnStyle || showAthleticsEspnStyle || showCyclingEspnStyle || showPaddlingEspnStyle || showSvnsEspnStyle) && (
          <View style={[uStyles.topAccentBar, { backgroundColor: sportColor }]} />
        )}

        {!showEspnStyle && !showRacingEspnStyle && !showGolfEspnStyle && !showAthleticsEspnStyle && !showCyclingEspnStyle && !showPaddlingEspnStyle && !showSvnsEspnStyle && (
          <View style={uStyles.header}>
            <View style={[uStyles.sportPill, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
              <Text style={[uStyles.sportPillText, { color: sportColor }]} numberOfLines={1}>{getLeagueLabel(event)}</Text>
            </View>
            {isRacing && (event.sessionTitle || event.awayTeam) && (
              <View style={[uStyles.racingSessionPill, { backgroundColor: sportColor + "1A" }]}>
                <Text style={[uStyles.racingSessionPillText, { color: sportColor }]}>
                  {event.sessionTitle || event.awayTeam}
                </Text>
              </View>
            )}
            {isGolf && golfRound && (
              <View style={[uStyles.racingSessionPill, { backgroundColor: sportColor + "1A" }]}>
                <Text style={[uStyles.racingSessionPillText, { color: sportColor }]}>
                  {golfRound}
                </Text>
              </View>
            )}
            {!isRacing && !isGolf && !isAthletics && phaseLabel && (
              <PhaseChip label={phaseLabel} sportColor={sportColor} isHot={isHotPhase} grey={isGreyPhaseChip(event)} />
            )}
            <View style={{ flex: 1 }} />
            {featured && (
              <View style={uStyles.featuredBadge}>
                <Ionicons name="star" size={8} color={Colors.accent} />
                <Text style={uStyles.featuredBadgeText}>FEATURED</Text>
              </View>
            )}
            {isLive && (
              <View style={uStyles.liveChip}>
                {tensionRank >= 3 ? <PulsingLightning /> : <LiveDot />}
                <Text style={uStyles.liveText}>{tensionRank >= 3 ? "HIGH TENSION" : "LIVE"}</Text>
              </View>
            )}
            {isFinal && <Text style={uStyles.finalLabel}>FINAL</Text>}
          </View>
        )}

        <View style={uStyles.body}>
          {showRacingEspnStyle ? (
            <View>
              {/* F1 league chip — no session pill */}
              <View style={[uStyles.espnLeagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[uStyles.espnLeagueChipText, { color: sportColor }]}>
                  {getLeagueLabel(event)}
                </Text>
              </View>
              {/* 3-column matchup mirroring Tennis ESPN card */}
              <View style={uStyles.espnMatchup}>
                {/* Left: GP flag + short country name */}
                <View style={uStyles.espnTeamOuter}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    {gpFlag ? (
                      <Image source={{ uri: gpFlag }} style={{ width: 48, height: 32, borderRadius: 3 }} resizeMode="contain" />
                    ) : (
                      <Text style={uStyles.racingEspnFlagLarge}>🏁</Text>
                    )}
                    <Text style={uStyles.espnTeamName} numberOfLines={1}>
                      {isWrc
                        ? (event.tournamentName ?? event.homeTeam)
                        : `${getGrandPrixLocation(event.competitionName || event.homeTeam)} GP`}
                    </Text>
                  </View>
                </View>
                {/* Center: time + provider logo (or live status when in progress) */}
                <View style={uStyles.espnCenter}>
                  {isLive ? (
                    <Text style={[uStyles.espnTime, { color: Colors.live }]} numberOfLines={1}>
                      {score?.racingLap || score?.racingStatus || "In Progress"}
                    </Text>
                  ) : (
                    <Text style={uStyles.espnTime}>{timeStr}</Text>
                  )}
                  {providerBrandId && <ProviderLogo providerId={providerBrandId} size={20} />}
                </View>
                {/* Right: session title (Practice 1, Race, Qualifying…) */}
                <View style={[uStyles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    <Text style={[uStyles.racingEspnTitle, { color: Colors.textPrimary }]} numberOfLines={2}>
                      {isWrc
                        ? (wrcRoundShort ?? event.tournamentName ?? event.homeTeam ?? "Rally")
                        : (event.sessionTitle || event.awayTeam || "")}
                    </Text>
                    {isWrc && event.dayNumber != null && (
                      <Text style={[uStyles.racingEspnTitle, { color: Colors.textSecondary, fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
                        {event.totalDays != null ? `Day ${event.dayNumber} of ${event.totalDays}` : `Day ${event.dayNumber}`}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              {isWrc && <WrcStageWinners stages={wrcLegStages} totalStages={wrcLegTotal} />}
            </View>
          ) : showAthleticsEspnStyle ? (
            <View>
              <View style={[uStyles.espnLeagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[uStyles.espnLeagueChipText, { color: sportColor }]}>
                  {isDiamondLeague ? "DIAMOND LEAGUE" : isUtmb ? "UTMB WORLD SERIES" : isGoldenTrail ? "GOLDEN TRAIL" : event.leagueKey === "marathon-majors" ? "MARATHON MAJORS" : event.leagueKey === "comrades" ? "COMRADES" : getLeagueLabel(event)}
                </Text>
              </View>
              <View style={uStyles.espnMatchup}>
                <View style={uStyles.espnTeamOuter}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    {getAthleticsCityFlagUrl(rawAthleticsTournament) ? (
                      <Image source={{ uri: getAthleticsCityFlagUrl(rawAthleticsTournament)! }} style={{ width: 48, height: 32, borderRadius: 3 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: featured ? 28 : 24 }}>🏃</Text>
                    )}
                  </View>
                </View>
                <View style={uStyles.espnCenter}>
                  <Text style={uStyles.espnTime}>{timeStr}</Text>
                  {providerBrandId && <ProviderLogo providerId={providerBrandId} size={20} />}
                </View>
                <View style={[uStyles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    <Text style={uStyles.espnTeamName} numberOfLines={2}>
                      {athleticsTournament}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : isAthletics ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                {getAthleticsCityFlagUrl(rawAthleticsTournament) ? (
                  <Image source={{ uri: getAthleticsCityFlagUrl(rawAthleticsTournament)! }} style={{ width: featured ? 26 : 22, height: featured ? 17 : 15, borderRadius: 2 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: featured ? 18 : 16 }}>🏃</Text>
                )}
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {athleticsTournament}
                </Text>
              </View>
              {(isLive || isFinal) && score?.marathonLeader && (
                <View style={uStyles.racingLeaderSection}>
                  <View style={uStyles.racingLeaderRow}>
                    <Text style={[uStyles.racingPositionBadge, { color: sportColor }]}>
                      🥇
                    </Text>
                    <Text style={uStyles.racingLeaderName} numberOfLines={1}>
                      {score.marathonLeader}
                    </Text>
                  </View>
                  {(score.marathonLeaderSplit || score.marathonLeaderSplitTime) && (
                    <Text style={uStyles.racingLeaderTeam} numberOfLines={1}>
                      {[score.marathonLeaderSplit, score.marathonLeaderSplitTime]
                        .filter(Boolean)
                        .join(" · ")}
                      {score.marathonLeaderGap ? ` · +${score.marathonLeaderGap}` : ""}
                    </Text>
                  )}
                </View>
              )}
              {(isLive || isFinal) && score?.marathonRaceStatus && (
                <Text style={uStyles.racingContextLine} numberOfLines={1}>
                  {score.marathonRaceStatus === "finished" ? "Complete" : "In progress"}
                </Text>
              )}
            </View>
          ) : isHorseRacing ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                <Text style={{ fontSize: featured ? 18 : 16 }}>🐎</Text>
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {horseRacingName}
                </Text>
              </View>
            </View>
          ) : showCyclingEspnStyle ? (
            <View>
              <View style={[uStyles.espnLeagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[uStyles.espnLeagueChipText, { color: sportColor }]}>
                  {getLeagueLabel(event)}
                </Text>
              </View>
              <View style={uStyles.espnMatchup}>
                <View style={uStyles.espnTeamOuter}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    {isGiroDItalia(cyclingTourName) ? (
                      <Image
                        source={GIRO_DITALIA_LOGO}
                        style={{ width: featured ? 36 : 30, height: featured ? 36 : 30 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={{ fontSize: featured ? 28 : 24 }}>🚴</Text>
                    )}
                    <Text style={uStyles.espnTeamName} numberOfLines={2}>
                      {cyclingTourName}
                    </Text>
                  </View>
                </View>
                <View style={uStyles.espnCenter}>
                  <Text style={uStyles.espnTime}>{timeStr}</Text>
                  {providerBrandId && <ProviderLogo providerId={providerBrandId} size={20} />}
                </View>
                <View style={[uStyles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    <Text style={[uStyles.racingEspnTitle, { color: Colors.textPrimary }]} numberOfLines={2}>
                      {cyclingStageLabel || ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : showPaddlingEspnStyle ? (
            <View>
              <View style={[uStyles.espnLeagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[uStyles.espnLeagueChipText, { color: sportColor }]}>
                  SA BIG THREE
                </Text>
              </View>
              <View style={uStyles.espnMatchup}>
                <View style={uStyles.espnTeamOuter}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    <Text style={{ fontSize: featured ? 28 : 24 }}>🛶</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
                      <Image source={{ uri: countryFlagUrl("rsa")! }} style={{ width: featured ? 24 : 20, height: featured ? 16 : 13, borderRadius: 2 }} resizeMode="contain" />
                      <Text style={uStyles.espnTeamName} numberOfLines={2}>
                        {paddlingRaceName}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={uStyles.espnCenter}>
                  <Text style={uStyles.espnTime}>{timeStr}</Text>
                  {providerBrandId && <ProviderLogo providerId={providerBrandId} size={20} />}
                </View>
                <View style={[uStyles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    <Text style={[uStyles.racingEspnTitle, { color: Colors.textPrimary }]} numberOfLines={1}>
                      {paddlingDayLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : showSvnsEspnStyle ? (
            <View>
              <View style={[uStyles.espnLeagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[uStyles.espnLeagueChipText, { color: sportColor }]}>
                  HSBC SVNS
                </Text>
              </View>
              <View style={uStyles.espnMatchup}>
                <View style={uStyles.espnTeamOuter}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    {getSvnsCityFlag(svnsCity) ? (
                      <Image source={{ uri: getSvnsCityFlag(svnsCity) }} style={{ width: 48, height: 32, borderRadius: 3 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: featured ? 28 : 24 }}>🏉</Text>
                    )}
                    {svnsCity && (
                      <Text style={uStyles.espnTeamName} numberOfLines={1}>{svnsCity}</Text>
                    )}
                  </View>
                </View>
                <View style={uStyles.espnCenter}>
                  <Text style={uStyles.espnTime}>{timeStr}</Text>
                  {providerBrandId && <ProviderLogo providerId={providerBrandId} size={20} />}
                </View>
                <View style={[uStyles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    <Text style={[uStyles.racingEspnTitle, { color: Colors.textPrimary }]} numberOfLines={2}>
                      {svnsSessionLabel || matchupFallback}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : isPaddling ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                <Text style={{ fontSize: featured ? 18 : 16 }}>🛶</Text>
                <Image source={{ uri: countryFlagUrl("rsa")! }} style={{ width: featured ? 22 : 18, height: featured ? 15 : 12, borderRadius: 2 }} resizeMode="contain" />
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {paddlingRaceName} · {paddlingDayLabel}
                </Text>
              </View>
            </View>
          ) : isCycling ? (
            (() => {
              const totalStages = event.cyclingTotalStages;
              const restDays = event.cyclingRestDays || [];
              const startDate = new Date(event.startTimeLocal);
              const endDate = event.endTimeLocal ? new Date(event.endTimeLocal) : null;
              const nowD = new Date();
              let stageLabel: string | null = null;
              if (totalStages) {
                if (endDate && nowD > endDate) {
                  stageLabel = "Final standings";
                } else if (nowD < startDate) {
                  stageLabel = `${totalStages} stages`;
                } else {
                  const daysSinceStart = Math.floor((nowD.getTime() - startDate.getTime()) / 86400000);
                  let restsPassed = 0;
                  for (const rd of restDays) {
                    const rdDate = new Date(rd + "T00:00:00Z");
                    if (rdDate <= nowD) restsPassed++;
                  }
                  const stageNum = Math.max(1, Math.min(totalStages, daysSinceStart + 1 - restsPassed));
                  const isRestToday = restDays.some(rd => rd === nowD.toISOString().slice(0, 10));
                  stageLabel = isRestToday
                    ? `Rest day · Stage ${stageNum + 1} tomorrow`
                    : `Stage ${stageNum} of ${totalStages}`;
                }
              }
              const leaderStageNum = score?.cyclingStageNumber;
              return (
                <View style={uStyles.racingLayout}>
                  <View style={uStyles.racingCircuitRow}>
                    {isGiroDItalia(cyclingTourName) ? (
                      <Image
                        source={GIRO_DITALIA_LOGO}
                        style={{ width: featured ? 24 : 20, height: featured ? 24 : 20 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={{ fontSize: featured ? 18 : 16 }}>🚴</Text>
                    )}
                    <Text
                      style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                      numberOfLines={1}
                    >
                      {cyclingTourName}
                    </Text>
                  </View>
                  {stageLabel && (
                    <Text style={uStyles.racingSessionSubtitle} numberOfLines={1}>
                      {stageLabel}
                      {event.cyclingRoute ? ` · ${event.cyclingRoute}` : ""}
                    </Text>
                  )}
                  {(isLive || isFinal) && score?.cyclingLeader && (
                    <View style={uStyles.racingLeaderSection}>
                      <View style={uStyles.racingLeaderRow}>
                        <Text style={[uStyles.racingPositionBadge, { color: sportColor }]}>
                          🌸
                        </Text>
                        <Text style={uStyles.racingLeaderName} numberOfLines={1}>
                          {score.cyclingLeader}
                        </Text>
                      </View>
                      {(score.cyclingLeaderTeam || score.cyclingLeaderGap) && (
                        <Text style={uStyles.racingLeaderTeam} numberOfLines={1}>
                          {[score.cyclingLeaderTeam, score.cyclingLeaderGap ? `+${score.cyclingLeaderGap}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                          {leaderStageNum ? ` · after Stage ${leaderStageNum}` : ""}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })()
          ) : showGolfEspnStyle ? (
            <View>
              <View style={[uStyles.espnLeagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[uStyles.espnLeagueChipText, { color: sportColor }]}>
                  {getLeagueLabel(event)}
                </Text>
              </View>
              <View style={uStyles.espnMatchup}>
                <View style={uStyles.espnTeamOuter}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    {golfTournament === "The Masters" ? (
                      <Image
                        source={MASTERS_LOGO}
                        style={{ width: featured ? 44 : 36, height: featured ? 44 : 36 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={{ fontSize: featured ? 28 : 24 }}>⛳</Text>
                    )}
                    <Text style={uStyles.espnTeamName} numberOfLines={2}>
                      {golfTournament}
                    </Text>
                  </View>
                </View>
                <View style={uStyles.espnCenter}>
                  <Text style={uStyles.espnTime}>{timeStr}</Text>
                  {providerBrandId && <ProviderLogo providerId={providerBrandId} size={20} />}
                </View>
                <View style={[uStyles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                  <View style={uStyles.espnStarSlot} />
                  <View style={uStyles.espnTeam}>
                    <Text style={[uStyles.racingEspnTitle, { color: Colors.textPrimary }]} numberOfLines={2}>
                      {golfRound || ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : isGolf ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                <Text style={{ fontSize: featured ? 18 : 16 }}>⛳</Text>
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {golfTournament}
                </Text>
                {golfRound && (
                  <Text style={[uStyles.racingSessionSubtitle, { marginLeft: 4 }]} numberOfLines={1}>
                    R{golfRound}
                  </Text>
                )}
              </View>
              {(isLive || isFinal) && score?.golfLeader && (
                <View style={uStyles.golfLeaderSection}>
                  {/* Overall leader row */}
                  <View style={uStyles.golfLeaderRow}>
                    <Text style={[uStyles.golfLeaderScore, { color: sportColor }]} numberOfLines={1}>
                      {score.golfLeaderScore}
                    </Text>
                    <Text style={uStyles.golfLeaderName} numberOfLines={1}>
                      {score.golfLeader.split(" ").pop()}
                    </Text>
                    <Text style={uStyles.golfLeaderThru} numberOfLines={1}>
                      {score.golfLeaderThru}
                    </Text>
                  </View>
                  {/* Active best player — only when different from leader and still on course */}
                  {isLive && score.golfActiveLeader && (
                    <View style={[uStyles.golfLeaderRow, uStyles.golfActiveRow]}>
                      <Text style={[uStyles.golfLeaderScore, uStyles.golfActiveScore]} numberOfLines={1}>
                        {score.golfActiveLeaderScore}
                      </Text>
                      <Text style={[uStyles.golfLeaderName, uStyles.golfActiveName]} numberOfLines={1}>
                        {score.golfActiveLeader.split(" ").pop()}
                      </Text>
                      <Text style={[uStyles.golfLeaderThru, uStyles.golfActiveThru]} numberOfLines={1}>
                        {score.golfActiveLeaderThru}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : isRacing ? (
            <View style={uStyles.racingLayout}>
              <View style={uStyles.racingCircuitRow}>
                {gpFlag ? (
                  <Image source={{ uri: gpFlag }} style={{ width: featured ? 26 : 22, height: featured ? 17 : 15, borderRadius: 2 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: featured ? 18 : 16 }}>🏁</Text>
                )}
                <Text
                  style={[uStyles.racingCircuitName, featured && uStyles.racingCircuitNameFeatured]}
                  numberOfLines={1}
                >
                  {event.competitionName || event.homeTeam}
                </Text>
              </View>
              {(event.sessionTitle || event.awayTeam) && (
                <Text style={uStyles.racingSessionSubtitle} numberOfLines={1}>
                  {isWrc && event.dayNumber != null && event.totalDays != null
                    ? `${event.sessionTitle || event.awayTeam} · Day ${event.dayNumber} of ${event.totalDays}`
                    : (event.sessionTitle || event.awayTeam)}
                </Text>
              )}
              {(isLive || isFinal) && score?.racingLeader && (
                <View style={uStyles.racingLeaderSection}>
                  <View style={uStyles.racingLeaderRow}>
                    {score.racingLeaderPosition != null && (
                      <Text style={[uStyles.racingPositionBadge, { color: sportColor }]}>
                        P{score.racingLeaderPosition}
                      </Text>
                    )}
                    {getDriverFlag(score.racingLeaderCountry) && (
                      <Image source={{ uri: getDriverFlag(score.racingLeaderCountry)! }} style={uStyles.racingDriverFlag} resizeMode="contain" />
                    )}
                    <Text style={uStyles.racingLeaderName} numberOfLines={1}>
                      {score.racingLeader}
                    </Text>
                  </View>
                  {score.racingLeaderTeam && (
                    <Text style={uStyles.racingLeaderTeam} numberOfLines={1}>
                      {score.racingLeaderTeam}
                    </Text>
                  )}
                </View>
              )}
              {(isLive || isFinal) && (score?.racingLap || score?.racingStatus) && (
                <Text style={uStyles.racingContextLine} numberOfLines={1}>
                  {score?.racingLap || (isFinal ? "Complete" : "")}
                  {isLive && score?.racingStatus && score.racingStatus !== score.racingLap
                    ? (score?.racingLap ? " · " : "") + score.racingStatus
                    : ""}
                </Text>
              )}
              {isWrc && <WrcStageWinners stages={wrcLegStages} totalStages={wrcLegTotal} />}
            </View>
          ) : isTennis && showTeamLayout && (isLive || isFinal) ? (
            <TennisScoreboard
              event={event}
              score={score}
              isLive={isLive}
              isFinal={isFinal}
              featured={featured}
              scoreColor="#FFFFFF"
            />
          ) : showEspnStyle ? (
            <View>
              <View style={[uStyles.espnLeagueChip, { backgroundColor: sportColor + "18", borderColor: sportColor + "50" }]}>
                <Text style={[uStyles.espnLeagueChipText, { color: sportColor }]}>
                  {getLeagueLabel(event)}
                </Text>
              </View>
              <View style={uStyles.espnMatchup}>
                {/* Away — star on the outside left */}
                <View style={uStyles.espnTeamOuter}>
                  <View style={uStyles.espnStarSlot}>
                    {isFavAway && <MaterialCommunityIcons name="star" size={12} color={Colors.favStar} />}
                  </View>
                  <View style={uStyles.espnTeam}>
                    {isTennis && awayFlag
                      ? <Image source={{ uri: awayFlag }} style={{ width: 48, height: 32, borderRadius: 3 }} resizeMode="contain" />
                      : isIntlSoccer && awayFlagUrl
                        ? <Image source={{ uri: awayFlagUrl }} style={{ width: 48, height: 32, borderRadius: 3 }} resizeMode="contain" />
                        : <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={32} />}
                    <Text style={uStyles.espnTeamName} numberOfLines={1}>{awayName}</Text>
                  </View>
                </View>
                <View style={uStyles.espnCenter}>
                  <Text style={uStyles.espnTime}>{timeStr}</Text>
                  {providerBrandId && <ProviderLogo providerId={providerBrandId} size={20} />}
                </View>
                {/* Home — star on the outside right (row-reverse flips slot to right) */}
                <View style={[uStyles.espnTeamOuter, { flexDirection: "row-reverse" }]}>
                  <View style={uStyles.espnStarSlot}>
                    {isFavHome && <MaterialCommunityIcons name="star" size={12} color={Colors.favStar} />}
                  </View>
                  <View style={uStyles.espnTeam}>
                    {isTennis && homeFlag
                      ? <Image source={{ uri: homeFlag }} style={{ width: 48, height: 32, borderRadius: 3 }} resizeMode="contain" />
                      : isIntlSoccer && homeFlagUrl
                        ? <Image source={{ uri: homeFlagUrl }} style={{ width: 48, height: 32, borderRadius: 3 }} resizeMode="contain" />
                        : <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={32} />}
                    <Text style={uStyles.espnTeamName} numberOfLines={1}>{homeName}</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : showTeamLayout ? (
            <>
              {seriesDisplay && (
                <View style={uStyles.seriesRow}>
                  {seriesDisplay.gameLabel && (
                    <Text style={[uStyles.seriesGameText, { color: sportColor }]}>
                      {seriesDisplay.gameLabel}
                    </Text>
                  )}
                  {seriesDisplay.gameLabel && (
                    <Text style={uStyles.seriesDot}>·</Text>
                  )}
                  <Text style={uStyles.seriesLabelText}>{seriesDisplay.label}</Text>
                </View>
              )}
              <View style={uStyles.teamRow}>
                {awayFlag ? (
                  <Image source={{ uri: awayFlag }} style={[uStyles.flagIcon, { width: logoSize, height: Math.round(logoSize * 0.7) }]} resizeMode="contain" />
                ) : isIntlSoccer && awayFlagUrl ? (
                  <Image source={{ uri: awayFlagUrl }} style={[uStyles.flagIcon, { width: logoSize, height: Math.round(logoSize * 0.7) }]} resizeMode="contain" />
                ) : (
                  <TeamLogo teamName={event.awayTeam} league={event.league} sport={event.sport} size={logoSize} />
                )}
                <Text
                  style={[uStyles.teamName, featured && uStyles.teamNameFeatured]}
                  numberOfLines={1}
                >
                  {awayName}{awayRank ? <Text style={[uStyles.rankInline, { color: sportColor }]}>{` (${awayRank})`}</Text> : null}
                </Text>
                {isFavAway && <MaterialCommunityIcons name="star" size={11} color={Colors.favStar} />}
                <View style={{ flex: 1 }} />
                {hasScore && isCricket
                  ? <Text style={[uStyles.cricketScoreText, isLive && uStyles.scoreLive]} numberOfLines={1}>{(score.cricketAway || "").replace(/\s*Ov\s*\)/, ")")}</Text>
                  : hasScore && !isTennis
                    ? <Text style={[uStyles.scoreText, featured && uStyles.scoreTextFeatured, isLive && uStyles.scoreLive]}>{score.awayScore}</Text>
                    : isLive && !hasScore && event.sport === "hockey"
                      ? <Text style={[uStyles.scoreText, uStyles.scoreLive]}>0</Text>
                      : null}
              </View>
              <View style={uStyles.teamRow}>
                {homeFlag ? (
                  <Image source={{ uri: homeFlag }} style={[uStyles.flagIcon, { width: logoSize, height: Math.round(logoSize * 0.7) }]} resizeMode="contain" />
                ) : isIntlSoccer && homeFlagUrl ? (
                  <Image source={{ uri: homeFlagUrl }} style={[uStyles.flagIcon, { width: logoSize, height: Math.round(logoSize * 0.7) }]} resizeMode="contain" />
                ) : (
                  <TeamLogo teamName={event.homeTeam} league={event.league} sport={event.sport} size={logoSize} />
                )}
                <Text
                  style={[uStyles.teamName, featured && uStyles.teamNameFeatured]}
                  numberOfLines={1}
                >
                  {homeName}{homeRank ? <Text style={[uStyles.rankInline, { color: sportColor }]}>{` (${homeRank})`}</Text> : null}
                </Text>
                {isFavHome && <MaterialCommunityIcons name="star" size={11} color={Colors.favStar} />}
                <View style={{ flex: 1 }} />
                {hasScore && isCricket
                  ? <Text style={[uStyles.cricketScoreText, isLive && uStyles.scoreLive]} numberOfLines={1}>{(score.cricketHome || "").replace(/\s*Ov\s*\)/, ")")}</Text>
                  : hasScore && !isTennis
                    ? <Text style={[uStyles.scoreText, featured && uStyles.scoreTextFeatured, isLive && uStyles.scoreLive]}>{score.homeScore}</Text>
                    : isLive && !hasScore && event.sport === "hockey"
                      ? <Text style={[uStyles.scoreText, uStyles.scoreLive]}>0</Text>
                      : null}
              </View>
            </>
          ) : (
            <>
              <Text style={uStyles.fallbackMatchup} numberOfLines={2}>
                {matchupFallback}
              </Text>
              {isSvnsSession && svnsDisplayMatch && (
                <SvnsMatchRow match={svnsDisplayMatch} isLive={isLive} />
              )}
            </>
          )}
          {event.t20WcVenue && isTbc ? (
            <Text style={uStyles.venueText} numberOfLines={1}>{event.t20WcVenue}</Text>
          ) : event.isOlympic && event.olympicVenue ? (
            <Text style={uStyles.venueText} numberOfLines={1}>{event.olympicVenue}</Text>
          ) : null}
        </View>

        {!showEspnStyle && !showRacingEspnStyle && !showGolfEspnStyle && !showAthleticsEspnStyle && !showCyclingEspnStyle && !showPaddlingEspnStyle && !showSvnsEspnStyle && (
          <View style={uStyles.footer}>
            {isLive ? (
              <>
                <View style={uStyles.footerLeft}>
                  <ProviderLogo providerId={resolveProviderDisplay(event).brandId} size={18} />
                </View>
                <View style={uStyles.footerRight}>
                  {tensionLabel && (
                    <View style={uStyles.tensionTag}>
                      <Text style={uStyles.tensionTagText}>{tensionLabel}</Text>
                    </View>
                  )}
                  {isRacing ? (
                    <Text style={uStyles.clockText}>
                      {score?.racingLap || score?.racingStatus || "In Progress"}
                    </Text>
                  ) : isGolf && score?.golfLeaderThru ? (
                    <Text style={uStyles.clockText}>{score.golfLeaderThru}</Text>
                  ) : displayClockText ? (
                    <View style={{ flexDirection: "row", alignItems: "flex-start", alignSelf: "flex-end" }}>
                      {displayClockText.includes(" · ") && (
                        <Text style={uStyles.clockText}>{displayClockText.split(" · ").slice(0, -1).join(" · ")} · </Text>
                      )}
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={uStyles.clockText}>
                          {displayClockText.includes(" · ") ? displayClockText.split(" · ").pop()! : displayClockText}
                        </Text>
                        {!displayClockText.startsWith("Started") && <LiveScanBar color="#1CB0F6" />}
                      </View>
                    </View>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <View style={uStyles.footerLeft}>
                  {isRacing && isFinal ? (
                    <Text style={uStyles.finalStatus}>
                      {score?.racingLeader ? "Winner" : "Final"}
                    </Text>
                  ) : isFinal ? (
                    <Text style={uStyles.finalStatus}>Final</Text>
                  ) : (
                    <>
                      <Text style={uStyles.timeText}>@ {timeStr}</Text>
                      {showCountdown && (
                        <Text style={uStyles.countdownText}>
                          {formatTimeUntilStart(event.startTimeLocal, now)}
                        </Text>
                      )}
                    </>
                  )}
                </View>
                <View style={uStyles.footerRight}>
                  <ProviderLogo providerId={resolveProviderDisplay(event).brandId} size={18} />
                </View>
              </>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const uStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 10,
  },
  cardFeatured: {
    borderWidth: 2,
    borderColor: Colors.accent + "60",
    borderRadius: 16,
  },
  cardInner: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 13,
    overflow: "hidden" as const,
  },
  cardInnerFeatured: {
    padding: 16,
    borderRadius: 15,
  },
  accentBar: {
    position: "absolute" as const,
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  topAccentBar: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginBottom: 10,
    flexWrap: "wrap" as const,
  },
  headerSport: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  headerDot: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  headerLeague: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    maxWidth: 140,
  },
  phaseChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phaseChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  featuredBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: Colors.accent + "18",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 0.3,
  },
  favStar: {
    fontSize: 11,
    color: Colors.favStar,
  },
  sportPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
  },
  sportPillText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  liveChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.liveDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDotStatic: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.live,
    letterSpacing: 0.5,
  },
  finalLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  body: {
    gap: 6,
    marginBottom: 10,
    paddingLeft: 4,
  },
  teamRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  seriesRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 4,
  },
  seriesGameText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  seriesDot: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  seriesLabelText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  teamName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  teamNameFeatured: {
    fontSize: 17,
  },
  scoreText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: "right" as const,
  },
  scoreTextFeatured: {
    fontSize: 17,
  },
  cricketScoreText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textAlign: "right" as const,
    flexShrink: 0,
    maxWidth: 120,
  },
  flagIcon: {
    marginRight: 6,
    borderRadius: 2,
  },
  rankInline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  scoreLive: {
    color: "#FFFFFF",
  },
  fallbackMatchup: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    paddingLeft: 4,
  },
  racingLayout: {
    gap: 4,
    paddingLeft: 4,
  },
  racingCircuitRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  racingCircuitName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    flex: 1,
  },
  racingCircuitNameFeatured: {
    fontSize: 18,
  },
  racingSessionSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  racingLeaderSection: {
    marginTop: 4,
    gap: 2,
  },
  golfLeaderSection: {
    marginTop: 6,
    gap: 3,
  },
  golfLeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  golfLeaderScore: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    minWidth: 32,
  },
  golfLeaderName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  golfLeaderThru: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  golfActiveRow: {
    opacity: 0.75,
  },
  golfActiveScore: {
    color: Colors.textSecondary,
  },
  golfActiveName: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  golfActiveThru: {
    color: Colors.textMuted,
  },
  racingLeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  racingDriverFlag: {
    width: 20,
    height: 13,
    borderRadius: 2,
  },
  racingLeaderName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  racingPositionBadge: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  racingLeaderTeam: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginLeft: 20,
  },
  racingContextLine: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  wrcStagesSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 5,
  },
  wrcStagesHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 1,
  },
  wrcStagesHeader: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  wrcStagesCount: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  wrcStageRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  wrcStageBadge: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    minWidth: 34,
  },
  wrcStageName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  wrcStageFlag: {
    width: 18,
    height: 12,
    borderRadius: 2,
  },
  wrcStageWinner: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    maxWidth: 110,
  },
  wrcStageTime: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    minWidth: 52,
    textAlign: "right" as const,
  },
  racingSessionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  racingSessionPillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  racingEspnBody: {
    alignItems: "center" as const,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  racingEspnBadgeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
  },
  racingEspnCircuitRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingHorizontal: 4,
  },
  racingEspnFlag: {
    fontSize: 22,
  },
  racingEspnFlagLarge: {
    fontSize: 28,
  },
  racingEspnTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    textAlign: "center" as const,
    flexShrink: 1,
  },
  racingEspnTimeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
  },
  venueText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
    paddingLeft: 4,
  },
  footer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  footerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  footerRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  espnLeagueChip: {
    alignSelf: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  espnLeagueChipText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  espnMatchup: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  espnTeamOuter: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  espnStarSlot: {
    width: 10,
    height: 32,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  espnTeam: {
    flex: 1,
    alignItems: "center" as const,
    gap: 6,
  },
  espnCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 8,
    gap: 6,
  },
  espnTime: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    textAlign: "center" as const,
  },
  espnTeamName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    textAlign: "center" as const,
    letterSpacing: 0.2,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  countdownText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  clockText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#1CB0F6",
  },
  finalStatus: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  tensionTag: {
    backgroundColor: "rgba(229,115,115,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tensionTagText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#E57373",
    letterSpacing: 0.3,
  },
});
