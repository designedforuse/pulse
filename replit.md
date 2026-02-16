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
  generatedEvents.json      # Auto-generated NHL schedule from API
scripts/
  updateSchedule.ts         # NHL schedule fetcher (npx tsx scripts/updateSchedule.ts --days=14)
server/
  routes.ts                 # Express API routes (GET /api/events)
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
- Cricket: IPL, BBL, Super Smash, SA20, The Hundred, CPL
- Soccer: MLS, NWSL, USL, EPL, Serie A, La Liga, Bundesliga, Ligue 1

## Streaming Providers
- YouTube TV, Disney+, FloSports, Victory+, Prime Video

## Design
- Dark theme: navy background (#0B1120) with green accent (#00E676)
- Sport-specific colors: Hockey (blue), Rugby (orange), Cricket (yellow), Soccer (green)
- Font: Inter (Google Fonts)
- Native liquid glass tabs on iOS 26+, classic blur tabs otherwise

## Recent Changes
- 2026-02-16: Mode detail screens split events into "This weekend" and "Next weekend" subsections per pack; completed games show "FINAL" badge with dimmed card (opacity 0.65); sort: live > upcoming > completed; Nights time window extended to 16:00–02:00
- 2026-02-16: Added debug toggle in Settings ("Show All Games") to bypass weekend filter; stored in EventsContext, persisted via AsyncStorage
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
