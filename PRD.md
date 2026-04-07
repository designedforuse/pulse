# Pulse — Product Requirements Document

**Version:** 3.0  
**Date:** April 2026  
**Status:** Active Development

---

## 1. Product Vision

Pulse is a personal sports companion for fans who follow multiple sports at once. It eliminates the fragmentation of tracking schedules across team apps, league sites, and streaming platforms by surfacing the right games at the right time — and making it easy to start watching in one tap.

The core promise: *you never miss a game that matters to you, and you never have to think hard about what's on.*

---

## 2. Target User

**Primary persona:** The multi-sport fan.  
Follows 3–8 sports. Has 4–12 anchor teams. Watches on a mix of Apple TV, YouTube TV, Prime Video, and FloSports. Checks their phone during commercials and before sitting down to watch.

**Pain points addressed:**
- Doesn't know what's live right now across all their sports
- Misses games because they didn't realize they overlapped
- Has to open 4 different apps to check scores
- Streaming provider fragmentation — never remembers which app carries which league

---

## 3. Platform

- **Mobile:** iOS (primary), Android
- **Backend:** Express.js API server (Node/TypeScript)
- **Framework:** Expo (React Native) with Expo Router
- **Data refresh:** Automatic twice-daily (6 AM / 6 PM), manual pull-to-refresh

---

## 4. Navigation Structure

Three-tab interface. Watch is the default landing tab.

| Tab | Icon | Purpose |
|-----|------|---------|
| **Watch** | ⚡ | Live events, Chaos multiview, full schedule |
| **Rituals** | Teal | Curated viewing packages organized by mode |
| **Stories** | Pink | Daily wrap, tonight's narrative, intelligence cards |

iOS uses native liquid glass tab bar. Android uses a standard bottom tab bar.

---

## 5. Feature Specifications

### 5.1 Watch Tab

#### Live Now Banner
- Appears at top of screen when ≥1 game is live
- Shows count of live games and a pulsing indicator
- Scrolls to the live section on tap

#### Up Next Banner
- Appears when the next game starts within 60 minutes
- Shows which game is starting soon

#### 4-Game Chaos View
The signature feature. A 2×2 multiview grid that auto-selects the best 4 games to watch simultaneously.

**Slot logic:**
- Slots 1–3: Anchor teams (favorited), prioritized by live status and closeness of score
- Slot 4 (Chaos Slot): Dynamically promoted based on real-time excitement signals

**Chaos signals (Slot 4 eligibility):**
- Goals scored in last 5 minutes
- Overtime / extra time
- F1 Safety Car, Red Flag, final laps
- Tight score (within 1 goal / 3 points)

**F1 session scoring for Chaos eligibility:**
- Race: +80
- Sprint: +40
- Qualifying: +15
- Practice: not eligible (Live Now only)

#### Schedule View
- Full list of today's events, grouped by time segment (Live, Upcoming, Final)
- Sport filters at top (tap to hide/show sports)
- Events sorted: Live → Upcoming (soonest first) → Final (most recent first)

#### Event Cards
All events use the `UnifiedEventCard` component:
- Sport-colored left accent bar
- Team logos (with fallback initials)
- Live score with clock / game period
- Provider badge (tap opens streaming app)
- Sport-specific score layouts:
  - Hockey/Soccer/Basketball: score + period/half
  - Tennis: set-by-set scoreboard
  - Golf: leaderboard position + through-hole + score-to-par
  - F1: session type + leader + lap count
  - Cricket: innings, runs, wickets, overs
  - Athletics/Marathon: 🏃 emoji + event name + date
  - Athletics/Diamond League: 🏃 emoji + "Diamond League — City"
  - Horse Racing: 🐎 emoji + race name (Triple Crown)
  - Cycling: 🚴 emoji + tour name + route

