// Shared types and pure helpers for Webinar Management (coach + admin UI).
// Validation mirrors public.wm_validate_config; the database remains the authority.

export type WebinarPermissionKey =
  | "access"
  | "edit_schedule"
  | "edit_join_url"
  | "edit_whatsapp_url"
  | "edit_registration_url"
  | "publish"
  | "view_sync";

export type WebinarPermissions = Record<WebinarPermissionKey, boolean>;

/** coach_feature_flags column for each permission, in display order. */
export const WEBINAR_PERMISSION_COLUMNS: { key: WebinarPermissionKey; column: string; label: string }[] = [
  { key: "access", column: "webinar_mgmt_access", label: "Access Webinar Management" },
  { key: "edit_schedule", column: "webinar_mgmt_edit_schedule", label: "Edit date, time & timezone" },
  { key: "edit_join_url", column: "webinar_mgmt_edit_join_url", label: "Edit joining URL" },
  { key: "edit_whatsapp_url", column: "webinar_mgmt_edit_whatsapp_url", label: "Edit WhatsApp URL" },
  { key: "edit_registration_url", column: "webinar_mgmt_edit_registration_url", label: "Edit registration URL" },
  { key: "publish", column: "webinar_mgmt_publish", label: "Publish changes" },
  { key: "view_sync", column: "webinar_mgmt_view_sync", label: "View sync status" },
];

export const SYNC_DESTINATIONS = [
  { key: "website", label: "Website" },
  { key: "google_sheets", label: "Google Sheets" },
  { key: "webhooks", label: "Workflows" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "calendar", label: "Calendar" },
  { key: "reminders", label: "Reminders" },
] as const;

export type SyncDestination = (typeof SYNC_DESTINATIONS)[number]["key"];
export type SyncStatus = "pending" | "processing" | "synced" | "failed" | "skipped" | "superseded";

export interface CalendarDetails {
  provider?: "none" | "google" | "outlook" | "other";
  calendar_id?: string;
  event_id?: string;
  notes?: string;
}

/** Editable configuration, same shape as webinar_config_drafts.draft. */
export interface WebinarConfig {
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  timezone: string; // IANA
  webinar_url: string;
  whatsapp_url: string | null;
  registration_url: string | null;
  calendar_details: CalendarDetails;
}

