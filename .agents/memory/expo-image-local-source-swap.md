---
name: expo-image local source swap
description: expo-image won't reliably re-render a changed local require() source on a still-mounted instance; key it by content.
---

# expo-image local require() source doesn't swap on re-render

When an `<Image>` from `expo-image` stays mounted and its `source` prop changes
from one local `require("...")` asset to another (common with
`cachePolicy="memory-disk"`), it may keep showing the previously loaded image
instead of swapping to the new one. Text/sibling elements re-render fine, so the
symptom looks like "only the image is stale."

**Why:** This bit the Rituals tab — all ritual cards live inside one horizontal
paging `ScrollView`, so every card's background `ExpoImage` stays mounted. When a
user overrode the featured game to a different sport, the featured strip updated
but the background image kept the old sport's photo.

**How to apply:** Force a remount by giving the `ExpoImage` a `key` derived from
the content that selects the source (e.g. `key={featuredSport ?? "default"}`).
Reach for this whenever a local-asset image is expected to change while its
component instance is kept alive (carousels, lists, paged ScrollViews).

## Bundled background renderer choice

Prefer React Native's `Image` for bundled card backgrounds; retain content keys
for sport-dependent carousel backgrounds.

**Why:** Android Expo Go screenshots showed blank bundled backgrounds on both
Stories and Rituals while remote logos loaded. Switching away from the cached
Expo renderer is a compatibility mitigation, not a confirmed native root cause:
web rendering was verified, but Android verification is still outstanding.

**How to apply:** If this symptom returns, investigate native asset delivery and
image layout before assuming the earlier source-swap issue explains it.

Bundled React Native backgrounds need explicit container-relative width and
height, not only absolute edge constraints.

**Why:** React Native supplies intrinsic dimensions for local assets. Absolute
edges alone can leave the image oversized and clipped, even with cover resizing.
The subsequent Android screenshot showed loaded images but an enlarged crop.

**How to apply:** Size the image view to the card before applying cover scaling;
verify native sizing separately from the browser.
