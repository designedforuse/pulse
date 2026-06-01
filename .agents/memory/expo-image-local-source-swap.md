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