export interface ManagedWebinarRow {
  id: string;
  title: string;
  description: string | null;
  webinar_date: string;
  webinar_time: string;
  duration_minutes: number;
  timezone: string;
  webinar_link: string;
  webinar_link_status: string;
  whatsapp_group_url: string | null;
  registration_page_url: string | null;
  calendar_details: CalendarDetails | null;
  is_published: boolean;
  config_version: number;
  config_published_at: string | null;
  config_updated_by: string | null;
  updated_at: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const HTTPS_URL = /^https:\/\/[^\s<>"]+$/;
const WHATSAPP_URL = /^https:\/\/(chat\.whatsapp\.com|(www\.)?whatsapp\.com|wa\.me)\/[^\s<>"]+$/;

export function isValidTimeZone(tz: string): boolean {
  if (!tz || !/^[A-Za-z]+(\/[A-Za-z0-9_+-]+)+$|^UTC$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** All IANA timezones the browser knows, with a fallback list for older browsers. */
export function listTimeZones(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supported = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
  if (supported?.length) return supported;
  return [
    "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "Europe/Paris", "Europe/Berlin",
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Australia/Sydney", "Pacific/Auckland", "UTC",
  ];
}

/** Minutes between start and end; an end at or before the start means it ends after midnight. */
export function durationMinutes(start: string, end: string): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  let d = toMin(end) - toMin(start);
  if (d <= 0) d += 1440;
  return d;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - Math.floor(at.getTime() / 1000) * 1000;
}

/** Wall-clock date/time in an IANA zone → UTC instant. Same algorithm as supabase/functions/_shared/webinarTime.ts. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
  if (!isValidTimeZone(timeZone)) return new Date(wallAsUtc);
  const first = tzOffsetMs(new Date(wallAsUtc), timeZone);
  let utc = wallAsUtc - first;
  const second = tzOffsetMs(new Date(utc), timeZone);
  if (second !== first) utc = wallAsUtc - second;
  return new Date(utc);
}

/** Google Calendar "add event" link using real UTC instants. */
export function googleCalendarUrl(args: { title: string; date: string; time: string; durationMinutes: number; timezone: string; details?: string; location?: string }): string {
  const start = zonedTimeToUtc(args.date, args.time, args.timezone);
  const end = new Date(start.getTime() + args.durationMinutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: args.title, dates: `${fmt(start)}/${fmt(end)}`, ctz: args.timezone });
  if (args.details) params.set("details", args.details);
  if (args.location) params.set("location", args.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function configFromWebinar(w: ManagedWebinarRow): WebinarConfig {
  const start = String(w.webinar_time).slice(0, 5);
  return {
    title: w.title,
    date: w.webinar_date,
    start_time: start,
    end_time: addMinutesToTime(start, w.duration_minutes),
    timezone: w.timezone,
    webinar_url: w.webinar_link ?? "",
    whatsapp_url: w.whatsapp_group_url,
    registration_url: w.registration_page_url,
    calendar_details: w.calendar_details ?? {},
  };
}

export type ConfigField = "title" | "schedule" | "webinar_url" | "whatsapp_url" | "registration_url" | "calendar_details";

/** Which permission each field group needs (title/calendar only need access). */
export const FIELD_PERMISSION: Record<ConfigField, WebinarPermissionKey> = {
  title: "access",
  schedule: "edit_schedule",
  webinar_url: "edit_join_url",
  whatsapp_url: "edit_whatsapp_url",
  registration_url: "edit_registration_url",
  calendar_details: "access",
};

const norm = (v: string | null | undefined) => (v ?? "").trim() || null;

export function changedFields(published: WebinarConfig, draft: WebinarConfig): ConfigField[] {
  const out: ConfigField[] = [];
  if (published.title.trim() !== draft.title.trim()) out.push("title");
  if (
    published.date !== draft.date ||
    published.start_time !== draft.start_time ||
    durationMinutes(published.start_time, published.end_time) !== durationMinutes(draft.start_time, draft.end_time) ||
    published.timezone !== draft.timezone
  ) out.push("schedule");
  if (norm(published.webinar_url) !== norm(draft.webinar_url)) out.push("webinar_url");
  if (norm(published.whatsapp_url) !== norm(draft.whatsapp_url)) out.push("whatsapp_url");
  if (norm(published.registration_url) !== norm(draft.registration_url)) out.push("registration_url");
  if (JSON.stringify(cleanCalendar(published.calendar_details)) !== JSON.stringify(cleanCalendar(draft.calendar_details))) {
    out.push("calendar_details");
  }
  return out;
}

export function cleanCalendar(c: CalendarDetails | null | undefined): CalendarDetails {
  const out: CalendarDetails = {};
  if (c?.provider && c.provider !== "none") out.provider = c.provider;
  if (c?.calendar_id?.trim()) out.calendar_id = c.calendar_id.trim();
  if (c?.event_id?.trim()) out.event_id = c.event_id.trim();
  if (c?.notes?.trim()) out.notes = c.notes.trim();
  return out;
}

export type ValidationErrors = Partial<Record<keyof WebinarConfig, string>>;

export function validateConfig(c: WebinarConfig, opts: { now?: Date; scheduleChanged?: boolean } = {}): ValidationErrors {
  const e: ValidationErrors = {};
  const title = c.title.trim();
  if (title.length < 3 || title.length > 200) e.title = "Title must be 3–200 characters.";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || Number.isNaN(Date.parse(`${c.date}T00:00:00Z`)) ||
      new Date(`${c.date}T00:00:00Z`).toISOString().slice(0, 10) !== c.date) {
    e.date = "Enter a valid date.";
  }
  if (!HHMM.test(c.start_time)) e.start_time = "Use HH:MM (24-hour).";
  if (!HHMM.test(c.end_time)) e.end_time = "Use HH:MM (24-hour).";
  if (!e.start_time && !e.end_time) {
    const d = durationMinutes(c.start_time, c.end_time);
    if (d < 15 || d > 720) e.end_time = "Webinar length must be between 15 minutes and 12 hours.";
  }
  if (!isValidTimeZone(c.timezone)) e.timezone = "Choose a valid IANA timezone (e.g. Asia/Kolkata).";

  if (!e.date && !e.start_time && !e.timezone && opts.scheduleChanged !== false) {
    const start = zonedTimeToUtc(c.date, c.start_time, c.timezone);
    if (start.getTime() <= (opts.now ?? new Date()).getTime()) e.date = "The start time is in the past.";
  }

  const url = c.webinar_url.trim();
  if (!HTTPS_URL.test(url) || url.length > 2048) e.webinar_url = "Enter a valid https:// joining link.";
  const wa = norm(c.whatsapp_url);
  if (wa && (!WHATSAPP_URL.test(wa) || wa.length > 2048)) {
    e.whatsapp_url = "Use a chat.whatsapp.com, whatsapp.com or wa.me https:// link.";
  }
  const reg = norm(c.registration_url);
  if (reg && (!HTTPS_URL.test(reg) || reg.length > 2048)) e.registration_url = "Enter a valid https:// link.";

  const cal = c.calendar_details ?? {};
  if ([cal.calendar_id, cal.event_id, cal.notes].some((v) => (v ?? "").length > 500)) {
    e.calendar_details = "Calendar fields must be under 500 characters.";
  }
  return e;
}

/** Payload sent to the server: trimmed, empty optionals as null. */
export function toServerConfig(c: WebinarConfig): WebinarConfig {
  return {
    title: c.title.trim(),
    date: c.date,
    start_time: c.start_time,
    end_time: c.end_time,
    timezone: c.timezone,
    webinar_url: c.webinar_url.trim(),
    whatsapp_url: norm(c.whatsapp_url),
    registration_url: norm(c.registration_url),
    calendar_details: cleanCalendar(c.calendar_details),
  };
}

export interface DestinationSummary {
  destination: SyncDestination;
  status: SyncStatus | "not_started";
  last_error: string | null;
  attempts: number;
  acknowledged_at: string | null;
}

/**
 * Overall sync state for the current version. "complete" only when every
 * destination that applies has acknowledged; skipped (not configured / no change)
 * destinations are reported separately and never counted as synced.
 */
export function overallSyncState(rows: DestinationSummary[]): "complete" | "in_progress" | "failed" | "not_started" {
  if (!rows.length || rows.every((r) => r.status === "not_started")) return "not_started";
  if (rows.some((r) => r.status === "failed")) return "failed";
  if (rows.some((r) => r.status === "pending" || r.status === "processing" || r.status === "not_started")) return "in_progress";
  return "complete";
}
