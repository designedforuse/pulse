---
name: Daily Wrap headline voiceover (ElevenLabs TTS)
description: Non-obvious constraints for the server-side TTS endpoint and its cache.
---

# Daily Wrap headline voiceover

Backend synthesizes story headlines via ElevenLabs and streams MP3 from `GET /api/daily-wrap/audio?text=...`; frontend plays them in the Daily Wrap story viewer.

- **Cache must live OUTSIDE the project dir.** Write MP3s to `os.tmpdir()`, not `.cache/` in cwd.
  **Why:** the backend runs under `tsx watch`; writing files inside cwd triggers a dev-server reload, which made the *second* (cached) request 404 mid-restart. tmpdir also survives read-only prod filesystems.
  **How to apply:** any server-side file cache in this repo should use `os.tmpdir()`, never `process.cwd()`.

- **Secrets are NOT visible to the code_execution sandbox.** `process.env.ELEVENLABS_API_KEY` reads empty there. To test anything that needs a secret, run `node`/`tsx` via the bash tool (the workflow env has the secret), not the JS sandbox.

- **ElevenLabs key needs the Text-to-Speech permission**, not just a default key — a key without it returns HTTP 401 `invalid_api_key` on TTS even though it looks valid.

- **Stop audio on blur, not just unmount.** The story screen can push routes (replay / highlights) while staying mounted; use `useFocusEffect` cleanup (plus index-change + unmount cleanup) so narration never bleeds into other screens.

- **Serve audio with `res.sendFile`, never a raw `fs.createReadStream().pipe(res)`.**
  **Why:** iOS/AVFoundation (expo-av) issues an HTTP Range request and *hangs* (spinner forever, no sound) if the server doesn't answer with `Accept-Ranges` + `206 Partial Content`. A piped stream is chunked with no Content-Length/range support. `sendFile` adds all of that automatically. Regular JSON fetches use `expo/fetch` and aren't affected, so the bug only shows up on native audio.

- **Open abuse surface (known, not yet addressed):** the audio endpoint is unauthenticated and hits a paid API — no rate limiting / cache TTL. Revisit if cost or tmpdir growth becomes a concern.
