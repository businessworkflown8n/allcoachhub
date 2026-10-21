// Timezone helpers for webinars. webinars.webinar_date + webinar_time are wall-clock
// values in webinars.timezone (an IANA name); these convert them to real instants.

function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock date ("YYYY-MM-DD") and time ("HH:MM" or "HH:MM:SS") in an
 * IANA timezone to a UTC Date. Falls back to interpreting the time as UTC when the
 * timezone is not recognised, which matches the previous behaviour.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string | null | undefined): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
  if (!timeZone) return new Date(wallAsUtc);
  try {
    const firstOffset = tzOffsetMs(new Date(wallAsUtc), timeZone);
    let utc = wallAsUtc - firstOffset;
    // Re-check once: the offset can differ on the other side of a DST transition.
    const secondOffset = tzOffsetMs(new Date(utc), timeZone);
    if (secondOffset !== firstOffset) utc = wallAsUtc - secondOffset;
    return new Date(utc);
  } catch {
    return new Date(wallAsUtc);
  }
}

/** Webinar start instant from a webinars row. */
export function webinarStartUtc(w: { webinar_date: string; webinar_time: string; timezone?: string | null }): Date {
  return zonedTimeToUtc(w.webinar_date, w.webinar_time, w.timezone);
}

/** Google Calendar's compact UTC format: 20261021T123000Z */
export function toGCalUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
