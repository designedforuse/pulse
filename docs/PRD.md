# Sports Watch — Product Requirements Document

**Version:** 1.1
**Last Updated:** March 10, 2026

---

## 1. Product Overview

### Mission
Sports Watch is a mobile-first sports schedule and live tracking application that gives fans an organized, personalized command center for following their favorite teams and leagues across multiple sports. The app eliminates the friction of jumping between apps, websites, and TV guides by consolidating schedules, live scores, streaming provider links, and narrative context into a single experience.

### Target User
Sports enthusiasts who follow multiple sports and leagues across different time zones and streaming platforms. The typical user watches hockey, rugby, cricket, soccer, tennis, golf, and/or F1 racing, and wants to know what's on, what's live, and where to watch — without checking five different apps.

### Value Proposition
- **One place for all sports:** Consolidated schedules across 7 sports and 28+ leagues.
- **Smart prioritization:** Chaos Mode surfaces the most exciting live games automatically.
- **Streaming shortcuts:** One-tap launch into YouTube TV, Disney+, Apple TV, ESPN+, and more.
- **Narrative intelligence:** Contextual story cards explain *why* a game matters (rivalries, playoff pushes, trade deadlines).
- **Ritual-based viewing:** Personalized weekly viewing windows aligned to the user's real-life schedule.

---

## 2. User Experience

### Navigation Structure
The app uses a bottom tab bar with 3 primary tabs, plus 2 hidden tabs accessible via header icons.

| Tab | Label | Icon | Purpose |
|-----|-------|------|---------|
| 1 | Watch | `play.rectangle` | Default tab. Live games, Chaos Mode multiview, Up Next schedule. |
| 2 | Rituals | `square.grid.2x2` | Weekly viewing windows with curated game lineups. |
| 3 | Stories | `compass` | Narrative intelligence cards, Tonight's Story, YouTube highlights. |
| Hidden | Live | — | Full list of all live and upcoming events (accessed via header). |
| Hidden | Settings | Gear icon | Sports/team favorites, schedule refresh, app configuration. |

### Screen Inventory

| Screen | Route | Description |
|--------|-------|-------------|
| Watch | `/(tabs)/watch` | Hero card + Chaos Mode grid + Up Next event list with sport/league filter chips. |
| Rituals | `/(tabs)/rituals` | List of 6 recurring viewing windows with next occurrence time and featured game preview. |
| Stories | `/(tabs)/index` | Tonight's Story hero module + scrollable narrative card feed. |
| Live Now | `/(tabs)/live` | Comprehensive list of all live and upcoming events, filterable by favorites. |
| Settings | `/(tabs)/settings` | 5 sections: Using the App, Sports, Favorites, Schedules & Stories, About. |
| Ritual Detail | `/guide/[id]` | All games within a specific ritual's time window. Users can pin a "featured" game. |
| Mode Detail | `/mode/[id]` | Filtered event list for broader viewing categories (Weekend Nights, Mornings). |
| Story Detail | `/narrative/[id]` | Expanded narrative card with YouTube video, "Why This Matters" analysis, related games. |
| Event Sheet | `/event-sheet` | Bottom-sheet modal with streaming provider launch button and live score detail. |

### Key Navigation Flows

**Discovery → Watch:**
Stories tab → tap narrative card → Story Detail → tap event → Event Sheet → launch streaming app.

**Habitual Viewing:**
Rituals tab → select ritual (e.g., "Saturday Warm-Up") → Ritual Detail → browse games → pin featured game → tap to open Event Sheet.

**Live Tracking:**
Watch tab → view Chaos Mode hero card → tap secondary card → Event Sheet → view live score + launch stream.

**Personalization:**
Settings (gear icon) → toggle sports on/off → expand sport → toggle individual leagues → toggle individual team favorites.

---

## 3. Core Features

### 3.1 Watch Tab & Chaos Mode

**Chaos Mode** is a dynamic "smart multiview" that automatically curates and displays the 4 most exciting or relevant live sporting events.

