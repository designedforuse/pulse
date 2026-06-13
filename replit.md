# Pulse

## Overview
Pulse is a mobile sports schedule app built with Expo (React Native) and a lightweight Express/TypeScript backend. It gives users an organized view of sports events: browse by curated viewing modes (e.g. Weekend Nights), track live games, and launch the right streaming provider to watch. It spans many sports and leagues, with live scores, favorites, and editorial "story" cards.

## User Preferences
I prefer clear and concise information. When making changes, please prioritize core functionality and maintain a consistent dark theme. I prefer an iterative development approach, where features are built and integrated step-by-step. Ask for my input before making significant architectural changes or adding new external dependencies.

## System Architecture
- **Frontend:** Expo Router (file-based navigation). State shared via React Context; server state via React Query. User preferences persisted with AsyncStorage.
- **Backend:** Express server that serves a landing page and the core API (events, live scores, narrative cards, SVNS matches, refresh status, debug).
- **Data flow:** An API-first approach auto-generates schedules from many sports leagues. `EventsProvider` fetches and merges API-sourced events with local data; `data/masterGuide.json` is a static fallback.
- **Schedule generation:** Node scripts under `scripts/` fetch, merge, normalize, and prune each league's schedule into `data/generatedEvents.json`. Schedules are refreshed manually via a button in Settings (`POST /api/refresh`); the automatic twice-daily cron was removed to reduce idle compute.

### Key features
- **Navigation:** 3-tab interface (Watch, Rituals, Explore); Watch is default.
- **Watch tab (4-Game Chaos):** Multiview module prioritizing live events and anchor teams, with a dynamic Slot 4 promoted by real-time activity signals (goals, overtime, F1 race incidents, final laps).
- **Rituals:** Curated viewing modes show filtered sport packs; users can manually override the featured game on a ritual.
- **Explore (Stories):** Editorial narrative cards (Playoff Push, Player Movement, Upset Alert, etc.) driven by data thresholds, personalized to followed teams, with contextual YouTube videos. Includes the NHL "Hockey Family Tree" affiliates reference page.
- **Unified event card:** A single card component for all events, with sport-colored accents, team/session layouts, team logos, provider branding, and live scores. Session-type events (F1 races, rugby days, multi-day races) render as tournament/session names; multi-day events show "Day N of M".
- **Live scores:** Real-time updates for in-progress games with sport-specific displays (tennis, cricket, rugby clock, NHL playoff series status, MLB inning, etc.).
- **Favorites:** Users can favorite teams and disable whole sports, influencing prioritization and filtering.
- **Design:** Dark, Google-app-inspired theme — charcoal background, card surfaces, green accent, sport-specific colors, Inter font. iOS uses native liquid-glass tabs.

> Per-league details (id prefixes, retention windows, exact dates, internal helper names) live in the relevant `scripts/update*.ts`, `server/`, and `components/` files, and in `.agents/memory/`. Keep this README high-level.

## External Dependencies
**Core stack:** Expo (React Native), Express.js, React Query, AsyncStorage, Google Fonts (Inter).

**Schedule & score data sources:**
- **ESPN API (site.api.espn.com):** MLS, NBA, MLB, USL, FA Cup, ATP Tennis, F1, Champions/Europa/CAF Champions League, FIFA World Cup 2026, and International Friendlies.
- **NHL Public API (api-web.nhle.com):** NHL schedule, scores, and playoff series status.
- **HockeyTech (lscluster.hockeytech.com):** AHL and ECHL schedules (authoritative-feed pruning).
- **API-Hockey (api-sports.io):** Preferred ECHL source (falls back to HockeyTech).
- **Odds API (api.the-odds-api.com):** SHL (Swedish Hockey League).
- **College Hockey News (scraped):** NCAA BU Hockey.
- **World Rugby / Pulselive (api.wr-rims-prod.pulselive.com):** SVNS schedules + live scores and live clock for major club & international rugby comps.
- **MLR Official (majorleague.rugby):** MLR live scores (Pulselive lags for MLR).
- **rugbyfixture.io (iCal):** URC, Top 14, English Premiership, European Champions Cup, EPCR Challenge Cup.
- **fixturedownload.com (iCal):** Super Rugby Pacific, EPL.
- **all.rugby (scraped):** Japan League One.
- **CricAPI:** International & domestic cricket fixtures and live scores (free-tier endpoints).
- **IPL Official Feed (iplt20.com):** IPL live scores.
- **Hardcoded schedules:** WRC, MLR, Golf Majors, World Marathon Majors, Diamond League, Golden Trail World Series, Epic Series (cycling), SA Big Three (paddling), Comrades Marathon, SA Schools Rugby (Paarl Boys' High).

**Streaming providers:** Apple TV, YouTube / YouTube TV, Disney+, FloSports, Victory+, Prime Video, SuperSport Schools, plus network broadcasters (FOX, FS1) that route to the appropriate streaming app.
