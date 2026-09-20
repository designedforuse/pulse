---
name: Viewing plan product boundaries
description: Stories recommends, Watch holds saved intentions; Serie A is the first pilot.
---

Stories recommends matches across favorites; Watch is the permanent home for saved viewing intentions. Serie A is the pilot, not a separate team-season product.

**Why:** The user chose to validate planning with existing soccer coverage instead of coupling it to restoring NBA. Highlights is an intention, not a guarantee of available content.

**How to apply:** Expand the same planning system to other sports later. Keep missing fixtures and user choices rather than treating absence from a rolling feed as cancellation. Use source match identity, not kickoff-derived IDs, and preserve score association when changing identity.

Public Expo previews route to Metro in this environment, not directly to Express.

**Why:** Requests to the backend domain without its internal port returned Expo HTML; literal public port 5000 requests failed. Local-only browser verification missed the failure.

**How to apply:** Keep web API requests same-origin and Metro API forwarding intact. Verify a public preview returns JSON as well as checking local endpoints.

In native development, prefer the active Expo manifest host for API routing;
keep the configured API host for production builds and force HTTPS on Replit hosts.

**Why:** Expo Go reported connection failures while public web/API probes worked.
An embedded domain alone does not establish that a device is reaching the current
session. Runtime host discovery avoids that dependency; the exact failing device
URL was not captured, so a stale host remains a hypothesis, not a proven cause.

**How to apply:** Check the Android manifest host and public JSON/refresh responses.
Do not treat a working browser as proof of native connectivity.