**Slot Selection Rules:**
1. **Slot 1 (Hero):** The highest-scored live game, displayed prominently with full detail.
2. **Slots 2-4 (Secondary):** Next 3 highest-scored games in a supporting grid.
3. **Anchor Priority:** Games involving anchor teams (Anaheim Ducks, San Diego Gulls) are prioritized first.
4. **Favorite Boost:** If no anchor or favorite is in the top 4, a favorite team's game is force-inserted.
5. **Sport Diversity:** The system avoids filling all 4 slots with the same sport.
6. **Backfilling:** When fewer than 4 live games exist, upcoming games (starting soon) fill remaining slots.

**Scoring Dimensions:**

| Dimension | Rank | Criteria |
|-----------|------|----------|
| Emotion | 3 | Favorite team playing |
| Emotion | 2 | Favorite league playing |
| Emotion | 1 | Focus sport (Rugby, Cricket, Hockey, Soccer, Racing) |
| Emotion | 0 | Standard event |
| Tension | 5 | Overtime/Shootout + close score |
| Tension | 4 | Extremely close game in late stages |
| Tension | 3 | One-score game (1 goal, 7 pts rugby) |
| Tension | 2 | Two-score game or F1 Sprint/Qualifying |
| Tension | 1 | In-progress with larger gap |

**Sport-Specific Chaos Scores:**
- **Hockey:** 0-100+ score based on period (Shootout=80, OT=70), closeness, time pressure, situation boosts (goalie pulled=+30, power play=+15, recent goal=+18).
- **F1 Racing:** Session type scoring (Race=+80, Sprint=+40, Qualifying=+15) plus live event bonuses (Red Flag=+25, Safety Car=+15, final laps=+20).

**Sport Priority Values (tie-breaking):**
| Sport | Priority |
|-------|----------|
| Rugby | 4 |
| Cricket | 3 |
| Hockey | 2 |
| Racing | 2 |
| Soccer | 1 |
| Other | 0 |

**Loading State:**
- On initial app launch, a skeleton loader mimics the Chaos Mode card layout (animated shimmer bars for title, primary card with team rows, and 3 secondary card placeholders) while event data is fetched from the API.
- Chaos Mode initialization uses a fingerprint-based approach (event count + first 5 event IDs) to detect when fresh API data replaces the local fallback dataset, triggering an automatic rebuild without requiring a manual refresh.

**Up Next Section:**
- Shows all upcoming events starting within the next 24 hours.
- Filterable by sport and league chips.
- Grouped by day with expandable "More games" overflow.
- Favorites-only toggle to narrow to followed teams.

### 3.2 Rituals

Six predefined weekly viewing windows, each associated with specific sports, days, and time ranges (Pacific Time):

| Ritual | Day | Time (PT) | Sports | Context |
|--------|-----|-----------|--------|---------|
| Family Game Night | Friday | 6:00–9:00 PM | Hockey, Basketball, Soccer | w/ kids |
| Friday Night Mode | Friday | 9:00 PM–12:00 AM | Rugby, Cricket | w/ friends |
| Saturday Warm-Up | Saturday | 6:00 AM–12:00 PM | Rugby, Cricket, Soccer, Racing | w/ friends |
| Saturday Game Day | Saturday | 4:00–8:00 PM | Hockey, Basketball, Soccer | w/ family |
| Saturday Extra Time | Saturday | 8:00 PM–12:00 AM | All sports | w/ friends |
| Sunday Coffee & Chill | Sunday | 6:00 AM–12:00 PM | Rugby, Cricket, Soccer, Racing | alone |

**Ritual Features:**
- Each ritual shows the next occurrence date/time and a count of matching events.
- Users can pin a "featured" game to each ritual for quick access.
- Session-type events (F1, SVNS) display as clean tournament/session names with flag emojis.
- Active ritual is highlighted when the current time falls within its window.

### 3.3 Viewing Modes

Three broader viewing categories defined in `masterGuide.json`:

| Mode | Time Window | Sport Packs |
|------|-------------|-------------|
| Weekend Night Bonding | 4:00 PM – 2:00 AM | Hockey Night, F1 Weekend, Soccer Night |
| Weekend Night Rituals | 4:00 PM – 2:00 AM | Rugby Night, Cricket Night |
| Weekend Game Days | Sat/Sun 4:00 AM – 2:00 PM | Hockey Morning, Rugby Morning, Cricket Morning, F1 Weekend, Soccer Morning |