#### Live Score Display
- Polls live score endpoint every 45 seconds while app is foregrounded
- Status normalization: UPCOMING → LIVE → FINAL
- Golf: shows `golfLeaderThru` ("Thru 7") in footer, not elapsed time
- Golf FINAL: only set when leader has completed 18 holes (ESPN "post" status alone is insufficient)
- Extended duration defaults prevent premature FINAL: golf (10h), tennis (4h), athletics (4h), F1 (4h)

---

### 5.2 Rituals Tab

Rituals are curated multi-sport viewing packages. Each ritual bundles a collection of events around a theme (e.g., "Weekend Nights," "Saturday Afternoon Hockey").

**Ritual list view:**
- Cards per ritual showing sport icons, time range, and live indicator

**Ritual detail view:**
- Featured game at top (manually overridable by user)
- Event list filtered to ritual's sport/time criteria
- Session-type events (F1, SVNS, cycling, horse racing) display as tournament name + emoji, not team matchup

**Featured override:**
- User can tap any event on a ritual detail page to promote it to the featured slot
- Override persists in AsyncStorage per ritual

---

### 5.3 Stories Tab (Explore)

The intelligent content feed. Three modules stacked vertically.

#### Daily Wrap Card
At the very top of the feed. A day-in-review summary of completed results.

**Feed card (compact):**
- Header: "DAILY WRAP" kicker + date + newspaper icon
- Headline: top result based on priority score (editorial prose + detail line)
- 5 secondary results (emoji + editorial + detail + ⭐ for favorites)
- Footer: "X from your teams · See all N results →" (tappable)
- Whole card tappable → navigates to Daily Wrap Full screen

**Priority scoring:**
| Sport/Tier | Score |
|---|---|
| F1 Race | 100 |
| Golf Major | 90 |
| Soccer World Cup | 88 |
| Tennis Grand Slam | 85 |
| SVNS | 78 |
| Tennis Masters | 75 |
| Tennis | 65 |
| EPL | 52 |
| NHL | 48 |
| NBA | 44 |
| Other soccer leagues | 38–52 |
| AHL | 28 |
| ECHL | 20 |

**Favorite surfacing:** Results featuring a favorited team are sorted to the top (preserving priority tiers), and the headline gets a "⭐ YOUR TEAM" badge.

**Editorial templates per sport:**
- Hockey: "X dominated / edged / beat Y Z–W"
- Soccer: "X kept a clean sheet / hammered / edged Y Z–W"
- Basketball: "X beat / edged Y Z–W"
- Golf: "🏳️ [Player] wins [Tournament] at [score]" (with nationality flag)
- Tennis: "[Winner] beats [Loser] at [Tournament]" + set scores
- F1: "[Driver] wins [Race]" or "[Driver] leads [Race] after [lap] laps"

**Daily Wrap Full screen:**
- Full-page view with all results
- Headline card at top (prominent, sport-color border)
- Remaining results in a grouped list card
- First 10 results visible, then "Show X more" accordion toggle
- "Show less" to collapse
- Favorites carry ⭐ throughout

**Refresh:** Every 10 minutes (automatic), plus on pull-to-refresh.  
**Quiet state:** If no final results exist yet for the calendar day, shows "No results yet today."

#### Tonight's Story
A hero editorial card surfacing the highest-priority live or upcoming narrative signal.

- Generated from live event data and upcoming schedule
- Personalized: prioritizes events involving favorited teams
- Disappears when no strong signal exists

#### Narrative Intelligence Cards
Dynamic cards that trigger when data thresholds are crossed. Cards:

| Card Type | Trigger Condition |
|---|---|
| Playoff Push | Team within 3 points of playoff cutoff |
| Clinch Watch | Team can clinch with a win tonight |
| Rivalry Game | Historical rivalry matchup |
| Upset Alert | Heavy underdog is winning or close |
| Momentum | Team on 5+ game win streak |
| Deadline Watch | Trade deadline approaching |
| Player Movement | Recent trade/signing in favorited team's league |
| League Moment | Record-breaking milestone in progress |

Each card can optionally surface a contextual YouTube video via search (cached, trusted channels prioritized).

