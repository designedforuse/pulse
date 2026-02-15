# Master Sports Guide

## Overview
A mobile sports schedule app built with Expo (React Native). Users browse sports events organized by viewing modes (Weekend Nights / Weekend Mornings), view live events, and launch streaming provider apps to watch games.

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server (port 5000) serving landing page and API
- **Data**: Local JSON file at `data/masterGuide.json` (no database)
- **State**: Local data only, no async storage needed for MVP

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
  masterGuide.json          # All event data, modes, packs, providers
lib/
  data.ts                   # Data access utilities and types
  query-client.ts           # API client (unused in MVP, available for future)
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
- 2026-02-15: Replaced ESPN with Disney+ provider; Disney+ uses VIEW intent with launchUrl
- 2026-02-15: Added FLAG_ACTIVITY_NEW_TASK for Victory+ to enable back navigation via app switcher
- 2026-02-15: Built real-time Live Now tab with computed live detection (isEventLive), Up Next section, auto-refresh (60s), manual refresh, and last-updated timestamp
- 2026-02-15: Created utils/time.ts with sport-specific default durations (hockey 2h45m, soccer/rugby 2h15m, cricket 8h)
- 2026-02-15: Initial MVP build with all core features
