# Master Sports Guide

## Overview
The Master Sports Guide is a mobile sports schedule application built with Expo (React Native). Its primary purpose is to provide users with an organized view of sports events, allowing them to browse by curated viewing modes (e.g., Weekend Nights), track live events, and easily launch corresponding streaming provider applications to watch games. The project aims to offer a comprehensive, user-friendly platform for sports enthusiasts to manage their viewing schedules across various sports and providers.

## User Preferences
I prefer clear and concise information. When making changes, please prioritize core functionality and maintain a consistent dark theme. I prefer an iterative development approach, where features are built and integrated step-by-step. Ask for my input before making significant architectural changes or adding new external dependencies.

## System Architecture
The application features a frontend built with Expo Router for file-based navigation in React Native. A lightweight Express.js backend serves both a landing page and the core API. Event data is primarily sourced via an API-first approach (`GET /api/events`), which auto-generates schedules from various sports leagues. A local JSON file (`data/masterGuide.json`) serves as a fallback and contains static data for modes, packs, and providers. User preferences, such as favorite toggles, are persisted using AsyncStorage. State management for events is handled by an `EventsProvider` utilizing React Context and React Query to fetch and merge API-sourced events with local data.

**Key Features:**
- **Navigation:** A 3-tab interface (Watch, Rituals, Explore) with Watch as the default tab. Settings is accessible via a gear icon in the Watch header (stack route). The old Live Now tab is preserved but hidden from navigation.
- **Watch Tab (4-Game Chaos Setup):** The primary tab answers "What should I be watching?" with a multiview module showing 1 primary featured card + up to 3 secondary cards. **Anchor teams** (Anaheim Ducks NHL, San Diego Gulls AHL) are always included if live or starting within 90 min. Selection algorithm: 1) Build candidate pool (live + starting within 90 min), 2) Insert anchor team events first (live beats starting soon, earlier start wins ties), 3) Add favorites and sport-diverse picks to fill remaining slots, 4) Backfill from upcoming today/tomorrow events if fewer than 4 candidates. No empty state — if no live/soon games, shows "Next Up" with next upcoming favorite (or next event). Setup is stable per session — regenerates only on manual "Rebuild Chaos" button, pull-to-refresh, or when all selected events end. A priority alert banner triggers for anchor teams going live or higher-priority games. Debug logging behind `__DEV__` flag. Module logic lives in `lib/chaos-setup.ts`.
- **Event Presentation:** Users can select viewing modes (e.g., Weekend Nights), which display sport packs with filtered event lists. Event cards provide essential details like sport, league, teams, time, and streaming provider.
- **Provider Integration:** Tapping an event opens a bottom sheet with an "Open Provider App" button, which launches the relevant streaming application via Android intents.
- **Game State Normalization:** A single `normalizeGameState(event, score, now)` helper (`utils/gameState.ts`) produces mutually exclusive states: FINAL (completed — shows "FINAL" badge, no LIVE pill/clock), LIVE (in-progress — shows LIVE pill + clock, no "FINAL"), or UPCOMING (shows start time). Priority: score status "final"/"ft"/"ended" → FINAL; score status "live"/"in progress" or clock/period data → LIVE; time-based live check → LIVE; past event end → FINAL; otherwise → UPCOMING. Used consistently across all card types (ChaosCard, LiveEventRow, mode EventCard, guide GuideEventCard, event-sheet).
- **Live Event Tracking:** Real-time detection of live and upcoming events integrated into the Watch tab, with automatic refreshing every 60 seconds and manual refresh options. Event completion is indicated by a "FINAL" badge and dimmed cards.
- **Favorites Management:** Users can toggle individual favorite teams on/off in Settings. Favorites are defined in `masterGuide.json` and managed via `FavoritesProvider` (React Context + AsyncStorage). Disabled teams are stored as a set in AsyncStorage (`favorites.disabled`). The active favorites object is computed by filtering out disabled teams and consumed by Live Now and Mode screens to prioritize/filter events.
- **Team Logos:** Small team logos (20px) displayed next to team names on event cards in mode views, live views, and the event detail sheet (28px). Logo URLs are resolved via `utils/teamLogos.ts` using public CDNs: ESPN (NHL, soccer/MLS, rugby, cricket country flags, NCAA), HockeyTech CDN (AHL — `assets.leaguestat.com/ahl/logos/{id}.png`), league-one.jp S3 (Japan League One). The `TeamLogo` component (`components/TeamLogo.tsx`) shows a team-initials fallback badge (rounded, 2-letter gray badge) when no logo URL exists or loading fails — no more blank spacers. ECHL teams use initials fallback (no public CDN available). Missing logos are logged once per team via `console.warn` in `__DEV__` mode.
- **UI/UX Design:** A Google-app-inspired dark theme with charcoal background (`#1C1C1E`), card surfaces (`#2C2C2E`), and green accent (`#00E676`). Event cards use a compact horizontal layout: teams stacked vertically on the left, a vertical divider, and date/time on the right. The event detail sheet displays "League · Date, Time" header with teams side-by-side and "at" separator. Sport-specific colors (Hockey: blue, Rugby: orange, Cricket: yellow, Soccer: green) provide visual differentiation. The Inter font from Google Fonts is used throughout. iOS devices utilize native liquid glass tabs (iOS 26+) or classic blur tabs otherwise.
- **Event Data Processing:** A robust set of Node.js scripts handle the fetching, merging, and updating of schedules from various sports APIs and sources, including NHL, AHL, ECHL, NCAA, Rugby (multiple leagues), Cricket (multiple leagues), and Soccer (EPL, MLS, Serie A, La Liga, Bundesliga, Ligue 1, NWSL, USL, Champions League, FA Cup). These scripts ensure data freshness and consistency.
- **Live Scores:** Real-time score updates for in-progress games. The backend `/api/scores` endpoint aggregates scores from NHL API (free), HockeyTech (AHL/ECHL), ESPN (soccer, URC league ID 270557, Super Rugby ID 242041, Top 14 ID 270559, NCAA Hockey), league-one.jp web scraping (Japan League One), and CricAPI (ICC T20 World Cup cricket). Score window extends 18 hours from game start so final scores remain visible all day. The frontend `ScoresProvider` (React Context + React Query) polls every 30 seconds and displays scores inline on event cards (next to team names) and in the event detail sheet (large format below team names with period/clock info). Scores appear in green accent color for live games. Rugby scores show period data (1st Half / 2nd Half / HT / FT). Cricket scores use a special display format — batting summaries (runs/wickets/overs) shown in the time section rather than numeric scores next to team names. Rugby team name matching uses fuzzy normalization to handle differences between our data and source naming. Japan League One scores are scraped from league-one.jp schedule page with Japanese-to-English team name mapping and bidirectional matching.
- **API Endpoints:** The Express server exposes `/api/events` for event data, `/api/scores` for live scores, `/api/refresh` to trigger schedule updates, and `/api/debug/sources` for source-specific event counts.

