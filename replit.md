# Master Sports Guide

## Overview
The Master Sports Guide is a mobile sports schedule application built with Expo (React Native). Its primary purpose is to provide users with an organized view of sports events, allowing them to browse by curated viewing modes (e.g., Weekend Nights), track live events, and easily launch corresponding streaming provider applications to watch games. The project aims to offer a comprehensive, user-friendly platform for sports enthusiasts to manage their viewing schedules across various sports and providers.

## User Preferences
I prefer clear and concise information. When making changes, please prioritize core functionality and maintain a consistent dark theme. I prefer an iterative development approach, where features are built and integrated step-by-step. Ask for my input before making significant architectural changes or adding new external dependencies.

## System Architecture
The application features a frontend built with Expo Router for file-based navigation in React Native. A lightweight Express.js backend serves both a landing page and the core API. Event data is primarily sourced via an API-first approach (`GET /api/events`), which auto-generates schedules from various sports leagues. A local JSON file (`data/masterGuide.json`) serves as a fallback and contains static data for modes, packs, and providers. User preferences, such as favorite toggles, are persisted using AsyncStorage. State management for events is handled by an `EventsProvider` utilizing React Context and React Query to fetch and merge API-sourced events with local data.

**Key Features:**
- **Navigation:** A 3-tab interface (Modes, Live Now, Settings) facilitates core navigation.
- **Event Presentation:** Users can select viewing modes (e.g., Weekend Nights), which display sport packs with filtered event lists. Event cards provide essential details like sport, league, teams, time, and streaming provider.
- **Provider Integration:** Tapping an event opens a bottom sheet with an "Open Provider App" button, which launches the relevant streaming application via Android intents.
- **Live Event Tracking:** The "Live Now" tab features real-time detection of live and upcoming events, with automatic refreshing every 60 seconds and manual refresh options. Event completion is indicated by a "FINAL" badge and dimmed cards.
- **Favorites Management:** Users can toggle individual favorite teams on/off in Settings. Favorites are defined in `masterGuide.json` and managed via `FavoritesProvider` (React Context + AsyncStorage). Disabled teams are stored as a set in AsyncStorage (`favorites.disabled`). The active favorites object is computed by filtering out disabled teams and consumed by Live Now and Mode screens to prioritize/filter events.
- **Team Logos:** Small team logos (20px) displayed next to team names on event cards in mode views, live views, and the event detail sheet (28px). Logo URLs are resolved via `utils/teamLogos.ts` using public CDNs: ESPN (NHL, soccer, rugby, cricket country flags, NCAA), league-one.jp S3 (Japan League One). The `TeamLogo` component (`components/TeamLogo.tsx`) gracefully falls back to a blank spacer if no logo URL exists or if loading fails. AHL and ECHL logos are not currently available.
- **UI/UX Design:** A Google-app-inspired dark theme with charcoal background (`#1C1C1E`), card surfaces (`#2C2C2E`), and green accent (`#00E676`). Event cards use a compact horizontal layout: teams stacked vertically on the left, a vertical divider, and date/time on the right. The event detail sheet displays "League · Date, Time" header with teams side-by-side and "at" separator. Sport-specific colors (Hockey: blue, Rugby: orange, Cricket: yellow, Soccer: green) provide visual differentiation. The Inter font from Google Fonts is used throughout. iOS devices utilize native liquid glass tabs (iOS 26+) or classic blur tabs otherwise.
- **Event Data Processing:** A robust set of Node.js scripts handle the fetching, merging, and updating of schedules from various sports APIs and sources, including NHL, AHL, ECHL, NCAA, Rugby (multiple leagues), Cricket (multiple leagues), and Soccer (EPL, MLS, Serie A, La Liga, Bundesliga, Ligue 1, NWSL, USL, Champions League, FA Cup). These scripts ensure data freshness and consistency.
- **Live Scores:** Real-time score updates for in-progress games. The backend `/api/scores` endpoint aggregates scores from NHL API (free), HockeyTech (AHL/ECHL), ESPN (soccer, URC league ID 270557, Super Rugby ID 242041, NCAA Hockey), and league-one.jp web scraping (Japan League One). Score window extends 18 hours from game start so final scores remain visible all day. The frontend `ScoresProvider` (React Context + React Query) polls every 30 seconds and displays scores inline on event cards (next to team names) and in the event detail sheet (large format below team names with period/clock info). Scores appear in green accent color for live games. Rugby team name matching uses fuzzy normalization to handle differences between our data and source naming. Japan League One scores are scraped from league-one.jp schedule page with Japanese-to-English team name mapping and bidirectional matching.
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