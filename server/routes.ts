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
          ahlSourceUsed: generated?.ahlSourceUsed ?? "unknown",
          ahlAdded: generated?.ahlAdded ?? 0,
          ahlUpdated: generated?.ahlUpdated ?? 0,
          ahlPruned: generated?.ahlPruned ?? 0,
          echlCount: generated?.echlCount ?? 0,
          echlAdded: generated?.echlAdded ?? 0,
          echlUpdated: generated?.echlUpdated ?? 0,
          echlPruned: generated?.echlPruned ?? 0,
          echlSourceUsed: generated?.echlSourceUsed ?? "unknown",
          echlWebCount: generated?.echlWebCount ?? 0,
          buCount: generated?.buCount ?? 0,
          buAdded: generated?.buAdded ?? 0,
          buUpdated: generated?.buUpdated ?? 0,
          buPruned: generated?.buPruned ?? 0,
          buSourceUsed: generated?.buSourceUsed ?? "unknown",
          rugbyCount: generated?.rugbyCount ?? 0,
          rugbyAdded: generated?.rugbyAdded ?? 0,
          rugbyUpdated: generated?.rugbyUpdated ?? 0,
          rugbyPruned: generated?.rugbyPruned ?? 0,
          rugbySourceUsed: generated?.rugbySourceUsed ?? "unknown",
          rugbyCounts: generated?.rugbyCounts ?? {},
          cricketCount: generated?.cricketCount ?? 0,
          cricketAdded: generated?.cricketAdded ?? 0,
          cricketUpdated: generated?.cricketUpdated ?? 0,
          cricketPruned: generated?.cricketPruned ?? 0,
          cricketSourceUsed: generated?.cricketSourceUsed ?? "unknown",
          cricketCounts: generated?.cricketCounts ?? {},
        });
      }
    );
  });

  app.get("/api/meta", (_req, res) => {
    const generated = loadGeneratedEvents();
    if (!generated || !generated.generatedMeta) {
      return res.json({ error: "No metadata available. Run a refresh first." });
    }
    return res.json(generated.generatedMeta);
  });

  app.get("/api/debug/echl-check", async (_req, res) => {
    const apiKey = process.env.API_HOCKEY_KEY;
    if (!apiKey) {
      return res.json({ error: "API_HOCKEY_KEY not configured", conclusion: "Cannot test — no API key." });
    }

    const API_HOCKEY_BASE = "https://v1.hockey.api-sports.io";
    const LEAGUE_CACHE_PATH = path.resolve(process.cwd(), "data", "leagueIds.json");
    const today = new Date().toISOString().split("T")[0];

    let cachedLeagueId: number | null = null;
    try {
      const raw = fs.readFileSync(LEAGUE_CACHE_PATH, "utf-8");
      const cache = JSON.parse(raw);
      cachedLeagueId = cache.echlLeagueId || null;
    } catch {}

    let leagueId = cachedLeagueId || 59;

    const seasonsToTry = [2024, 2025, 2026];
    const seasonResults: any[] = [];

    for (const season of seasonsToTry) {
      try {
        const url = `${API_HOCKEY_BASE}/games?league=${leagueId}&season=${season}&date=${today}`;
        const r = await fetch(url, { headers: { "x-apisports-key": apiKey } });
        const data: any = await r.json();
        const errors = data.errors && Object.keys(data.errors).length > 0 ? data.errors : null;
        const games = data.response || [];
        const entry: any = {
          season,
          date: today,
          status: errors ? "error" : "ok",
          errorDetail: errors || undefined,
          gameCount: games.length,
        };
        if (games.length > 0) {
          const g = games[0];
          entry.sampleGame = {
            id: g.id,
            date: g.date,
            time: g.time,
            home: g.teams?.home?.name,
            away: g.teams?.away?.name,
            statusShort: g.status?.short,
          };
        }
        seasonResults.push(entry);
      } catch (err: any) {
        seasonResults.push({ season, date: today, status: "fetch_error", errorDetail: err.message, gameCount: 0 });
      }
    }

    let noSeasonResult: any = null;
    try {
      const url = `${API_HOCKEY_BASE}/games?league=${leagueId}&date=${today}`;
      const r = await fetch(url, { headers: { "x-apisports-key": apiKey } });
      const data: any = await r.json();
      const errors = data.errors && Object.keys(data.errors).length > 0 ? data.errors : null;
      const games = data.response || [];
      noSeasonResult = {
        date: today,
        status: errors ? "error" : "ok",
        errorDetail: errors || undefined,
        gameCount: games.length,
      };
      if (games.length > 0) {
        const g = games[0];
        noSeasonResult.sampleGame = {
          id: g.id, date: g.date, time: g.time,
          home: g.teams?.home?.name, away: g.teams?.away?.name,
          statusShort: g.status?.short,
        };
      }
    } catch (err: any) {
      noSeasonResult = { date: today, status: "fetch_error", errorDetail: err.message, gameCount: 0 };
    }

    const working = seasonResults.find(s => s.status === "ok" && s.gameCount > 0);
    const okButEmpty = seasonResults.find(s => s.status === "ok" && s.gameCount === 0);
    const allBlocked = seasonResults.every(s => s.status === "error");

    let conclusion: string;
    if (working) {
      conclusion = `Season ${working.season} returns ${working.gameCount} games for ${today}. Use this season.`;
    } else if (allBlocked) {
      conclusion = "All tested seasons are blocked by the free plan. An API upgrade is needed.";
    } else if (okButEmpty) {
      conclusion = `Season ${okButEmpty.season} is accessible but has 0 games for ${today} (may be an off-day). Try again on a game day.`;
    } else {
      conclusion = "Mixed results. Review seasonsTried for details.";
    }

    if (working) {
      try {
        const cache = JSON.parse(fs.readFileSync(LEAGUE_CACHE_PATH, "utf-8"));
        cache.echlCurrentSeason = working.season;
        cache.lastResolved = new Date().toISOString();
        fs.writeFileSync(LEAGUE_CACHE_PATH, JSON.stringify(cache, null, 2));
        conclusion += ` (Updated cache to season ${working.season}.)`;
      } catch {}
    }

    return res.json({
      cachedLeagueId,
      leagueIdUsed: leagueId,
      dateChecked: today,
      seasonsTried: seasonResults,
      noSeasonCall: noSeasonResult,
      conclusion,
    });
  });

  app.get("/api/debug/sources", (_req, res) => {
    const generated = loadGeneratedEvents();
    if (!generated || !generated.events) {
      return res.json({ nhl: 0, ahl: 0, echl: 0, total: 0 });
    }
    const events: any[] = generated.events;
    const nhl = events.filter((e: any) => e.source === "nhl").length;
    const ahlHt = events.filter((e: any) => e.source === "ahl-hockeytech").length;
    const ahlOdds = events.filter((e: any) => e.source === "ahl-odds").length;
    const ahl = ahlHt + ahlOdds;
    const echl = events.filter((e: any) => (e.source || "").startsWith("echl")).length;
    const ncaa = events.filter((e: any) => (e.source || "").startsWith("ncaa")).length;
    const rugby = events.filter((e: any) => e.source === "rugby").length;
    const svnsSessions = events.filter((e: any) => e.leagueKey === "svns" && e.eventType === "session").length;
    const cricket = events.filter((e: any) => (e.source || "").startsWith("cricket")).length;
    const cricketIccT20WcCount = events.filter((e: any) => (e.source || "").startsWith("cricket") && e.isIccT20Wc).length;
    const other = events.length - nhl - ahl - echl - ncaa - rugby - cricket;
    return res.json({
      nhl, ahl, ahlHockeyTech: ahlHt, ahlOdds, echl, ncaa, rugby, svnsSessions, cricket, cricketIccT20WcCount, other, total: events.length,
      lastUpdated: generated.lastUpdated,
      ahlSourceUsed: generated.ahlSourceUsed ?? "unknown",
      echlSourceUsed: generated.echlSourceUsed ?? "unknown",
      echlWebCount: generated.echlWebCount ?? 0,
      buSourceUsed: generated.buSourceUsed ?? "unknown",
      rugbySourceUsed: generated.rugbySourceUsed ?? "unknown",
      rugbyCounts: generated.rugbyCounts ?? {},
      cricketSourceUsed: generated.cricketSourceUsed ?? "unknown",
      cricketCounts: generated.cricketCounts ?? {},
    });
  });

  app.get("/api/debug/cricket-sample", (_req, res) => {
    const generated = loadGeneratedEvents();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const cricketEvents = generated.events
      .filter((e: any) => (e.source || "").startsWith("cricket"))
      .slice(0, 10);

    const sample = cricketEvents.map((e: any) => ({
      id: e.id,
      league: e.league,
      competitionName: e.competitionName,
      seriesName: e.seriesName,
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      gender: e.gender || "unknown",
      isIccT20Wc: e.isIccT20Wc || false,
      competitionType: e.competitionType,
      hostCountry: e.hostCountry,
      providerId: e.providerId,
    }));

    const allCricket = generated.events.filter((e: any) => (e.source || "").startsWith("cricket"));
    const byGender: Record<string, number> = {};
    for (const e of allCricket) {
      const g = (e as any).gender || "unknown";
      byGender[g] = (byGender[g] || 0) + 1;
    }

    return res.json({ total: allCricket.length, byGender, sample });
  });

  app.get("/api/debug/nhl-provider-sample", (_req, res) => {
    const generated = loadGeneratedEvents();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const now = new Date();
    const nhlUpcoming = generated.events
      .filter((e: any) => e.source === "nhl" && new Date(e.startTimeLocal) > now)
      .sort((a: any, b: any) => new Date(a.startTimeLocal).getTime() - new Date(b.startTimeLocal).getTime())
      .slice(0, 5);

    const sample = nhlUpcoming.map((e: any) => ({
      id: e.id,
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      startTimeLocal: e.startTimeLocal,
      broadcastNetworks: e.broadcastNetworks || [],
      isNational: e.isNational ?? false,
      providerId: e.providerId,
      providerReason: e.providerReason || "unknown",
    }));

    const allNhl = generated.events.filter((e: any) => e.source === "nhl");
    const byReason: Record<string, number> = {};
    for (const e of allNhl) {
      const r = (e as any).providerReason || "unknown";
      byReason[r] = (byReason[r] || 0) + 1;
    }

    return res.json({ total: allNhl.length, byReason, sample });
  });

  app.get("/api/debug/echl-time-sample", (_req, res) => {
    const generated = loadGeneratedEvents();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const echlEvents = generated.events.filter((e: any) => e.source === "echl");
    if (echlEvents.length === 0) {
      return res.json({ error: "No ECHL events found" });
    }
    const sample = echlEvents[0];
    const parsed = new Date(sample.startTimeLocal);
    const laFormatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(parsed);
    const utcFormatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(parsed);
    return res.json({
      eventId: sample.id,
      homeTeam: sample.homeTeam,
      awayTeam: sample.awayTeam,
      storedStartTimeLocal: sample.startTimeLocal,
      parsedIso: parsed.toISOString(),
      formattedLA: laFormatted,
      formattedUTC: utcFormatted,
    });
  });

  app.get("/api/debug/rugby-time-sample", (_req, res) => {
    const generated = loadGeneratedEvents();
    if (!generated || !generated.events) {
      return res.json({ error: "No events available" });
    }
    const leagueOneEvents = generated.events.filter(
      (e: any) => e.leagueKey === "leagueone"
    );
    if (leagueOneEvents.length === 0) {
      return res.json({ error: "No League One events found" });
    }
    const sample = leagueOneEvents[0];
    const parsed = new Date(sample.startTimeLocal);

    const jstFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(parsed);

    const ptFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(parsed);

    return res.json({
      eventId: sample.id,
      homeTeam: sample.homeTeam,
      awayTeam: sample.awayTeam,
      rawLocalTime: `${jstFormatted} (Asia/Tokyo)`,
      parsedUtcIso: parsed.toISOString(),
      formattedPT: `${ptFormatted} (America/Los_Angeles)`,
      timezone: "Asia/Tokyo",
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