## External Dependencies
- **Expo (React Native):** Frontend framework for mobile application development.
- **Express.js:** Backend server framework.
- **React Query:** Data fetching and caching library for React.
- **AsyncStorage:** Persistent key-value storage for React Native.
- **NHL Public API (api-web.nhle.com):** Source for NHL schedule data.
- **HockeyTech API (lscluster.hockeytech.com):** Primary and fallback source for AHL and ECHL schedule data.
- **API-Hockey (api-sports.io):** Source for ECHL schedule data.
- **College Hockey News (collegehockeynews.com):** Scraped for NCAA BU Hockey schedule data.
- **rugbyfixture.io (iCal feeds):** Source for URC, Top 14, English Premiership, European Champions Cup Rugby schedules.
- **fixturedownload.com (iCal feeds):** Source for Super Rugby Pacific, EPL, MLS, and Champions League schedules.
- **ESPN API (site.api.espn.com):** Source for USL and FA Cup schedule data.
- **all.rugby:** Scraped for Japan League One Rugby schedule data.
- **MLR (hardcoded):** 2026 Major League Rugby schedule (6 teams, 15 regular season matches). Disney+ provider.
- **CricAPI:** Source for international and domestic Cricket fixtures.
- **Apple TV:** Streaming provider integration (MLS games).
- **YouTube TV:** Streaming provider integration.
- **Disney+:** Streaming provider integration.
- **FloSports:** Streaming provider integration.
- **Victory+:** Streaming provider integration.
- **Prime Video:** Streaming provider integration.
- **Google Fonts (Inter):** Font library.