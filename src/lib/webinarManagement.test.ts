import { describe, expect, it } from "vitest";
import {
  FIELD_PERMISSION, changedFields, configFromWebinar, durationMinutes, googleCalendarUrl, isValidTimeZone, overallSyncState,
  toServerConfig, validateConfig, zonedTimeToUtc,
  type DestinationSummary, type ManagedWebinarRow, type WebinarConfig,
} from "./webinarManagement";

const base: WebinarConfig = {
  title: "AI for Business Leaders",
  date: "2030-03-15",
  start_time: "18:00",
  end_time: "19:30",
  timezone: "Asia/Kolkata",
  webinar_url: "https://zoom.us/j/123456",
  whatsapp_url: "https://chat.whatsapp.com/AbCdEf123",
  registration_url: "https://www.aicoachportal.com/webinars",
  calendar_details: {},
};

const row: ManagedWebinarRow = {
  id: "00000000-0000-0000-0000-000000000001",
  title: base.title,
  description: null,
  webinar_date: base.date,
  webinar_time: "18:00:00",
  duration_minutes: 90,
  timezone: base.timezone,
  webinar_link: base.webinar_url,
  webinar_link_status: "approved",
  whatsapp_group_url: base.whatsapp_url,
  registration_page_url: base.registration_url,
  calendar_details: {},
  is_published: true,
  config_version: 3,
  config_published_at: null,
  config_updated_by: null,
  updated_at: "2030-01-01T00:00:00Z",
};

const NOW = new Date("2030-01-01T00:00:00Z");

describe("zonedTimeToUtc", () => {
  it("converts a fixed-offset zone", () => {
    expect(zonedTimeToUtc("2030-03-15", "18:00", "Asia/Kolkata").toISOString()).toBe("2030-03-15T12:30:00.000Z");
  });

  it("accepts HH:MM:SS from the database", () => {
    expect(zonedTimeToUtc("2030-03-15", "18:00:00", "Asia/Kolkata").toISOString()).toBe("2030-03-15T12:30:00.000Z");
  });

  it("handles daylight saving on both sides of the change", () => {
    // New York: EST (UTC-5) before 2030-03-10, EDT (UTC-4) after.
    expect(zonedTimeToUtc("2030-03-09", "10:00", "America/New_York").toISOString()).toBe("2030-03-09T15:00:00.000Z");
    expect(zonedTimeToUtc("2030-03-11", "10:00", "America/New_York").toISOString()).toBe("2030-03-11T14:00:00.000Z");
    // London: GMT in winter, BST in summer.
    expect(zonedTimeToUtc("2030-01-15", "09:00", "Europe/London").toISOString()).toBe("2030-01-15T09:00:00.000Z");
    expect(zonedTimeToUtc("2030-07-15", "09:00", "Europe/London").toISOString()).toBe("2030-07-15T08:00:00.000Z");
  });

  it("crosses the date line correctly", () => {
    expect(zonedTimeToUtc("2030-03-15", "08:00", "Pacific/Auckland").toISOString()).toBe("2030-03-14T19:00:00.000Z");
  });

  it("falls back to UTC for an unknown zone instead of throwing", () => {
    expect(zonedTimeToUtc("2030-03-15", "18:00", "Mars/Olympus").toISOString()).toBe("2030-03-15T18:00:00.000Z");
  });
});

