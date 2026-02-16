import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";

const GENERATED_EVENTS_PATH = path.resolve(
  process.cwd(),
  "data",
  "generatedEvents.json"
);

function loadGeneratedEvents() {
  try {
    if (!fs.existsSync(GENERATED_EVENTS_PATH)) return null;
    const raw = fs.readFileSync(GENERATED_EVENTS_PATH, "utf-8");
    const data = JSON.parse(raw);
    return data;
  } catch {
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/events", (req, res) => {
    const generated = loadGeneratedEvents();

    if (!generated || !generated.events || generated.events.length === 0) {
      const fallbackPath = path.resolve(
        process.cwd(),
        "data",
        "masterGuide.json"
      );
      try {
        const fallback = JSON.parse(fs.readFileSync(fallbackPath, "utf-8"));
        return res.json({
          source: "fallback",
          lastUpdated: null,
          events: fallback.events || [],
        });
      } catch {
        return res.json({ source: "fallback", lastUpdated: null, events: [] });
      }
    }

    const daysParam = parseInt(req.query.days as string, 10) || 7;
    const now = new Date();
    const cutoff = new Date(now.getTime() + daysParam * 86400000);
    const startCutoff = new Date(now.getTime() - 12 * 3600000);

    const filtered = generated.events.filter((e: any) => {
      const start = new Date(e.startTimeLocal);
      return start >= startCutoff && start <= cutoff;
    });

    return res.json({
      source: "generated",
      lastUpdated: generated.lastUpdated,
      events: filtered,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
