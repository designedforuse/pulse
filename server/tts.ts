import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";

// "Brian" — a deep, confident American voice that suits sports-news narration.
const VOICE_ID = "nPczCjzI2devNBz1zQrb";
const MODEL_ID = "eleven_turbo_v2_5";
const OUTPUT_FORMAT = "mp3_44100_128";
const MAX_TEXT = 600;

// Cache outside the project dir: keeps the dev file-watcher from reloading on
// every generated clip, and works on read-only production filesystems.
const CACHE_DIR = path.join(os.tmpdir(), "pulse-tts-cache");

// De-dupe concurrent requests for the same clip so we only hit ElevenLabs once.
const inflight = new Map<string, Promise<string>>();

function cacheKey(text: string): string {
  return crypto
    .createHash("sha1")
    .update(`${VOICE_ID}:${MODEL_ID}:${OUTPUT_FORMAT}:${text}`)
    .digest("hex");
}

export function ttsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

/**
 * Synthesize a headline to speech via ElevenLabs and return the path to a cached
 * MP3. Each unique headline is generated only once, then served from disk.
 * Returns null if TTS is not configured or the text is empty.
 */
export async function synthesizeHeadline(rawText: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const text = rawText.trim().replace(/\s+/g, " ").slice(0, MAX_TEXT);
  if (!text) return null;

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${cacheKey(text)}.mp3`);

  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;

  const existing = inflight.get(file);
  if (existing) return existing;

  const task = (async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`ElevenLabs TTS ${res.status}: ${detail.slice(0, 200)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, file);
    return file;
  })().finally(() => inflight.delete(file));

  inflight.set(file, task);
  return task;
}