describe("timezones", () => {
  it("accepts IANA names and rejects abbreviations or garbage", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("America/Argentina/Buenos_Aires")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("IST")).toBe(false);
    expect(isValidTimeZone("Asia/Nowhere")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("durationMinutes", () => {
  it("computes same-day and past-midnight lengths", () => {
    expect(durationMinutes("18:00", "19:30")).toBe(90);
    expect(durationMinutes("23:30", "00:30")).toBe(60);
    expect(durationMinutes("10:00", "10:00")).toBe(1440);
  });
});

describe("validateConfig", () => {
  it("accepts a valid configuration", () => {
    expect(validateConfig(base, { now: NOW })).toEqual({});
  });

  it("rejects bad URLs, http links and non-WhatsApp community links", () => {
    const e = validateConfig({
      ...base,
      webinar_url: "http://zoom.us/j/1",
      whatsapp_url: "https://evil.example.com/chat.whatsapp.com",
      registration_url: "javascript:alert(1)",
    }, { now: NOW });
    expect(e.webinar_url).toBeTruthy();
    expect(e.whatsapp_url).toBeTruthy();
    expect(e.registration_url).toBeTruthy();
  });

  it("allows optional URLs to be empty", () => {
    expect(validateConfig({ ...base, whatsapp_url: "", registration_url: null }, { now: NOW })).toEqual({});
  });

  it("rejects invalid dates, times, lengths and timezones", () => {
    expect(validateConfig({ ...base, date: "2030-02-30" }, { now: NOW }).date).toBeTruthy();
    expect(validateConfig({ ...base, start_time: "25:00" }, { now: NOW }).start_time).toBeTruthy();
    expect(validateConfig({ ...base, end_time: "18:05" }, { now: NOW }).end_time).toBeTruthy();
    expect(validateConfig({ ...base, timezone: "IST" }, { now: NOW }).timezone).toBeTruthy();
    expect(validateConfig({ ...base, title: "  " }, { now: NOW }).title).toBeTruthy();
  });

  it("rejects a start in the past only when the schedule changes", () => {
    const past = { ...base, date: "2029-12-31" };
    expect(validateConfig(past, { now: NOW }).date).toMatch(/past/);
    expect(validateConfig(past, { now: NOW, scheduleChanged: false }).date).toBeUndefined();
  });

  it("evaluates 'in the past' in the webinar's timezone, not the browser's", () => {
    // 05:00 in Kolkata on Jan 1 is 23:30 UTC on Dec 31: already past at NOW.
    expect(validateConfig({ ...base, date: "2030-01-01", start_time: "05:00", end_time: "06:00" }, { now: NOW }).date).toMatch(/past/);
    // 18:00 in New York on Dec 31 is 23:00 UTC: also past.
    expect(validateConfig({ ...base, date: "2029-12-31", start_time: "18:00", end_time: "19:00", timezone: "America/New_York" }, { now: NOW }).date).toMatch(/past/);
    // 20:00 in New York on Dec 31 is 01:00 UTC Jan 1: in the future.
    expect(validateConfig({ ...base, date: "2029-12-31", start_time: "20:00", end_time: "21:00", timezone: "America/New_York" }, { now: NOW }).date).toBeUndefined();
  });
});

describe("changedFields / permissions", () => {
  it("round-trips a webinar row without reporting changes", () => {
    expect(changedFields(configFromWebinar(row), configFromWebinar(row))).toEqual([]);
  });

  it("groups date, time, end time and timezone under schedule", () => {
    const published = configFromWebinar(row);
    expect(changedFields(published, { ...published, timezone: "Europe/London" })).toEqual(["schedule"]);
    expect(changedFields(published, { ...published, end_time: "20:00" })).toEqual(["schedule"]);
  });

  it("maps each changed field to the permission the server enforces", () => {
    const published = configFromWebinar(row);
    const changed = changedFields(published, {
      ...published, date: "2030-04-01", webinar_url: "https://meet.google.com/abc-defg-hij",
      whatsapp_url: null, registration_url: "https://example.com/register",
    });
    expect(changed.map((f) => FIELD_PERMISSION[f])).toEqual(["edit_schedule", "edit_join_url", "edit_whatsapp_url", "edit_registration_url"]);
  });

  it("ignores whitespace-only differences in URLs and empty calendar fields", () => {
    const published = configFromWebinar(row);
    expect(changedFields(published, { ...published, webinar_url: ` ${published.webinar_url} `, calendar_details: { provider: "none", event_id: " " } })).toEqual([]);
  });

  it("normalizes the payload sent to the server", () => {
    expect(toServerConfig({ ...base, title: "  Hi there ", whatsapp_url: "  ", calendar_details: { provider: "none", event_id: " ev1 " } })).toMatchObject({
      title: "Hi there", whatsapp_url: null, calendar_details: { event_id: "ev1" },
    });
  });
});

describe("googleCalendarUrl", () => {
  it("uses real UTC instants and passes the timezone", () => {
    const url = new URL(googleCalendarUrl({ title: "X", date: "2030-03-15", time: "18:00", durationMinutes: 90, timezone: "Asia/Kolkata" }));
    expect(url.searchParams.get("dates")).toBe("20300315T123000Z/20300315T140000Z");
    expect(url.searchParams.get("ctz")).toBe("Asia/Kolkata");
  });
});

describe("overallSyncState", () => {
  const d = (status: DestinationSummary["status"]): DestinationSummary => ({ destination: "website", status, last_error: null, attempts: 1, acknowledged_at: null });

  it("never reports complete while anything is pending or failed", () => {
    expect(overallSyncState([d("synced"), d("pending")])).toBe("in_progress");
    expect(overallSyncState([d("synced"), d("failed")])).toBe("failed");
    expect(overallSyncState([d("synced"), d("skipped")])).toBe("complete");
    expect(overallSyncState([])).toBe("not_started");
  });
});