### 3.4 Stories / Explore Tab

The Stories tab surfaces narrative-driven intelligence cards and a personalized "Tonight's Story" hero module.

**Tonight's Story:**
A single hero card at the top of the Stories feed, selected from the highest-priority signal:
- **Multi-Team Night** (score: 200+): 2+ followed teams playing tonight.
- **Single Team Game** (score: 150): One followed team has a game tonight.
- **Ritual Night** (score: 130): A ritual window overlaps with followed-team games.
- **Narrative Cards** (variable): Highest-scoring narrative signal (upset, clinch, rivalry, etc.).

**Card Navigation:**
- "Track all games" on multi-team/single-team stories navigates to the Watch tab.
- Tapping a narrative card opens the Story Detail screen with YouTube highlights and analysis.

### 3.5 Settings

**Section Order:**
1. **Using the App** — "How it Works" documentation.
2. **Sports** — Sport-level toggles (Hockey, Rugby, Cricket, Soccer, Tennis, Racing, Golf).
3. **Favorites** — Per-sport expandable sections with league-level and team/tournament-level toggles.
4. **Schedules & Stories** — Manual "Refresh Schedules" and "Rebuild Stories" buttons with last-run timestamps.
5. **About** — App version and credits.

---

## 4. Sports & Leagues

### Complete League Table

| Sport | League | Data Source | Source Type |
|-------|--------|------------|-------------|
| **Hockey** | NHL | NHL API (`api-web.nhle.com`) | REST API |
| | AHL | HockeyTech Scorebar / Odds API | API (fallback chain) |
| | ECHL | API-Hockey / HockeyTech | API (fallback chain) |
| | NCAA Hockey (BU) | College Hockey News | Web scraping |
| | Olympic Hockey 2026 | Hardcoded schedule | Static |
| **Rugby** | URC | rugbyfixture.io | iCal feed |
| | Top 14 | rugbyfixture.io | iCal feed |
| | English Premiership | rugbyfixture.io | iCal feed |
| | Super Rugby Pacific | fixturedownload.com | iCal feed |
| | Six Nations | rugbyfixture.io | iCal feed |
| | European Champions Cup | rugbyfixture.io | iCal feed |
| | Japan League One | league-one.jp / all.rugby | Web scraping |
| | MLR | Hardcoded schedule | Static |
| | HSBC SVNS | Hardcoded + World Rugby API | Static + REST API |
| **Cricket** | International (T20I, ODI, Test) | CricAPI | REST API |
| | ICC T20 World Cup | Hardcoded schedule | Static (deduped vs CricAPI) |
| | Domestic (IPL, BBL, etc.) | CricAPI | REST API |
| **Soccer** | EPL | fixturedownload.com | iCal feed |
| | MLS | fixturedownload.com | iCal feed |
| | Serie A | ESPN API | REST API |
| | La Liga | ESPN API | REST API |
| | Bundesliga | ESPN API | REST API |
| | Ligue 1 | ESPN API | REST API |
| | Champions League | fixturedownload.com | iCal feed |
| | FA Cup | ESPN API | REST API |
| | NWSL | fixturedownload.com | iCal feed |
| | USL | ESPN API | REST API |
| **Tennis** | Grand Slams (4) | ESPN ATP API / Hardcoded fallback | API + Static |
| | ATP Masters 1000 (9) | ESPN ATP API / Hardcoded fallback | API + Static |
| **Racing** | Formula 1 | ESPN F1 API | REST API |
| **Golf** | The Majors (5) | Hardcoded schedule | Static |

### Golf Majors (2026)

| Tournament | Location | Dates | Provider |
|------------|----------|-------|----------|
| Players Championship | Sawgrass, FL | Mar 10–15 | CBS (YouTube TV) |
| The Masters | Augusta, GA | Apr 9–12 | CBS (YouTube TV) |
| PGA Championship | Aronimink, PA | May 11–17 | CBS (YouTube TV) |
| US Open | Shinnecock Hills, NY | Jun 18–21 | CBS (YouTube TV) |
| British Open | Royal Birkdale, England | Jul 12–19 | NBC (YouTube TV) |

---

## 5. Streaming Providers

