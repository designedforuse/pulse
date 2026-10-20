---
name: Expo SDK 57 upgrade notes
description: Non-obvious constraints learned moving Pulse from SDK 54 to 57 (Expo Go only).
---

- SDK 57 app.json schema rejects top-level `splash`; splash config lives as options on the `expo-splash-screen` plugin entry.
- The old expo-asset HTTPS dev-server patch is upstream since SDK 55; the patches/ dir was removed. Don't re-add it.
- expo-audio requires `expo-asset` installed directly (expo-doctor peer check).
- expo-av is gone; narrative video uses expo-video. Never re-add expo-av.
- Dev server signs into Expo via create-launch guard in `expo:dev` (needed for physical iOS Expo Go 57 only).
- Web screenshots right after a Metro restart are often blank (first bundle); retake before debugging.

**Why:** each cost a failed check or a debugging detour during the upgrade.
**How to apply:** on future Expo upgrades or when touching app.json/media playback.