---

### 5.4 Favorites & Sport Management

**Team favorites:**
- Users can follow specific teams across all sports
- Favorited teams influence: Chaos slot priority, Daily Wrap ordering, narrative card personalization

**Sport-level toggles:**
- Users can disable entire sports (e.g., hide cricket from all views)
- Disabled sports are excluded from Watch tab, Rituals, and Stories

**League-level toggles:**
- Within each sport, individual leagues can be toggled on/off
- e.g., Athletics: "World Marathon Majors" and "Diamond League" are independent toggles

**Storage:** AsyncStorage (local, persistent).

---

## 6. Sports Coverage

| Sport | Leagues / Competitions | Data Source | Broadcaster(s) |
|---|---|---|---|
| Baseball | MLB (all 30 teams) | ESPN API | ESPN+, FOX, FS1, Apple TV+, Prime Video, YouTube TV, MLB.TV |
| Basketball | NBA, NCAAB | ESPN API | Disney+/ESPN+ |
| Ice Hockey | NHL, AHL, ECHL, NCAA (BU) | NHL API, HockeyTech, API-Hockey, CHN scrape | Disney+, Victory+, YouTube TV |
| Soccer | EPL, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, Europa League, FA Cup, MLS, USL, NWSL | iCal feeds (fixturedownload, rugbyfixture), ESPN API | Apple TV+, YouTube TV, Disney+ |
| International Soccer | FIFA World Cup 2026, International Friendlies (US broadcast only) | ESPN API | FOX, FS1, ESPN2, TNT → YouTube TV |
| Rugby Union | URC, Top 14, English Premiership, European Champions Cup, Super Rugby Pacific, Japan League One, MLR, SVNS | rugbyfixture.io iCal, all.rugby scrape, World Rugby API, hardcoded | FloSports, YouTube TV |
| Tennis | ATP (all tiers) | ESPN API | Disney+/ESPN+ |
| Formula 1 | All sessions (Race, Sprint, Qualifying, Practice) | ESPN API | Disney+/ESPN+ |
| Golf | The Players, The Masters, PGA Championship, US Open, The Open | Hardcoded schedule + ESPN live scores | YouTube TV |
| Cricket | International + domestic (inc. IPL) | CricAPI (free tier) + IPL official feed (iplt20.com) | FloSports |
| Athletics | World Marathon Majors (7 races), Diamond League (16 meets) | Hardcoded schedule | FloSports |
| Horse Racing | Triple Crown — Kentucky Derby, Preakness Stakes, Belmont Stakes | Hardcoded schedule | NBC (Kentucky Derby, Preakness) → YouTube TV; FOX (Belmont) → YouTube TV |
| Cycling | Grand Tour — Giro d'Italia, Tour de France, Vuelta a España | Hardcoded schedule | TNT Sports (Giro) → YouTube TV; NBC Sports (TdF, Vuelta) → YouTube TV |

### Athletics — Diamond League Detail

16 events in the 2026 season, all on FloSports:

| # | Date | City |
|---|------|------|
| 1 | May 8 | Doha, Qatar |
| 2 | May 16 | Shanghai, China |
| 3 | May 23 | Xiamen, China |
| 4 | May 31 | Rabat, Morocco |
| 5 | June 4 | Rome, Italy |
| 6 | June 7 | Stockholm, Sweden |
| 7 | June 10 | Oslo, Norway |
| 8 | June 26 | Paris, France |
| 9 | July 4 | Eugene, USA |
| 10 | July 10 | Monaco |
| 11 | July 18 | London, Great Britain |
| 12 | Aug 21 | Lausanne, Switzerland |
| 13 | Aug 23 | Silesia, Poland |
| 14 | Aug 27 | Zurich, Switzerland |
| 🏆 | Sep 4 | Brussels Final — Day 1 |
| 🏆 | Sep 5 | Brussels Final — Day 2 |

### Cycling — Grand Tour Detail

