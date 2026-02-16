# Master Sports Guide

## Overview
A mobile sports schedule app built with Expo (React Native). Users browse sports events organized by viewing modes (Weekend Nights / Weekend Mornings), view live events, and launch streaming provider apps to watch games.

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server (port 5000) serving landing page and API
- **Data**: API-first (`GET /api/events`) with auto-generated NHL schedule; fallback to local `data/masterGuide.json`
- **State**: AsyncStorage for user preferences (favorite toggles)
- **Context**: EventsProvider (React context + React Query) fetches events from API, merges with local JSON

## Project Structure
```
app/
  _layout.tsx              # Root layout with Stack + formSheet
  event-sheet.tsx           # Event detail bottom sheet (formSheet presentation)
  (tabs)/
    _layout.tsx             # Tab layout (Modes, Live Now, Settings)
    index.tsx               # Modes screen - mode selection
    live.tsx                # Live Now screen - live/up-next events with auto-refresh
    settings.tsx            # Settings screen - app info
  mode/
    [id].tsx                # Mode detail - packs with event lists
data/
  masterGuide.json          # Static event data, modes, packs, providers
  generatedEvents.json      # Auto-generated NHL/AHL/ECHL schedule from APIs
  leagueIds.json            # Cached ECHL league ID + season from API-Hockey
scripts/
  updateSchedule.ts         # Main schedule fetcher: NHL + AHL + ECHL + NCAA + Rugby + Cricket pipeline
  mergeAhlEvents.ts         # AHL event merge/retention logic
  updateEchlSchedule.ts     # ECHL fetcher via API-Hockey (api-sports.io) + merge logic
  updateBuHockey.ts         # NCAA BU Hockey fetcher from College Hockey News HTML scraping
  updateRugby.ts            # Rugby fetcher from iCal feeds (URC, Top 14, Super Rugby Pacific)
  updateCricket.ts          # Cricket fetcher from CricAPI (internationals + 7 domestic leagues)
server/
  routes.ts                 # Express API routes (GET /api/events, POST /api/refresh, GET /api/debug/sources)
lib/
  data.ts                   # Data access utilities and types
  events-context.tsx        # EventsProvider - React context for API-fetched events
  query-client.ts           # API client with React Query setup
utils/
  time.ts                   # Live event detection, time formatting, duration defaults
constants/
  colors.ts                 # Theme colors (dark navy + green accent)
```

## Key Features
- 3-tab navigation: Modes, Live Now, Settings
- Mode selection (Weekend Nights / Weekend Mornings)
- Sport packs per mode with filtered event lists
- Event cards showing sport, league, teams, time, provider
- Bottom sheet on event tap with "Open Provider App" button
- Provider app launching via Android intents (MAIN+LAUNCHER for most, VIEW+launchUrl for Disney+)
- Real-time live event detection based on startTimeLocal + sport-specific default durations
- Live Now tab with "Live Now" and "Up Next" sections, auto-refresh every 60s, manual refresh

## Sports Covered
- Hockey: NHL, AHL, ECHL, NCAA Hockey
- Rugby: Japan League One, Super Rugby, HSBC SVNS, URC, Top 14, English Premiership
- Cricket: IPL, BBL, Super Smash, SA20, The Hundred, MLC, CPL
- Soccer: MLS, NWSL, USL, EPL, Serie A, La Liga, Bundesliga, Ligue 1

## Streaming Providers
- YouTube TV, Disney+, FloSports, Victory+, Prime Video