| Provider ID | Display Name | Launch Method | Android Package |
|-------------|-------------|---------------|-----------------|
| `youtubetv` | YouTube TV | Intent (SplashActivity) | `com.google.android.apps.youtube.unplugged` |
| `disneyplus` | Disney+ | URL deep link | `com.disney.disneyplus` |
| `appletv` | Apple TV | URL deep link | `com.apple.atve.androidtv.appletv` |
| `primevideo` | Prime Video | Intent (LauncherActivity) | `com.amazon.avod.thirdpartyclient` |
| `flosports` | FloSports | Intent (SplashActivity) | `tv.flosports` |
| `victoryplus` | Victory+ | Intent (MainActivity) | `tv.apmc.android.victorysports` |
| `tennischannel` | Tennis Channel | URL deep link | `com.sinclairmedia.tennischannel` |
| `espnplus` | ESPN+ | URL deep link | `com.espn.score_center` |
| `cbsgolazo` | CBS Sports Golazo | URL deep link | `com.cbs.sports` |

**Launch Mechanism:**
1. The Event Sheet modal presents the provider name and a "Watch on [Provider]" button.
2. On Android, the app uses `expo-intent-launcher` to start the provider's main activity.
3. If intent launch fails, falls back to `expo-linking` with the provider's web URL.
4. Provider assignment is determined per-event by the schedule scripts based on broadcast rights (e.g., Ducks → Victory+, Kings → Prime Video, EPL → YouTube TV).

---

## 6. Personalization

### Favorites System

**Hierarchy:** Sport → League → Team/Tournament

- **Sport Toggle:** Enables or disables an entire sport across the app (Watch, Rituals, Stories).
- **League Toggle:** Enables or disables a specific league within a sport (e.g., turn off AHL but keep NHL).
- **Team/Tournament Toggle:** Marks individual teams or tournaments as followed, influencing:
  - Event prioritization in the Watch tab and Chaos Mode.
  - "Tonight's Story" selection (followed teams trigger personal stories).
  - Narrative card relevance scoring (+80 points for followed-team cards).
  - Favorites-only filter in the Up Next and Live Now sections.

**Persistence:** All favorite settings are stored in `AsyncStorage` under keys:
- `favorites.disabledSports` — Set of disabled sport names.
- `favorites.disabledLeagues` — Set of `"sport::league"` keys.
- `favorites.disabled` — Map of disabled (unfollowed) team/tournament names by sport and league.

### Anchor Teams
Hardcoded priority teams that are always boosted in Chaos Mode selection:
- Anaheim Ducks (NHL)
- San Diego Gulls (AHL)

