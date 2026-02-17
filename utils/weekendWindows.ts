const TZ = "America/Los_Angeles";

export interface WeekendWindow {
  start: Date;
  end: Date;
  label: string;
}

export interface WeekendWindows {
  current: WeekendWindow;
  next: WeekendWindow;
}

function getLocalParts(d: Date): { year: number; month: number; day: number; dow: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => {
    const p = parts.find((p) => p.type === type);
    return p ? p.value : "";
  };

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    dow: dayMap[get("weekday")] ?? 0,
    hour: parseInt(get("hour"), 10),
  };
}

function midnightInTZ(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(guess);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  const localH = get("hour") === 24 ? 0 : get("hour");
  const localM = get("minute");
  const localS = get("second");

  const offsetMs = (localH * 3600 + localM * 60 + localS) * 1000;
  const candidate = new Date(guess.getTime() - offsetMs);

  const verify = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(candidate);

  const verifyDay = parseInt(verify.find((p) => p.type === "day")?.value || "0", 10);
  const verifyHour = parseInt(verify.find((p) => p.type === "hour")?.value || "0", 10);

  if (verifyDay !== day) {
    return new Date(candidate.getTime() + (verifyDay < day ? 86400000 : -86400000));
  }
  if (verifyHour !== 0 && verifyHour !== 24) {
    return new Date(candidate.getTime() - verifyHour * 3600000);
  }

  return candidate;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

export function getWeekendWindows(now: Date): WeekendWindows {
  const { year, month, day, dow } = getLocalParts(now);

  let fridayOffset: number;
  if (dow >= 1 && dow <= 4) {
    fridayOffset = 5 - dow;
  } else if (dow === 5) {
    fridayOffset = 0;
  } else if (dow === 6) {
    fridayOffset = -1;
  } else {
    fridayOffset = -2;
  }

  const fridayDay = day + fridayOffset;
  const fridayDate = new Date(Date.UTC(year, month - 1, fridayDay, 12));
  const fridayParts = getLocalParts(fridayDate);

  const currentFridayMidnight = midnightInTZ(fridayParts.year, fridayParts.month, fridayParts.day);
  const currentSundayEnd = new Date(addDays(currentFridayMidnight, 3).getTime() - 1);
  const nextFridayMidnight = addDays(currentFridayMidnight, 7);
  const nextSundayEnd = new Date(addDays(nextFridayMidnight, 3).getTime() - 1);

  const fmt = (d: Date) => {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      month: "numeric",
      day: "numeric",
    }).formatToParts(d);
    const m = p.find((x) => x.type === "month")?.value;
    const dy = p.find((x) => x.type === "day")?.value;
    return `${m}/${dy}`;
  };

  return {
    current: {
      start: currentFridayMidnight,
      end: currentSundayEnd,
      label: `${fmt(currentFridayMidnight)}–${fmt(currentSundayEnd)}`,
    },
    next: {
      start: nextFridayMidnight,
      end: nextSundayEnd,
      label: `${fmt(nextFridayMidnight)}–${fmt(nextSundayEnd)}`,
    },
  };
}

export function isInWindow(eventStartLocal: string, window: WeekendWindow): boolean {
  const eventTime = new Date(eventStartLocal).getTime();
  return eventTime >= window.start.getTime() && eventTime <= window.end.getTime();
}

export function isInWindowForMode(
  eventStartLocal: string,
  window: WeekendWindow,
  modeId: string
): boolean {
  if (modeId === "weekend_nights") {
    const shifted = new Date(eventStartLocal).getTime() - 2 * 3600000;
    return shifted >= window.start.getTime() && shifted <= window.end.getTime();
  }
  return isInWindow(eventStartLocal, window);
}

export function shouldShowNextWeekend(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).formatToParts(now);
  const dow = parts.find((p) => p.type === "weekday")?.value || "";
  return dow === "Fri" || dow === "Sat" || dow === "Sun";
}

export function isInWeekendWindows(eventStartLocal: string, windows: WeekendWindows): boolean {
  return isInWindow(eventStartLocal, windows.current) || isInWindow(eventStartLocal, windows.next);
}

export function isInModeTimeWindow(eventStartLocal: string, modeId: string): boolean {
  const eventDate = new Date(eventStartLocal);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(eventDate);

  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const totalMinutes = (hour === 24 ? 0 : hour) * 60 + minute;

  if (modeId === "weekend_nights") {
    if (totalMinutes >= 960) return true;
    if (totalMinutes <= 120) return true;
    return false;
  }

  if (modeId === "weekend_mornings") {
    const dowParts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
    }).formatToParts(eventDate);
    const dow = dowParts.find((p) => p.type === "weekday")?.value || "";
    if (dow !== "Sat" && dow !== "Sun") return false;
    return totalMinutes >= 360 && totalMinutes <= 840;
  }

  return true;
}
