import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";

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

  app.get("/api/odds/sports", async (_req, res) => {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ODDS_API_KEY not configured" });
    }
    try {
      const url = `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`;
      console.log("[odds/sports] Fetching sports list...");
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Odds API returned ${response.status}: ${response.statusText}`,
        });
      }
      const data: any[] = await response.json() as any[];
      const trimmed = data.map((s: any) => ({
        key: s.key,
        group: s.group,
        title: s.title,
        description: s.description,
        active: s.active,
      }));
      return res.json({ count: trimmed.length, sports: trimmed });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/odds/test", async (req, res) => {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ODDS_API_KEY not configured" });
    }
    const sportKey = req.query.sportKey as string;
    if (!sportKey) {
      return res.status(400).json({ error: "sportKey query param required" });
    }
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${apiKey}`;
      console.log(`[odds/test] Fetching events for sportKey=${sportKey}...`);
      const response = await fetch(url);
      if (!response.ok) {
        return res.json({
          sportKey,
          status: response.status,
          statusText: response.statusText,
          eventCount: 0,
          sample: [],
        });
      }
      const events: any[] = await response.json() as any[];
      const sample = events.slice(0, 2).map((e: any) => ({
        id: e.id,
        commence_time: e.commence_time,
        home_team: e.home_team,
        away_team: e.away_team,
      }));
      return res.json({
        sportKey,
        status: 200,
        eventCount: events.length,
        sample,
      });
    } catch (err: any) {
      return res.status(500).json({ sportKey, error: err.message });
    }
  });

  app.post("/api/refresh", (req, res) => {
    const daysParam = parseInt(req.query.days as string, 10) || 14;
    const scriptPath = path.resolve(process.cwd(), "scripts", "updateSchedule.ts");

    console.log(`[refresh] Running updateSchedule.ts --days=${daysParam}...`);

    execFile(
      "npx",
      ["tsx", scriptPath, `--days=${daysParam}`],
      {
        cwd: process.cwd(),
        timeout: 60000,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (stdout) console.log("[refresh] stdout:", stdout);
        if (stderr) console.error("[refresh] stderr:", stderr);

        if (error) {
          console.error("[refresh] Script failed:", error.message);
          return res.status(500).json({
            success: false,
            error: error.message,
          });
        }

        const generated = loadGeneratedEvents();
        return res.json({
          success: true,
          lastUpdated: generated?.lastUpdated || null,
          eventCount: generated?.events?.length || 0,
          nhlCount: generated?.nhlCount ?? 0,
          ahlCount: generated?.ahlCount ?? 0,
          ahlKeyUsed: generated?.ahlKeyUsed ?? null,
          ahlAdded: generated?.ahlAdded ?? 0,
          ahlUpdated: generated?.ahlUpdated ?? 0,
          ahlPruned: generated?.ahlPruned ?? 0,
        });
      }
    );
  });

  const httpServer = createServer(app);
  return httpServer;
}