## Design
- Dark theme: navy background (#0B1120) with green accent (#00E676)
- Sport-specific colors: Hockey (blue), Rugby (orange), Cricket (yellow), Soccer (green)
- Font: Inter (Google Fonts)
- Native liquid glass tabs on iOS 26+, classic blur tabs otherwise

## Recent Changes
- 2026-02-16: Cricket automation fully integrated: scripts/updateCricket.ts fetches fixtures from CricAPI (/v1/matches with offset pagination, max 6 pages); filters to internationals (ICC, World Cup, Tours) + 7 domestic leagues (IPL, BBL, Super Smash, SA20, The Hundred, MLC, CPL); SportEvent type extended with competitionName, competitionType, format, hostCountry, seriesName; stable IDs "cricket-{hash}"; source "cricket-cricapi"; merge with retention [now-14d, now+21d]; wired into refresh pipeline with cricketCount/cricketAdded/cricketUpdated/cricketPruned/cricketCounts; /api/debug/sources includes cricket count; /api/meta shows Cricket source with leagueCounts; Settings displays Cricket row; favorites: South Africa (International), MI Cape Town + Paarl Royals (SA20); aliases in favoriteAliases.json; requires CRICAPI_KEY secret
- 2026-02-16: SVNS upgraded from tournament-level events to day/session blocks: each SVNS stop generates per-day session events (Day 1 at 7:00 PM PT, Day 2+ at 10:00 AM PT, 3h duration); eventType="session" with sessionTitle="SVNS {City} – Day X"; UI event cards show sessionTitle for sessions instead of teams; merge prunes legacy tournament-level SVNS events; /api/debug/sources includes svnsSessions count; day count computed from start/end calendar dates
- 2026-02-16: League One timezone hardened: wallClockToUtc() helper uses Intl.DateTimeFormat for DST-safe IANA timezone conversion; League One times treated as Asia/Tokyo (JST, UTC+9); default kickoff 1:00 PM JST; /api/debug/rugby-time-sample returns rawLocalTime (JST), parsedUtcIso, formattedPT for one League One event
- 2026-02-16: Event sort order updated: Live first → Favorites next → then start time (mode detail + Live Now tab); Stormers alias "DHL Stormers" already configured
- 2026-02-16: Rugby automation expanded to 7 leagues: scripts/updateRugby.ts fetches URC, Top 14, Super Rugby Pacific, English Premiership via iCal feeds (rugbyfixture.io for URC/Top14/Premiership, fixturedownload.com for Super Rugby); Japan League One scraped from all.rugby HTML (Asia/Tokyo timezone via wallClockToUtc); HSBC SVNS uses hardcoded tournament schedule (9 stops Nov 2025–Jun 2026) with per-day session generation; per-league duration: 2h15m for 15s rugby, 3h for SVNS sessions; league keys: urc, top14, superrugby, premiership, leagueone, svns; providers: URC/Top14/Premiership/LeagueOne→flosports, SuperRugby/SVNS→primevideo; stable IDs "rugby-{leagueKey}-hash"; mergeRugbyEvents() with retention [now-14d, now+21d]; runs in parallel with hockey/NCAA fetchers; /api/refresh returns rugbyCount/rugbyAdded/rugbyUpdated/rugbyPruned/rugbySourceUsed/rugbyCounts; /api/debug/sources includes rugby count + svnsSessions; /api/meta shows Rugby source with leagueCounts breakdown; Settings displays Rugby row with per-league counts
- 2026-02-16: NCAA BU Hockey automation: scripts/updateBuHockey.ts scrapes College Hockey News (collegehockeynews.com/schedules/team/Boston-University/10) HTML tables to extract BU Men's Hockey schedule; parses month sections, game rows with date/opponent/home-away/time; converts ET times to UTC ISO strings; event IDs prefixed "ncaa-bu-" with stable hash, source "ncaa-bu", provider "disneyplus"; mergeBuEvents() with retention [now-14d, now+21d]; wired into refresh pipeline with buCount/buAdded/buUpdated/buPruned; /api/debug/sources includes ncaa count; /api/meta shows NCAA source with teamFilter "Boston University"; Settings displays NCAA row in Schedule Data
- 2026-02-16: AHL HockeyTech primary source: scripts/updateAhlSchedule.ts fetches AHL schedule from HockeyTech scorebar API (lscluster.hockeytech.com, key=ccb91f29d6744675, client_code=ahl) with Odds API as fallback; returns AhlFetchResult with sourceUsed ("hockeytech"|"odds"|"none") + counts; event IDs prefixed "ahl-" with source field "ahl-hockeytech" or "ahl-odds"; /api/debug/sources shows ahlHockeyTech/ahlOdds breakdown; /api/meta shows AHL sourceName; mergeAhlEvents() included in same module with retention [now-14d, now+21d]
- 2026-02-16: Fixed timezone bug: all event timestamps now stored as proper UTC ISO strings (with Z suffix); display formatter uses Intl.DateTimeFormat with America/Los_Angeles timezone; added /api/debug/echl-time-sample endpoint for time verification; source transparency in Settings shows per-league staleness indicators via /api/meta endpoint
- 2026-02-16: ECHL HockeyTech web fallback: fetchEchlEvents() tries API-Hockey first, falls back to HockeyTech scorebar JSON API (lscluster.hockeytech.com, key=2c2b89ea7345cae8) when free plan blocks current season; filters league-wide games to Tulsa Oilers only; returns EchlFetchResult with sourceUsed ("api-hockey"|"web"|"none") + webCount; event IDs prefixed "echl-web-" for web source; Settings shows ECHL source + Tulsa game count; /api/debug/sources includes echlSourceUsed + echlWebCount
- 2026-02-16: ECHL schedule automation via API-Hockey (api-sports.io): scripts/updateEchlSchedule.ts discovers ECHL league ID + current season, caches in data/leagueIds.json, fetches games per date with season param, merges with retention [now-14d, now+21d], early-exits on free plan limitation; wired into refresh pipeline with echlCount/echlAdded/echlUpdated/echlPruned; GET /api/debug/sources returns counts by source; Settings shows ECHL counts + cache stats
- 2026-02-16: Mode detail screens split events into "This weekend" and "Next weekend" subsections per pack; completed games show "FINAL" badge with dimmed card (opacity 0.65); sort: live > upcoming > completed; Nights time window extended to 16:00–02:00
- 2026-02-16: Added debug toggle in Settings ("Show All Games") to bypass weekend filter; stored in EventsContext, persisted via AsyncStorage
- 2026-02-16: AHL event caching: mergeAhlEvents.ts merges fresh API events with cached events instead of overwriting; retention window [now-14d, now+21d]; Settings shows +added/~updated/-pruned stats
- 2026-02-16: Added isEventCompleted() to utils/time.ts; exported isInWindow() from weekendWindows.ts for per-window filtering
- 2026-02-16: Built auto-generated NHL schedule feed: scripts/updateSchedule.ts fetches from NHL public API (api-web.nhle.com), generates 98 events for 14-day window, stores in data/generatedEvents.json
- 2026-02-16: Created GET /api/events endpoint (server/routes.ts) serving generated events with fallback to masterGuide.json
- 2026-02-16: Created EventsProvider (lib/events-context.tsx) using React Query to fetch events from API, merges API events with local JSON for non-API leagues
- 2026-02-16: Updated all screens (live.tsx, event-sheet.tsx, mode/[id].tsx) to use EventsProvider instead of direct local data imports
- 2026-02-16: Added diagnostic endpoints: GET /api/odds/sports (lists all Odds API sports), GET /api/odds/test?sportKey=<key> (tests a specific sport key with sample events)
- 2026-02-16: Updated schedule script to auto-detect AHL sport key from /v4/sports instead of hardcoding; logs detected key and event counts
- 2026-02-16: Enhanced /api/refresh response with nhlCount, ahlCount, ahlKeyUsed fields
- 2026-02-16: Settings UI now shows per-league counts (NHL: X | AHL: Y) after refresh, with warning if AHL returns 0
- 2026-02-15: Replaced ESPN with Disney+ provider; Disney+ uses VIEW intent with launchUrl
- 2026-02-15: Added FLAG_ACTIVITY_NEW_TASK for Victory+ to enable back navigation via app switcher
- 2026-02-15: Built real-time Live Now tab with computed live detection (isEventLive), Up Next section, auto-refresh (60s), manual refresh, and last-updated timestamp
- 2026-02-15: Created utils/time.ts with sport-specific default durations (hockey 2h45m, soccer/rugby 2h15m, cricket 8h)
- 2026-02-15: Added favorite team prioritization: "Favorites first" toggle on mode detail screens (default ON), "Favorites only" toggle on Live Now tab (default OFF), gold star badge on favorite team events, AsyncStorage persistence
- 2026-02-15: Initial MVP build with all core features
