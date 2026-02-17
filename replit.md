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
- **Favorites Management:** Users can toggle favorite teams, which prioritizes those events in display, and persist these preferences.
- **UI/UX Design:** A dark theme predominates, featuring a navy background (`#0B1120`) and a green accent (`#00E676`). Sport-specific colors (Hockey: blue, Rugby: orange, Cricket: yellow, Soccer: green) are used for visual differentiation. The Inter font from Google Fonts is used throughout. iOS devices utilize native liquid glass tabs (iOS 26+) or classic blur tabs otherwise.
- **Event Data Processing:** A robust set of Node.js scripts handle the fetching, merging, and updating of schedules from various sports APIs and sources, including NHL, AHL, ECHL, NCAA, Rugby (multiple leagues), and Cricket (multiple leagues). These scripts ensure data freshness and consistency.
- **API Endpoints:** The Express server exposes `/api/events` for event data, `/api/refresh` to trigger schedule updates, and `/api/debug/sources` for source-specific event counts.

## External Dependencies
- **Expo (React Native):** Frontend framework for mobile application development.
- **Express.js:** Backend server framework.
- **React Query:** Data fetching and caching library for React.
- **AsyncStorage:** Persistent key-value storage for React Native.
- **NHL Public API (api-web.nhle.com):** Source for NHL schedule data.
- **HockeyTech API (lscluster.hockeytech.com):** Primary and fallback source for AHL and ECHL schedule data.
- **API-Hockey (api-sports.io):** Source for ECHL schedule data.
- **College Hockey News (collegehockeynews.com):** Scraped for NCAA BU Hockey schedule data.
- **rugbyfixture.io (iCal feeds):** Source for URC, Top 14, and English Premiership Rugby schedules.
- **fixturedownload.com (iCal feeds):** Source for Super Rugby Pacific schedules.
- **all.rugby:** Scraped for Japan League One Rugby schedule data.
- **CricAPI:** Source for international and domestic Cricket fixtures.
- **YouTube TV:** Streaming provider integration.
- **Disney+:** Streaming provider integration.
- **FloSports:** Streaming provider integration.
- **Victory+:** Streaming provider integration.
- **Prime Video:** Streaming provider integration.
- **Google Fonts (Inter):** Font library.