| Race | Dates | Route | Provider |
|---|---|---|---|
| Giro d'Italia | May 8–31 | Nessebar, Bulgaria → Rome, Italy | TNT Sports → YouTube TV |
| Tour de France | July 4–26 | Barcelona, Spain → Paris, France | NBC Sports → YouTube TV |
| Vuelta a España | Aug 22–Sept 13 | Monaco → Madrid, Spain | NBC Sports → YouTube TV |

### Horse Racing — Triple Crown Detail

| Race | Date | Venue | Provider |
|---|---|---|---|
| Kentucky Derby | May 2 | Churchill Downs, Louisville | NBC → YouTube TV |
| Preakness Stakes | May 16 | Pimlico Race Course, Baltimore | NBC → YouTube TV |
| Belmont Stakes | June 6 | Belmont Park, New York | FOX → YouTube TV |

---

## 7. Streaming Provider Integrations

| Provider | Deep Link | Sports Covered |
|---|---|---|
| Apple TV+ | `videos://` | MLS |
| YouTube TV | `googleyoutubetv://` | Broad coverage — NHL, NBA, EPL, soccer, FOX/FS1, NBC Sports, TNT Sports |
| Disney+ / ESPN+ | `disneyplus://` | F1, NHL, NBA, NCAAB, MLS, Tennis, UFC |
| FloSports | `flosports://` | Marathon Majors, Diamond League, wrestling, MLR, rugby |
| Victory+ | `victoryplus://` | NHL games |
| Prime Video | `primevideo://` | NFL, select soccer, select MLB |
| FOX (via YouTube TV) | → YouTube TV | World Cup 2026, Belmont Stakes, select MLB |
| FS1 (via YouTube TV) | → YouTube TV | World Cup 2026, select soccer |
| NBC Sports (via YouTube TV) | → YouTube TV | Kentucky Derby, Preakness, Tour de France, Vuelta a España |
| TNT Sports (via YouTube TV) | → YouTube TV | Giro d'Italia |

Tapping a provider badge on an event card deep-links to the provider's app (or the App Store if not installed). FOX, FS1, NBC Sports, and TNT Sports route through YouTube TV.

---

## 8. SVNS Live Match Tracking

SVNS (Sevens World Series) session cards show live match data from within each tournament day.

- Source: World Rugby API (`api.wr-rims-prod.pulselive.com`)
- Shows: team abbreviations, score, current phase, gender label (M/W)
- Server-side caching: 60 seconds
- Client polling: every 45 seconds
- All 9 SVNS stops mapped in `server/svnsMatches.ts`
- Endpoint: `/api/svns-matches?city={city}`

---

## 9. Schedule Refresh Architecture

| Trigger | Time / Condition |
|---|---|
| Automatic (cron) | 6:00 AM daily |
| Automatic (cron) | 6:00 PM daily |
| Manual | User taps Refresh in Settings tab |
| On-demand | Client pull-to-refresh |

Refresh status available at `/api/refresh-status`.

**Retention windows by sport:**
| Sport | Past | Future |
|---|---|---|
| Most sports | 14 days | 7–14 days |
| Athletics (Marathon) | 14 days | 120 days |
| Athletics (Diamond League) | 14 days | 160 days |
| Cycling | 14 days | 180 days |
| Golf | 14 days | 180 days |
| International Soccer (World Cup) | 14 days | through Aug 2026 |
| International Soccer (Friendlies) | 14 days | 60 days |

CricAPI quota management: MAX_PAGES=10 per fetch cycle; budget ≈92 hits/day (20 schedule + 72 live) vs. 100/day free tier limit. Cache timestamp always updated after each call to prevent hammering.

---

## 10. API Surface

| Endpoint | Description |
|---|---|
| `GET /api/events` | All events (merged API + local) |
| `GET /api/live-scores` | Live score data for in-progress events |
| `GET /api/narrative-cards` | Narrative intelligence card data |
| `GET /api/svns-matches?city=X` | SVNS live match for a tournament stop |
| `GET /api/daily-wrap?tz=N` | Daily results summary (timezone offset in minutes) |
| `GET /api/refresh-status` | Last refresh timestamp + status |
| `POST /api/refresh` | Trigger manual schedule refresh |

