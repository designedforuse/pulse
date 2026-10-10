import fs from "node:fs";
import path from "node:path";
import { fetchEplEvents, mergeEplEvents } from "./updateEpl";
import { fetchSerieAEvents, mergeSerieAEvents } from "./updateSerieA";
import { fetchLaLigaEvents, mergeLaLigaEvents } from "./updateLaLiga";
import { fetchBundesligaEvents, mergeBundesligaEvents } from "./updateBundesliga";
import { fetchLigue1Events, mergeLigue1Events } from "./updateLigue1";

const outputPath = path.resolve(__dirname, "../data/generatedEvents.json");
const now = new Date();
const nowIso = now.toISOString();
const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
const allEvents: any[] = output.events;

const leagues = [
  { name: "EPL", prefix: "soccer-epl-", key: "epl", fetch: fetchEplEvents, merge: mergeEplEvents, sourceName: "ESPN API" },
  { name: "Serie A", prefix: "soccer-seriea-", key: "seriea", fetch: fetchSerieAEvents, merge: mergeSerieAEvents, sourceName: "ESPN API" },
  { name: "La Liga", prefix: "soccer-laliga-", key: "laliga", fetch: fetchLaLigaEvents, merge: mergeLaLigaEvents, sourceName: "iCal feed" },
  { name: "Bundesliga", prefix: "soccer-bundesliga-", key: "bundesliga", fetch: fetchBundesligaEvents, merge: mergeBundesligaEvents, sourceName: "iCal feed" },
  { name: "Ligue 1", prefix: "soccer-ligue1-", key: "ligue1", fetch: fetchLigue1Events, merge: mergeLigue1Events, sourceName: "iCal feed" },
];

async function main() {
  for (const league of leagues) {
    const existing = allEvents.filter((event) => event.id.startsWith(league.prefix));
    const fetched = await league.fetch();
    if (fetched.count === 0) {
      throw new Error(
        `${league.name}: source returned no fixtures; refusing to replace its cached schedule.`,
      );
    }
    const result = league.merge(existing, fetched.events, now);
    if (fetched.count > 0 && result.merged.length === 0) {
      throw new Error(`${league.name}: received fixtures but merge produced an empty schedule`);
    }

    const ids = new Set(result.merged.map((event: any) => event.id));
    const retained = allEvents.filter((event) => !event.id.startsWith(league.prefix));
    output.events = [...retained, ...result.merged].sort(
      (a, b) => a.startTimeLocal.localeCompare(b.startTimeLocal),
    );
    allEvents.splice(0, allEvents.length, ...output.events);

    const sourceUsed = fetched.sourceUsed || "none";
    output[`${league.key}Count`] = result.merged.length;
    output[`${league.key}Added`] = result.added;
    output[`${league.key}Updated`] = result.updated;
    output[`${league.key}Pruned`] = result.pruned;
    output[`${league.key}SourceUsed`] = sourceUsed;
    output.generatedMeta ??= {};
    output.generatedMeta.sources ??= {};
    const previous = output.generatedMeta.sources[league.key] ?? {};
    output.generatedMeta.sources[league.key] = {
      ...previous,
      count: result.merged.length,
      lastFetchAt: fetched.count > 0 ? nowIso : previous.lastFetchAt || nowIso,
      sourceName: league.sourceName,
    };
    console.log(
      `${league.name}: ${fetched.count} fetched (${sourceUsed}); ${result.merged.length} retained; ` +
      `+${result.added} added, ~${result.updated} updated, -${result.pruned} pruned`,
    );
  }

  output.lastUpdated = nowIso;
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Saved ${output.events.length} total events; only the five European league subsets were refreshed.`);
}

main().catch((error) => {
  console.error("European soccer refresh failed:", error);
  process.exitCode = 1;
});