### Affiliate Teams
Related teams are linked for cross-league tracking (e.g., following the Anaheim Ducks also surfaces San Diego Gulls games in Tonight's Story).

---

## 7. Data Architecture

### Event Pipeline

```
Schedule Scripts (scripts/update*.ts)
    ↓ fetch from APIs, iCal feeds, web scraping, hardcoded data
    ↓ merge with existing cached events (add/update/prune)
    ↓
data/generatedEvents.json (952+ events)
    ↓ served by Express.js
    ↓
GET /api/events
    ↓ consumed by Expo app via React Query
    ↓
EventsProvider (React Context)
    ↓ merged with masterGuide.json static data
    ↓
Watch / Rituals / Stories UI
```

### Event Schema

```typescript
interface AppEvent {
  id: string;               // Stable ID (e.g., "nhl_2025020828", "golf-masters-2026-04-09")
  sport: string;            // "hockey", "rugby", "cricket", "soccer", "tennis", "racing", "golf"
  league: string;           // "NHL", "URC", "The Majors", etc.
  awayTeam: string;         // Team name or "TBD" for sessions
  homeTeam: string;         // Team name or tournament name for sessions
  startTimeLocal: string;   // ISO 8601 UTC timestamp
  endTimeLocal?: string;    // ISO 8601 UTC timestamp
  providerId: string;       // Streaming provider key
  isLive: boolean;          // Current live status
  source: string;           // Data source identifier
  leagueKey?: string;       // Internal league key for filtering
  providerReason?: string;  // Why this provider was assigned
  eventType?: string;       // "match", "session", "race"
  sessionTitle?: string;    // Display title for session events (e.g., "Masters — Round 1")
  tournamentName?: string;  // Tournament identifier for favorites matching
}
```

### Refresh Schedule
- **Automatic:** `node-cron` runs at 6:00 AM and 6:00 PM daily, refreshing all 28+ league data sources.
- **Manual:** "Refresh Schedules" button in Settings triggers `POST /api/refresh`.
- **Retention Window:** Events are kept from 14 days in the past to 21–60 days in the future (varies by sport).
- **Merge Strategy:** Fresh data is merged with existing cached data — new events are added, existing events are updated, events outside the retention window are pruned.
- **Stable IDs:** Every script generates deterministic IDs to prevent duplicates across refresh cycles.
- **Cricket Deduplication:** CricAPI occasionally returns the same match across paginated responses. Matches are deduplicated by CricAPI match ID before classification, and a secondary team+time deduplication pass runs during the merge step to catch any remaining duplicates.

### Narrative Generation
- **Manual:** "Rebuild Stories" button in Settings triggers `POST /api/rebuild-explore`.
- **Pipeline:** Analyzes events, standings, boxscores, and player movements to generate narrative cards.
- **YouTube Integration:** Each selected card receives a contextual YouTube video via search with trusted channel prioritization.
- **Output:** Written to `data/generatedNarratives.json` and served via `GET /api/narratives`.

---

## 8. Narrative Intelligence

### Card Types

| Card Kind | Priority | Trigger Condition | Display |
|-----------|----------|-------------------|---------|
| `upset_alert` | 98 | Heavy favorite trailing late in a game or upset final score. | Favorite/underdog, score, game clock. |
| `rivalry_game` | 96 | Upcoming game between predefined rival pairs (30-day window). | Rivalry name (e.g., "El Clásico"), teams, start time. |
| `deadline_watch` | 92+ | Within 72 hours of NHL trade deadline for tracked teams. Dynamic boosts for playoff contenders, expiring contracts, and recent player movement. | Team, hours until deadline, players to watch. |
| `clinch_watch` | 92 | Team close to clinching playoffs or playing in knockout round. | Team, clinch scenario, tournament round. |
| `playoff_push` | 90 | High game density (5 games in 7 days or 4 in 5) or a win that keeps the team alive. | Team, game count, window, back-to-back status. |
| `player_movement` | 85 | Player detected on a new team's boxscore vs. previous history. | Number of moves, player names, from/to teams. |
| `league_moment` | 65–85 | Major tournament or race weekend within 48 hours. Race sessions score highest (85), qualifying (75), practice (65). | Event name, session list, session count. |
| `momentum` | 80 | Favorite team on a 3+ game winning streak or 4-of-5 recent wins. | Team, streak length, recent record. |

### Defined Rivalries (35 pairs)

**Hockey:** Freeway Faceoff (ANA-LAK), Original Six (BOS-MTL), Battle of New York (NYR-NYI), Original Six (CHI-DET), Keystone State (PIT-PHI).

**Soccer:** North London Derby (TOT-ARS), London Derby (TOT-CHE, ARS-CHE), Northwest Derby (LIV-MUN), Merseyside Derby (LIV-EVE), Manchester Derby (MCI-MUN), El Clásico (RMA-BAR), Madrid Derby (RMA-ATM), Derby della Madonnina (INT-MIL), Derby della Capitale (ROM-LAZ), Der Klassiker (BVB-BAY), Le Classique (PSG-MAR), El Tráfico (LAG-LAFC).

**Rugby:** Jukskei Derby (Stormers-Bulls), Freedom Cup (RSA-NZL), Mandela Challenge Plate (RSA-AUS), Bledisloe Cup (NZL-AUS), SA Super Rugby (Sharks-Stormers).

**Cricket:** Greatest Rivalry (IND-PAK), The Ashes (AUS-ENG), Border-Gavaskar (IND-AUS), SA vs AUS.

**Racing:** Constructors' Battle (Ferrari-McLaren), Silver vs Bull (Red Bull-Mercedes), Championship Rivals (Red Bull-Ferrari), Legacy Rivalry (Ferrari-Mercedes), Woking vs Brackley (McLaren-Mercedes), Papaya vs Bull (Red Bull-McLaren).

---

## 9. Live Scores

Real-time score updates for in-progress games, fetched via `GET /api/scores` and displayed on event cards and the Event Sheet modal.

### Sport-Specific Displays

| Sport | Score Format | Additional Detail |
|-------|-------------|-------------------|
| Hockey | Away 3 – Home 2 | Period indicator (1st, 2nd, 3rd, OT, SO), power play, empty net, goalie pulled status. |
| Soccer | Home 1 – Away 0 | Half indicator (1H, 2H, ET, PK), minute clock. |
| Rugby | Home 24 – Away 17 | Half indicator, minute clock. |
| Tennis | Sets scoreboard (e.g., 6-4, 3-6, 7-5) | Current set score, serving indicator. |
| Cricket | Runs/Wickets (e.g., 245/6) | Overs, run rate, innings indicator. |
| F1 Racing | Position and gap to leader | Current lap, session type, flag status (Green/Yellow/Red/SC). |

### Game State Normalization
All events are consistently categorized into one of three states:
- **FINAL:** Game completed.
- **LIVE:** Game currently in progress.
- **UPCOMING:** Game has not started yet.

---

## 10. Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | Expo (React Native) | Cross-platform mobile app (Android + iOS + Web). |
| Navigation | Expo Router | File-based routing with tab and stack navigators. |
| Backend Server | Express.js + TypeScript | REST API, schedule refresh, narrative generation. |
| Data Fetching | React Query (`@tanstack/react-query`) | Server state management with caching and background refetch. |
| Local Storage | AsyncStorage | Persistent user preferences (favorites, disabled sports). |
| State Management | React Context | Shared state for events, favorites, scores, SVNS matches. |
| Scheduling | node-cron | Automated twice-daily schedule refresh (6 AM / 6 PM). |
| Font | Inter (Google Fonts) | `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`. |
| Streaming Launch | expo-intent-launcher + expo-linking | Android app deep linking for streaming providers. |

### Project Structure

```
app/                    # Expo Router screens and layouts
  (tabs)/               # Bottom tab screens (watch, rituals, index, live, settings)
  guide/[id].tsx        # Ritual detail
  mode/[id].tsx         # Mode detail
  narrative/[id].tsx    # Story detail
  event-sheet.tsx       # Provider launch modal
components/             # Shared React Native components
constants/              # Colors, theme constants
data/                   # Generated JSON data files
  masterGuide.json      # Static config (modes, packs, favorites)
  generatedEvents.json  # Auto-generated event schedule
  generatedNarratives.json  # Auto-generated narrative cards
lib/                    # Core logic and contexts
  chaos-setup.ts        # Chaos Mode 4-game selection
  chaos-score.ts        # Hockey chaos scoring
  rituals.ts            # Ritual definitions and window logic
  data.ts               # Sport colors, icons, provider resolution
  favorites-context.tsx # Favorites state management
  events-context.tsx    # Events state management
scripts/                # Backend schedule scripts
  updateSchedule.ts     # Master orchestrator
  update*.ts            # Per-league fetchers (30+ files)
  exploreNarratives.ts  # Narrative card generation
server/                 # Express.js server
  routes.ts             # API endpoint definitions
  index.ts              # Server entry point
utils/                  # Utility functions
  favorites.ts          # Favorite matching logic
  time.ts               # Time window calculations
  teamLogos.ts          # Team logo URL resolution
```

---

## 11. Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#1C1C1E` | App background |
| Card Surface | `#2C2C2E` | Card and section backgrounds |
| Accent | `#00E676` | Primary action color, highlights |
| Text Primary | `#F5F5F5` | Main text |
| Text Secondary | `#A1A1A6` | Muted/supporting text |
| Favorite Star | Gold/Yellow | Favorite indicators |

### Sport Colors

| Sport | Color | Hex |
|-------|-------|-----|
| Hockey | Light Blue | `#64B5F6` |
| Rugby | Orange | `#FF8A65` |
| Cricket | Amber | `#FFD54F` |
| Soccer | Green | `#81C784` |
| Tennis | Purple | `#CE93D8` |
| Racing | Red | `#E53935` |
| Golf | Green | `#4CAF50` |

### Typography
- **Font Family:** Inter (loaded via `@expo-google-fonts/inter`).
- **Weights:** Regular (400), Medium (500), SemiBold (600), Bold (700).
- **Body:** 14–16pt.
- **Headers:** 20–28pt.
- **Display:** 48–64pt max.

### Branding
- **App Name:** Sports Watch
- **App Icon:** Bold, geometric, italic green "S" (`#00E676`) on black background (ESPN-style single-letter branding).
- **Splash Screen:** Pure black background (`#000000`) with centered green "S" icon.
- **Android Adaptive Icon:** Green "S" foreground on black background, with white monochrome variant.

### Platform Adaptations
- **iOS:** Native liquid glass tab bar via `expo-router` NativeTabs (when available).
- **Android:** Standard dark tab bar with blur effect fallback.
- **Web:** Additional insets (67px top, 34px bottom) for status bar clearance.

---

## 12. API Endpoints

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/events` | Returns events from `generatedEvents.json` within a time window (14 days past to `?days=` future, default 7). Falls back to `masterGuide.json` if no generated data exists. |
| `GET` | `/api/scores` | Returns real-time scores for live games across all sports. |
| `GET` | `/api/narratives` | Returns generated narrative cards and Tonight's Story. |
| `GET` | `/api/meta` | Returns schedule metadata (last refresh time, source counts). |
| `GET` | `/api/refresh-status` | Returns the current refresh status (idle, running, last run time). |
| `POST` | `/api/refresh` | Triggers a full schedule refresh across all data sources. |
| `POST` | `/api/rebuild-explore` | Regenerates narrative cards and Tonight's Story. |

### Sport-Specific Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/svns-matches/:city` | Returns SVNS live match data for a specific tournament city (60s server cache, 45s client poll). |
| `GET` | `/api/players/:id/journey` | Returns a player's team history for the Player Movement narrative. |

### Debug Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/debug/sources` | Event counts by source (NHL, AHL, ECHL, Rugby, Soccer, Tennis, F1, Golf, etc.). |
| `GET` | `/api/debug/live-event` | Live event detail for a specific event ID. |
| `GET` | `/api/debug/explore-narratives` | Full narrative generation debug output. |
| `GET` | `/api/debug/player-movement` | Player movement cache and detection details. |
| `GET` | `/api/debug/weekend-windows` | Current viewing mode window calculations. |
| `GET` | `/api/debug/guide-windows` | Ritual window calculations and matched events. |
| `GET` | `/api/debug/favorites` | Current favorites configuration and matching preview. |
| `GET` | `/api/debug/echl-check` | ECHL data source health check. |
| `GET` | `/api/debug/cricket-sample` | Sample cricket event data. |
| `GET` | `/api/debug/ritual-filter` | Ritual filtering debug with sport/league breakdown. |
| `GET` | `/api/odds/sports` | Available sports from the Odds API. |

---

## Appendix: External API Dependencies

| Service | Base URL | Used For | Auth |
|---------|----------|----------|------|
| NHL API | `api-web.nhle.com/v1` | NHL schedules, scores | Public (no key) |
| HockeyTech | `lscluster.hockeytech.com` | AHL/ECHL schedules | Public |
| API-Hockey | `v1.hockey.api-sports.io` | ECHL schedules | `API_HOCKEY_KEY` |
| CricAPI | `api.cricapi.com` | Cricket fixtures | `CRICAPI_KEY` |
| ESPN API | `site.api.espn.com` | Soccer, Tennis, F1 schedules and scores | Public (no key) |
| World Rugby API | `api.wr-rims-prod.pulselive.com` | SVNS live match data | Public (no key) |
| Odds API | `api.the-odds-api.com` | AHL fallback data | `ODDS_API_KEY` |
| RapidAPI | Various | Supplementary data | `RAPIDAPI_KEY` |
| rugbyfixture.io | `data.rugbyfixture.io` | Rugby iCal feeds | Public (no key) |
| fixturedownload.com | `fixturedownload.com` | Soccer/Rugby iCal feeds | Public (no key) |
| College Hockey News | `collegehockeynews.com` | NCAA BU schedule | Public (scraped) |
| league-one.jp | `league-one.jp` | Japan League One schedule | Public (scraped) |
