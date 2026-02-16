import { toZonedTime } from "date-fns-tz";

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

export function getWeekendWindows(now: Date): WeekendWindows {
  const zoned = toZonedTime(now, TZ);
  const dow = zoned.getDay();

  let fridayOffset: number;
  if (dow === 0) {
    fridayOffset = -2;
  } else if (dow >= 5) {
    fridayOffset = -(dow - 5);
  } else {
    fridayOffset = 5 - dow;
  }

  const currentFriday = new Date(zoned);
  currentFriday.setDate(currentFriday.getDate() + fridayOffset);
  currentFriday.setHours(0, 0, 0, 0);

  const currentSunday = new Date(currentFriday);
  currentSunday.setDate(currentSunday.getDate() + 2);
  currentSunday.setHours(23, 59, 59, 999);

  const nextFriday = new Date(currentFriday);
  nextFriday.setDate(nextFriday.getDate() + 7);

  const nextSunday = new Date(nextFriday);
  nextSunday.setDate(nextSunday.getDate() + 2);
  nextSunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${day}`;
  };

  return {
    current: {
      start: currentFriday,
      end: currentSunday,
      label: `${fmt(currentFriday)}–${fmt(currentSunday)}`,
    },
    next: {
      start: nextFriday,
      end: nextSunday,
      label: `${fmt(nextFriday)}–${fmt(nextSunday)}`,
    },
  };
}

export function isInWindow(
  eventStartLocal: string,
  window: WeekendWindow
): boolean {
  const eventDate = toZonedTime(new Date(eventStartLocal), TZ);
  return eventDate >= window.start && eventDate <= window.end;
}

export function isInWeekendWindows(
  eventStartLocal: string,
  windows: WeekendWindows
): boolean {
  return isInWindow(eventStartLocal, windows.current) || isInWindow(eventStartLocal, windows.next);
}

export function isInModeTimeWindow(
  eventStartLocal: string,
  modeId: string
): boolean {
  const eventDate = toZonedTime(new Date(eventStartLocal), TZ);
  const hour = eventDate.getHours();
  const minute = eventDate.getMinutes();
  const totalMinutes = hour * 60 + minute;

  if (modeId === "weekend_nights") {
    if (totalMinutes >= 960) return true;
    if (totalMinutes <= 120) return true;
    return false;
  }

  if (modeId === "weekend_mornings") {
    return totalMinutes >= 360 && totalMinutes <= 780;
  }

  return true;
}
