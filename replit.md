# Master Sports Guide

## Overview
The Master Sports Guide is a mobile sports schedule application built with Expo (React Native). Its primary purpose is to provide users with an organized view of sports events, allowing them to browse by curated viewing modes (e.g., Weekend Nights), track live events, and easily launch corresponding streaming provider applications to watch games. The project aims to offer a comprehensive, user-friendly platform for sports enthusiasts to manage their viewing schedules across various sports and providers.

## User Preferences
I prefer clear and concise information. When making changes, please prioritize core functionality and maintain a consistent dark theme. I prefer an iterative development approach, where features are built and integrated step-by-step. Ask for my input before making significant architectural changes or adding new external dependencies.

## System Architecture
The application features a frontend built with Expo Router for file-based navigation in React Native. A lightweight Express.js backend serves both a landing page and the core API. Event data is primarily sourced via an API-first approach, which auto-generates schedules from various sports leagues. A local JSON file (`data/masterGuide.json`) serves as a fallback for static data. User preferences are persisted using AsyncStorage. State management for events is handled by an `EventsProvider` utilizing React Context and React Query to fetch and merge API-sourced events with local data.

**Key Features:**
- **Navigation:** A 3-tab interface (Watch, Rituals, Explore) with Watch as the default tab.
- **Watch Tab (4-Game Chaos Setup):** Displays a multiview module with a primary featured card and up to three secondary cards. It prioritizes live events and anchor teams, applying a context-aware ranking system based on 'Ritual Mode' or 'Free Mode' to select and sort events.
- **Ritual Featured Override:** Users can manually override the auto-selected featured game on any Ritual Detail page, with persistence via `RitualOverridesProvider`.
- **Event Presentation:** Users select viewing modes, displaying sport packs with filtered event lists. Event cards provide essential details and launch streaming applications.
- **Game State Normalization:** A `normalizeGameState` helper consistently categorizes events as FINAL, LIVE, or UPCOMING across the application.
- **Unified Event Card:** All event cards use a single `UnifiedEventCard` component with a consistent design, featuring sport-colored accents, header information, team matchups with logos and scores, and a footer with time and provider details.
- **Live Event Tracking:** Real-time detection of live and upcoming events with automatic and manual refresh options.
- **Favorites Management:** Users can toggle favorite teams in settings, which influences event prioritization and filtering.
- **Team Logos:** Team logos are displayed on event cards, with a fallback to initials if logos are unavailable.
- **UI/UX Design:** A Google-app-inspired dark theme with charcoal background, card surfaces, and green accent. Sport-specific colors provide visual differentiation. The Inter font is used throughout, and iOS utilizes native liquid glass tabs.
- **Event Data Processing:** Node.js scripts fetch, merge, and update schedules from various sports APIs to ensure data freshness.
- **Live Scores:** Real-time score updates for in-progress games, polled every 30 seconds and displayed inline on event cards and in detail sheets. Score display varies for different sports (e.g., rugby period data, cricket batting summaries). **Cricket Live Detail:** A dedicated live detail line appears between the matchup body and footer on all cricket cards (UnifiedEventCard + ChaosCard hero/secondary) when the match is LIVE. Formatted as compact innings summaries with team abbreviations (e.g., "SA 156/6 (20) • NZ 88/2 (11.1)"), chase context ("need 34", "RRR 7.3", "trail by 12"), or match state interruptions ("Innings break", "Rain delay"). The `formatCricketLiveDetail` function is exported from `UnifiedEventCard.tsx` for reuse. **CricAPI Caching:** Cricket scores from CricAPI are cached server-side for 300 seconds (5 min) to avoid rate limiting (free tier blocks after ~100 calls/day). Cache is returned on API failure/rate-limit. ESPN Cricket API was investigated as an alternative but requires per-series/tournament IDs with no "all live matches" endpoint, making it impractical as a primary source.
- **Explore Tab (Narrative System):** Displays dynamic, narrative-driven intelligence cards (e.g., Playoff Push, Player Movement, League Moment, Momentum, Deadline Watch, Rivalry Game) based on triggered data thresholds. Narratives are organized by region and priority. **Deadline Watch:** NHL-specific narrative that activates within 72 hours of the trade deadline (`NHL_TRADE_DEADLINE` config in `scripts/exploreNarratives.ts`). Triggers per-team cards based on trade-watch allowlist, expiring contract count, playoff bubble status, or recent trade activity. Suppressed if a confirmed Player Movement card exists for that team. Team metadata configured via `DEADLINE_TEAMS` array. Debug output included in `/api/debug/explore-narratives`. **Short-form Video:** Explore detail pages optionally display a video slot below the headline with thumbnail, play icon, and duration badge. YouTube links open externally; direct video URLs play inline via `expo-av`. Configured per narrative card via the optional `video` field (`NarrativeVideo` interface) on `ExploreNarrativeCard`. Cards without video render unchanged. **Rivalry Game:** Surfaces rivalry matchups from a configurable `RIVALRY_PAIRS` list (in `scripts/exploreNarratives.ts`) when a matching event falls within the next 24 hours. Supports NHL, soccer, rugby, and cricket rivalries. Max 1 per region, max 2 overall. Detail page shows "Why this matters" editorial, "Rivalry Matchup" info card, the triggering event, and "Go to Watch" CTA. Debug output includes `rawRivalryCandidates`, `rivalryAfterRegionFilter`, `rivalryFinalCount`. **Upset Alert:** Surfaces surprising results or live upset situations. Two trigger modes: (A) Completed Upset — seeded tennis favorite loses to lower/unseeded opponent, or configured team-sport favorite loses to underdog; (B) Live Upset Watch — favorite trailing late in a live event. Tennis uses seed/rank data from ESPN; team sports use `UPSET_TEAM_FAVORITES` config allowlist. Priority 95 (above most other cards). Max 1 per region, max 2 overall. Detail page shows "Why this matters", "Event Details" with seed info, triggering event, and CTA. Debug: `rawUpsetCandidates`, `upsetLiveCandidates`, `upsetCompletedCandidates`, `upsetFinalCount`.
- **API Endpoints:** The Express server provides endpoints for event data, live scores, narrative cards, and debug information, along with triggers for schedule and narrative regeneration.

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
- **fixturedownload.com (iCal feeds):** Super Rugby Pacific, EPL, MLS, and Champions League schedules.
- **ESPN API (site.api.espn.com):** USL, FA Cup, and ATP Tennis schedule data (real match data with player names, scores, rounds).
- **all.rugby:** Japan League One Rugby schedule data (scraped).
- **MLR (hardcoded):** Major League Rugby schedule data.
- **CricAPI:** International and domestic Cricket fixtures.
- **Apple TV:** Streaming provider integration.
- **YouTube TV:** Streaming provider integration.
- **Disney+:** Streaming provider integration.
- **FloSports:** Streaming provider integration.
- **Victory+:** Streaming provider integration.
- **Prime Video:** Streaming provider integration.
- **Google Fonts (Inter):** Font library.