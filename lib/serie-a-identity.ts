/**
 * Identity helpers for Serie A fixtures.
 *
 * ESPN's fixture id is the authoritative identity when it is available. The
 * team/season key is intentionally retained as an alias because the app has
 * historically generated Serie A ids from kickoff time; a postponed match
 * therefore needs to reconcile with the old local record even when ESPN has
 * not yet been persisted on that record.
 */

export interface SerieAMatchLike {
  id?: string;
  league?: string;
  leagueKey?: string;
  homeTeam?: string;
  awayTeam?: string;
  startTimeLocal?: string;
  seasonTag?: string;
  espnId?: string;
  externalId?: string;
  sourceEventId?: string;
}

function cleanExternalId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSerieATeam(name: string | undefined): string {
  return (name || "")
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bfootball\s+club\b/g, "")
    .replace(/\bfc\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getSerieASeasonKey(
  startTimeLocal: string | undefined,
  seasonTag?: string,
): string {
  if (seasonTag && seasonTag.trim()) return seasonTag.trim().toLowerCase();

  const timestamp = startTimeLocal ? new Date(startTimeLocal).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return "unknown";

  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  // Serie A seasons span July through June. Keeping this in the fallback
  // identity prevents the same fixture pairing in different seasons from
  // colliding while remaining stable when kickoff is rescheduled.
  return date.getUTCMonth() >= 6
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
}

export function getSerieATeamSeasonIdentity(event: SerieAMatchLike): string | null {
  const away = normalizeSerieATeam(event.awayTeam);
  const home = normalizeSerieATeam(event.homeTeam);
  if (!away || !home) return null;
  return `seriea:${getSerieASeasonKey(event.startTimeLocal, event.seasonTag)}:${away}@${home}`;
}

function getEspnFixtureId(event: SerieAMatchLike): string | null {
  return (
    cleanExternalId(event.espnId) ||
    cleanExternalId(event.externalId) ||
    cleanExternalId(event.sourceEventId)
  );
}

/**
 * Return all known identities, strongest first. The fallback alias is
 * deliberately included even for ESPN-backed events so old kickoff-derived
 * ids can be reconciled after a reschedule.
 */
export function getSerieAMatchIdentityAliases(event: SerieAMatchLike): string[] {
  const aliases: string[] = [];
  const espnId = getEspnFixtureId(event);
  if (espnId) aliases.push(`espn:${espnId}`);

  const teamSeasonIdentity = getSerieATeamSeasonIdentity(event);
  if (teamSeasonIdentity) aliases.push(teamSeasonIdentity);

  const id = cleanExternalId(event.id);
  if (id && !id.startsWith("soccer-seriea-")) aliases.push(`id:${id}`);

  return [...new Set(aliases)];
}

export function getSerieAMatchIdentity(event: SerieAMatchLike): string {
  const aliases = getSerieAMatchIdentityAliases(event);
  return aliases[0] || (event.id ? `id:${event.id}` : "seriea:unknown");
}

export function isSerieAEvent(event: SerieAMatchLike): boolean {
  return event.leagueKey === "seriea" || event.league === "Serie A";
}

export function isKickoffDerivedSerieAId(id: string | undefined): boolean {
  return typeof id === "string" && /^soccer-seriea-\d{8}-\d{4}-/i.test(id);
}