---

## 11. Design System

**Theme:** Dark-first. Charcoal background (`#0F0F1A`), elevated card surfaces (`#1C1C2E`), thin borders (`#2A2A3E`).

**Typography:** Inter (all weights). Display text tight letter-spacing.

**Accent palette:**

| Use | Color |
|---|---|
| Primary accent | `#58CC02` (Duolingo green) |
| Watch tab | Purple→Blue→Green gradient |
| Stories / Pink | `#FF85C8` |
| Rituals / Teal | `#35C7A5` |
| Live indicator | `#1CB0F6` |

**Sport colors:**

| Sport | Color | Notes |
|---|---|---|
| Baseball | `#E53935` | MLB red |
| Basketball | `#FF4B4B` | |
| Hockey | `#1CB0F6` | |
| Soccer | `#35C7A5` | |
| Rugby | `#FF9600` | |
| Cricket | `#FFC800` | |
| Tennis | `#CE82FF` | |
| F1 / Racing | `#E53935` | |
| Golf | `#22C55E` | |
| Athletics | `#FF5722` | Deep orange — both Marathon and Diamond League |
| Horse Racing | `#C9882F` | Golden amber |
| Cycling | `#F5C518` | Tour de France yellow |

**Card style:** `borderRadius: 20`, `borderBottomWidth: 4` (3D depth buttons), sport-color accent bar on left edge.

**Tab bar:** iOS 26 native liquid glass tabs via `expo-router` NativeTabs + `expo-glass-effect`.

**Session-type event display:**
- Athletics (marathon / Diamond League): 🏃 + event name
- Horse Racing (Triple Crown): 🐎 + race name
- Cycling (Grand Tour): 🚴 + tour name
- F1: session type label
- SVNS: tournament name + flag emoji

---

## 12. Key Technical Constraints

- **No UUID package** — use `Date.now().toString() + Math.random().toString(36).substr(2, 9)` for IDs
- **No hardcoded domain URLs** — all API calls use `getApiUrl()` from `@/lib/query-client`
- **CricAPI free tier** — ~92 hits/day max; MAX_PAGES=10; early-stop when sufficient future matches found
- **IPL live scores** — sourced from official iplt20.com feed; `cricket-ipl-` prefix events use separate fetcher; 60s polling; no rate limits
- **Golf FINAL state** — only trusts ESPN "post" status if leader has completed all 18 holes
- **AsyncStorage** for all persistent user state (favorites, sport toggles, ritual overrides)
- **React Query** for all server state; default fetcher configured in `@/lib/query-client`
- **Static hardcoded schedules** — Horse Racing (Triple Crown), Cycling (Grand Tour), Diamond League, Golf Majors, Marathon Majors use hardcoded data; refreshed via `updateSchedule.ts` on server start and cron

---

## 13. Open Design Explorations (In Progress)

The Daily Wrap card has four experimental design variants in the mockup sandbox (`artifacts/mockup-sandbox/`):

| Variant | Hypothesis |
|---|---|
| **A — The Ticker** | Remove all prose; score rows only with sport-colored accent bars, like a departure board |
| **B — Sport Sections** | Group results by sport with collapsible sections; YOUR FAVORITES section floats to top |
| **C — Top Story** | One heroic headline with sport-color background wash; everything else as a chip strip |
| **D — Your Teams First** | Hard two-zone split: YOUR TEAMS always prominent; EVERYTHING ELSE collapsed by default |

---

## 14. Out of Scope (Current Version)

- User accounts / cloud sync (all state is local)
- Push notifications for game start reminders
- Social features (sharing, friend activity)
- Fantasy sports integration
- Video playback within the app
- Betting odds display
- Historical stats or standings
