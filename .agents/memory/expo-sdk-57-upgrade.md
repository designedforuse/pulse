---
name: Expo SDK upgrade notes (54→57→58)
description: Non-obvious constraints learned upgrading Pulse's Expo SDK (Expo Go only).
---

- Android Expo Go auto-updates to the newest SDK and then refuses older projects; a new SDK release can lock the user out overnight.
- npm upgrade gotcha (57→58): `expo install --fix` ERESOLVE'd on expo-router's optional peers (@expo/ui, expo-symbols) because the old lockfile pinned SDK-N copies. Fix that worked: write expected versions (from `expo install --check`) into package.json, delete node_modules + package-lock.json, fresh `npm install`.
- SDK 57+ app.json schema rejects top-level `splash`; it lives as options on the `expo-splash-screen` plugin entry.
- SDK 58: a route that exists both as a stack screen and a hidden tab resolves to the hidden tab, which bounces to the anchor; never duplicate a route inside (tabs) (Settings lived there).
- SDK 58: `initialRouteName` removed → `export const unstable_settings = { anchor }` in the layout; tabs also need `backBehavior="initialRoute"` or a warning fires. NativeTabs import is now `expo-router/native-tabs`. `web.output` default changed, so it's pinned to `"static"`.
- The old expo-asset HTTPS patch is upstream since SDK 55 (patches/ removed). expo-audio needs `expo-asset` installed directly. expo-av is gone (expo-video).
- Dev server signs into Expo via the create-launch guard in `expo:dev` (physical iOS Expo Go only).
- Card photo backgrounds: use RN Image sized 100%/100% (absolute), not expo-image absoluteFill — expo-image backgrounds rendered blank in Android Expo Go.
- Web screenshots right after a Metro restart are often blank (first bundle); retake before debugging.

**Why:** each cost a failed check or a debugging detour.
**How to apply:** on any future Expo SDK bump or app.json/navigation-layout change.
