# Pulse

## Overview
Pulse is a mobile sports schedule application built with Expo (React Native). Its primary purpose is to provide users with an organized view of sports events, allowing them to browse by curated viewing modes (e.g., Weekend Nights), track live events, and easily launch corresponding streaming provider applications to watch games. The project aims to offer a comprehensive, user-friendly platform for sports enthusiasts to manage their viewing schedules across various sports and providers.

## User Preferences
I prefer clear and concise information. When making changes, please prioritize core functionality and maintain a consistent dark theme. I prefer an iterative development approach, where features are built and integrated step-by-step. Ask for my input before making significant architectural changes or adding new external dependencies.

## System Architecture
The application features a frontend built with Expo Router for file-based navigation in React Native. A lightweight Express.js backend serves both a landing page and the core API. Event data is primarily sourced via an API-first approach, which auto-generates schedules from various sports leagues. A local JSON file (`data/masterGuide.json`) serves as a fallback for static data. User preferences are persisted using AsyncStorage. State management for events is handled by an `EventsProvider` utilizing React Context and React Query to fetch and merge API-sourced events with local data.

**Key Architectural Decisions & Features:**
- **Navigation:** A 3-tab interface (Watch, Rituals, Explore) with Watch as the default tab.
- **Watch Tab (4-Game Chaos Setup):** Displays a multiview module prioritizing live events and anchor teams with dynamic promotion for Slot 4 based on real-time activity signals (e.g., goals, overtime, Safety Car, Red Flag, final laps). F1 Race and Sprint sessions are Chaos Mode eligible with session-based scoring (Race +80, Sprint +40, Qualifying +15); Practice sessions remain in Live Now only.
- **Ritual Featured Override:** Users can manually override the featured game on Ritual Detail pages.
- **Ritual Session Display:** Session-type events (F1 races, SVNS rugby days) display as clean tournament/session names with flag emojis instead of the team matchup format.
- **Event Presentation:** Users select viewing modes, displaying sport packs with filtered event lists. Event cards launch streaming applications.
- **Game State Normalization:** A helper consistently categorizes events as FINAL, LIVE, or UPCOMING.
- **Unified Event Card:** All event cards use a single component for consistent design, featuring sport-colored accents, team matchups, and provider details.
- **Live Event Tracking:** Real-time detection of live and upcoming events with automatic and manual refresh.
- **Favorites Management:** Users can toggle favorite teams and disable entire sports, influencing event prioritization and filtering.
- **Team Logos:** Team logos are displayed on event cards, with fallbacks.
- **UI/UX Design:** A Google-app-inspired dark theme with charcoal background, card surfaces, green accents, sport-specific colors, and the Inter font. iOS utilizes native liquid glass tabs.
- **Event Data Processing:** Node.js scripts fetch, merge, and update schedules from various sports APIs.
- **F1 Racing Integration:** Formula 1 events are fetched from ESPN, with specific card layouts and live score features.
- **Athletics (Marathon) Integration:** World Marathon Majors events display with 🏃 emoji + marathon name card layout in deep orange (#FF5722), sourced from a hardcoded schedule in `scripts/updateMarathon.ts`. Retention window: 14 days past, 120 days future.
- **Live Scores:** Real-time score updates for in-progress games, with sport-specific displays (e.g., tennis scoreboard, cricket live detail).
- **Explore Tab (Tonight's Story):** A hero module surfacing high-priority narrative signals as editorial summaries, personalized based on followed teams and ritual context.
- **Explore Tab (YouTube Videos):** Narrative cards automatically receive contextual YouTube videos via search with caching and trusted channel prioritization.
- **Explore Tab (Narrative System):** Displays dynamic, narrative-driven intelligence cards (e.g., Playoff Push, Player Movement, League Moment, Momentum, Deadline Watch, Rivalry Game, Upset Alert, Clinch Watch) based on triggered data thresholds and configured logic.
- **SVNS Live Match Tracking:** SVNS session cards display the current/next match from the World Rugby API (`api.wr-rims-prod.pulselive.com`), showing team abbreviations, scores, phase, and gender label. Data is fetched via `/api/svns-matches?city=X` with 60s server-side caching and 45s client polling. Event IDs for all 9 SVNS stops are mapped in `server/svnsMatches.ts`.
- **Automatic Schedule Refresh:** The server uses `node-cron` to automatically refresh all schedule data twice daily (6:00 AM and 6:00 PM). A manual refresh button is available in the Settings tab. Status available via `/api/refresh-status`.
- **API Endpoints:** The Express server provides endpoints for event data, live scores, narrative cards, SVNS match schedules, and debug information.

## External Dependencies
- **Expo (React Native):** Frontend framework.
- **Express.js:** Backend server.
- **React Query:** Data fetching and caching.
- **AsyncStorage:** Persistent storage.
- **NHL Public API (api-web.nhle.com):** NHL schedule data.
- **HockeyTech API (lscluster.hockeytech.com):** AHL and ECHL schedule data.
- **API-Hockey (api-sports.io):** ECHL schedule data.
- **College Hockey News (collegehockeynews.com):** NCAA BU Hockey schedule data (scraped).
- **rugbyfixture.io (iCal feeds):** URC, Top 14, English Premiership, European Champions Cup Rugby schedules.
- **fixturedownload.com (iCal feeds):** Super Rugby Pacific, EPL, and MLS schedules.
- **ESPN API (site.api.espn.com):** Champions League (uefa.champions) and Europa League (uefa.europa) schedule data.
- **ESPN API (site.api.espn.com):** NBA basketball schedule and live score data.
- **ESPN API (site.api.espn.com):** USL, FA Cup, ATP Tennis, and F1 Racing schedule data.
- **all.rugby:** Japan League One Rugby schedule data (scraped).
- **MLR (hardcoded):** Major League Rugby schedule data.
- **Golf Majors (hardcoded):** Players Championship, The Masters, PGA Championship, US Open, British Open schedule data.
- **World Marathon Majors (hardcoded):** Tokyo, Boston, London, Sydney, Berlin, Chicago, and New York City marathons as athletics/session events on FloSports.
- **CricAPI:** International and domestic Cricket fixtures and live scores. Uses `/v1/cricScore` (free tier, no credits needed) for live match detection, and `/v1/matches` (paginated, MAX_PAGES=20, ~40 hits/day out of 100 limit) for schedule. API pagination is non-chronological so 20 pages (500 matches) is required to reliably find featured matches. Each cricket event stores `cricketMatchId` (CricAPI UUID) for reliable ID-based score matching. The `currentMatches` endpoint was replaced because it requires credits (account has 0 credits).
- **World Rugby API (api.wr-rims-prod.pulselive.com):** SVNS match schedules and live scores.
- **Apple TV:** Streaming provider integration.
- **YouTube TV:** Streaming provider integration.
- **Disney+:** Streaming provider integration.
- **FloSports:** Streaming provider integration.
- **Victory+:** Streaming provider integration.
- **Prime Video:** Streaming provider integration.
- **Google Fonts (Inter):** Font library.