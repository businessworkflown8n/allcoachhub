// Drains public.webinar_sync_jobs (transactional outbox written by the webinars
// triggers). Each destination is processed independently; a job is only marked
// "synced" after the destination acknowledged it (or, for the website, after the
// public read-back matches the published version).
//
// Invoked by: webinar-management right after a publish/retry, and a pg_cron job
// (x-cron-secret) for retries/backoff. Also callable by an admin JWT.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TIME_BUDGET_MS = 45_000;
const MAX_BACKOFF_MIN = 60;

// deno-lint-ignore no-explicit-any
type Json = any;

interface SyncJob {
  id: string;
  webinar_id: string;
  coach_id: string;
  config_version: number;
  destination: "website" | "google_sheets" | "webhooks" | "whatsapp" | "calendar" | "reminders";
  idempotency_key: string;
  payload: Json;
  previous_config: Json | null;
  attempts: number;
  max_attempts: number;
  attempt_log: Json[];
  response: Json | null;
}

type Outcome =
  | { status: "synced"; message: string; response?: Json }
  | { status: "skipped"; message: string; code: string; response?: Json }
  | { status: "superseded"; message: string };

class SyncError extends Error {
  constructor(message: string, public code: string, public transient: boolean, public response?: Json) {
    super(message);
  }
}

const httpTransient = (status: number) => status === 408 || status === 425 || status === 429 || status >= 500;

// ---------------------------------------------------------------------------
// Event payload shared by webhooks (and mirrored in the Google Sheets row).
// Deterministic for a given job so retries send byte-identical bodies.
// ---------------------------------------------------------------------------
function eventPayload(job: SyncJob, supabaseUrl: string) {
  const c = job.payload;
  const p = job.previous_config;
  return {
    event: "webinar.config.published",
    event_id: job.idempotency_key,
    webinar_id: c.webinar_id,
    config_version: c.version,
    coach_id: c.coach_id,
    title: c.title,
    date: c.date,
    start_time: c.start_time,
    end_time: c.end_time,
    duration_minutes: c.duration_minutes,
    timezone: c.timezone,
    start_at_utc: c.start_at_utc,
    end_at_utc: c.end_at_utc,
    // The joining URL is only released once the existing admin link approval passed.
    webinar_url: c.webinar_url_status === "approved" ? c.webinar_url : null,
    webinar_url_status: c.webinar_url_status,
    whatsapp_url: c.whatsapp_url,
    registration_url: c.registration_url,
    is_published: c.is_published,
    published_at: c.published_at,
    previous: p ? { date: p.date, start_time: p.start_time, timezone: p.timezone, start_at_utc: p.start_at_utc } : null,
    latest_config_endpoint: `${supabaseUrl}/rest/v1/rpc/get_webinar_published_config`,
  };
}

async function sha256Hex(input: string, key?: string): Promise<string> {
  const enc = new TextEncoder();
  let buf: ArrayBuffer;
  if (key) {
    const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    buf = await crypto.subtle.sign("HMAC", k, enc.encode(input));
  } else {
    buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  }
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Destination: website (public pages read webinars directly; verify read-back)
// ---------------------------------------------------------------------------
async function syncWebsite(job: SyncJob, anon: SupabaseClient): Promise<Outcome> {
  const c = job.payload;
  const { data, error } = await anon
    .from("webinars")
    .select("id, title, webinar_date, webinar_time, duration_minutes, timezone, whatsapp_group_url, registration_page_url, config_version")
    .eq("id", job.webinar_id)
    .maybeSingle();
  if (error) throw new SyncError(`Public read-back failed: ${error.message}`, "WEBSITE_READ_FAILED", true);

  if (!c.is_published) {
    if (data) throw new SyncError("Webinar is unlisted but still publicly visible", "WEBSITE_MISMATCH", true);
    return { status: "synced", message: "Webinar is unlisted; the website no longer shows it." };
  }
  if (!data) throw new SyncError("Webinar is not visible on the public website", "WEBSITE_NOT_VISIBLE", true);
  if (data.config_version > job.config_version) return { status: "superseded", message: "A newer version is live" };

  const mismatches = [
    data.title !== c.title && "title",
    data.webinar_date !== c.date && "date",
    String(data.webinar_time).slice(0, 5) !== c.start_time && "start_time",
    data.duration_minutes !== c.duration_minutes && "duration",
    data.timezone !== c.timezone && "timezone",
    (data.whatsapp_group_url ?? null) !== (c.whatsapp_url ?? null) && "whatsapp_url",
    (data.registration_page_url ?? null) !== (c.registration_url ?? null) && "registration_url",
  ].filter(Boolean);
  if (mismatches.length) {
    throw new SyncError(`Public website shows different values for: ${mismatches.join(", ")}`, "WEBSITE_MISMATCH", true);
  }
  return {
    status: "synced",
    message: "Public webinar pages read the published record; read-back verified.",
    response: { verified_version: data.config_version },
  };
}

// ---------------------------------------------------------------------------
// Destination: Google Sheets (upsert one row per webinar_id; never append duplicates)
// ---------------------------------------------------------------------------
const SHEET_HEADER = [
  "webinar_id", "config_version", "coach_id", "title", "date", "start_time", "end_time", "timezone",
  "start_at_utc", "webinar_url", "webinar_url_status", "whatsapp_url", "registration_url", "is_published", "published_at",
];

function base64url(input: Uint8Array): string {
  let s = "";
  for (const b of input) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function googleAccessToken(sa: { client_email: string; private_key: string; token_uri?: string }, scope: string) {
  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const unsigned = `${base64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))}.${
    base64url(enc.encode(JSON.stringify({ iss: sa.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 })))
  }`;
  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (ch) => ch.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned));
  const resp = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(new Uint8Array(sig))}`,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new SyncError(`Google auth failed (${resp.status}): ${data.error_description ?? data.error ?? "unknown"}`, "SHEETS_AUTH", httpTransient(resp.status));
  }
  return data.access_token as string;
}

function sheetRow(job: SyncJob): string[] {
  const e = eventPayload(job, "");
  return [
    e.webinar_id, String(e.config_version), e.coach_id, e.title, e.date, e.start_time, e.end_time, e.timezone,
    e.start_at_utc ?? "", e.webinar_url ?? "", e.webinar_url_status ?? "", e.whatsapp_url ?? "", e.registration_url ?? "",
    e.is_published ? "TRUE" : "FALSE", e.published_at ?? "",
  ];
}

// Alternative to a service account: a Google Apps Script web app owned by the sheet
// owner (see docs/webinar-sheet-sync.gs). It performs the same upsert-by-webinar_id
// with a version check, under a script lock.
async function syncGoogleSheetsViaWebApp(job: SyncJob, url: string, token: string): Promise<Outcome> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, action: "upsert", header: SHEET_HEADER, row: sheetRow(job), version: job.config_version }),
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    throw new SyncError(`Sheets web app unreachable: ${(e as Error).message}`, "SHEETS_WEBAPP_NETWORK", true);
  }
  const text = await resp.text();
  let data: Json = null;
  try {
    data = JSON.parse(text);
  } catch {
    // A non-JSON page usually means the web app is not deployed for "Anyone" access.
    throw new SyncError(`Sheets web app returned HTTP ${resp.status} without JSON. Check it is deployed with access "Anyone".`, "SHEETS_WEBAPP_RESPONSE", httpTransient(resp.status));
  }
  if (!resp.ok || !data?.ok) {
    const permanent = data?.code === "UNAUTHORIZED" || data?.code === "BAD_REQUEST";
    throw new SyncError(`Sheets web app error: ${data?.error ?? resp.status}`, `SHEETS_WEBAPP_${data?.code ?? resp.status}`, !permanent);
  }
  if (data.superseded) return { status: "superseded", message: `Sheet already holds version ${data.sheet_version}` };
  return {
    status: "synced",
    message: data.mode === "update" ? `Updated existing row ${data.row}` : `Added row ${data.row} for this webinar`,
    response: { row: data.row, mode: data.mode, via: "apps_script" },
  };
}

async function syncGoogleSheets(job: SyncJob): Promise<Outcome> {
  const sheetId = Deno.env.get("WEBINAR_SYNC_SHEET_ID");
  const saRaw = Deno.env.get("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON") ?? Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON");
  const webAppUrl = Deno.env.get("WEBINAR_SYNC_SHEETS_WEBAPP_URL");
  const webAppToken = Deno.env.get("WEBINAR_SYNC_SHEETS_WEBAPP_TOKEN");
  if (!saRaw && webAppUrl && webAppToken) return syncGoogleSheetsViaWebApp(job, webAppUrl, webAppToken);
  const missing = [!sheetId && "WEBINAR_SYNC_SHEET_ID", !saRaw && "GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON (or WEBINAR_SYNC_SHEETS_WEBAPP_URL + _TOKEN)"].filter(Boolean);
  if (missing.length) {
    return { status: "skipped", code: "NOT_CONFIGURED", message: `Google Sheets not configured. Missing secret(s): ${missing.join(", ")}` };
  }
  let sa: { client_email: string; private_key: string; token_uri?: string };
  try {
    sa = JSON.parse(saRaw!);
  } catch {
    throw new SyncError("Service account secret is not valid JSON", "SHEETS_CONFIG", false);
  }
  const tab = Deno.env.get("WEBINAR_SYNC_SHEET_TAB") || "Webinars";
  const quotedTab = `'${tab.replace(/'/g, "''")}'`;
  const token = await googleAccessToken(sa, "https://www.googleapis.com/auth/spreadsheets");
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId!)}/values`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const sheetsCall = async (url: string, init?: RequestInit) => {
    const resp = await fetch(url, { ...init, headers });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = data?.error?.message ?? resp.statusText;
      const hint = resp.status === 403 || resp.status === 404
        ? ` Share the spreadsheet with ${sa.client_email} as Editor and check WEBINAR_SYNC_SHEET_ID / WEBINAR_SYNC_SHEET_TAB.`
        : "";
      throw new SyncError(`Google Sheets error ${resp.status}: ${msg}.${hint}`, `SHEETS_HTTP_${resp.status}`, httpTransient(resp.status));
    }
    return data;
  };

  const existing = await sheetsCall(`${base}/${encodeURIComponent(`${quotedTab}!A:B`)}`);
  const rows: string[][] = existing.values ?? [];

  if (rows.length === 0) {
    await sheetsCall(`${base}/${encodeURIComponent(`${quotedTab}!A1`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [SHEET_HEADER] }),
    });
  }

  const row = sheetRow(job);
  const lastCol = String.fromCharCode("A".charCodeAt(0) + SHEET_HEADER.length - 1);

  const index = rows.findIndex((r, i) => i > 0 && r[0] === job.webinar_id);
  if (index > 0) {
    const sheetVersion = Number(rows[index][1]);
    if (Number.isFinite(sheetVersion) && sheetVersion > job.config_version) {
      return { status: "superseded", message: `Sheet already holds version ${sheetVersion}` };
    }
    const rowNo = index + 1;
    await sheetsCall(`${base}/${encodeURIComponent(`${quotedTab}!A${rowNo}:${lastCol}${rowNo}`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [row] }),
    });
    return { status: "synced", message: `Updated existing row ${rowNo}`, response: { row: rowNo, mode: "update" } };
  }

  const appended = await sheetsCall(
    `${base}/${encodeURIComponent(`${quotedTab}!A:${lastCol}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
  return { status: "synced", message: "Added row for this webinar", response: { range: appended?.updates?.updatedRange, mode: "append" } };
}

// ---------------------------------------------------------------------------
// Destination: workflow webhooks (n8n / Zapier / Make / custom)
// ---------------------------------------------------------------------------
async function syncWebhooks(job: SyncJob, supabaseUrl: string): Promise<Outcome> {
  const urls = (Deno.env.get("WEBINAR_SYNC_WEBHOOK_URLS") ?? "").split(",").map((u) => u.trim()).filter(Boolean);
  if (!urls.length) {
    return { status: "skipped", code: "NOT_CONFIGURED", message: "No workflow webhook configured. Set the WEBINAR_SYNC_WEBHOOK_URLS secret." };
  }
  const secret = Deno.env.get("WEBINAR_SYNC_WEBHOOK_SECRET");
  const body = JSON.stringify(eventPayload(job, supabaseUrl));
  const signature = secret ? await sha256Hex(body, secret) : null;

  // Endpoints that already acknowledged this exact event are not called again on retry.
  const acked: string[] = [...(job.response?.acked ?? [])];
  const results: Json[] = [];
  let transientFailure: SyncError | null = null;
  let permanentFailure: SyncError | null = null;

  for (const url of urls) {
    const urlId = (await sha256Hex(url)).slice(0, 16);
    let host = "invalid-url";
    try {
      const parsed = new URL(url);
      host = parsed.host;
      if (parsed.protocol !== "https:") throw new Error("not https");
    } catch {
      permanentFailure = new SyncError(`Webhook URL for ${host} must be a valid https:// URL`, "WEBHOOK_CONFIG", false);
      results.push({ host, ok: false, error: "invalid url" });
      continue;
    }
    if (acked.includes(urlId)) {
      results.push({ host, ok: true, already_acknowledged: true });
      continue;
    }
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": job.idempotency_key,
          "X-Webinar-Event": "webinar.config.published",
          "X-Webinar-Id": job.webinar_id,
          "X-Webinar-Version": String(job.config_version),
          ...(signature ? { "X-Webinar-Signature": `sha256=${signature}` } : {}),
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      if (resp.ok) {
        acked.push(urlId);
        results.push({ host, ok: true, status: resp.status });
      } else {
        const err = new SyncError(`Webhook ${host} responded ${resp.status}`, `WEBHOOK_HTTP_${resp.status}`, httpTransient(resp.status));
        if (err.transient) transientFailure = err;
        else permanentFailure = err;
        results.push({ host, ok: false, status: resp.status });
      }
    } catch (e) {
      transientFailure = new SyncError(`Webhook ${host} unreachable: ${(e as Error).message}`, "WEBHOOK_NETWORK", true);
      results.push({ host, ok: false, error: "network" });
    }
  }

  const response = { acked, results, signed: !!signature };
  const failure = permanentFailure ?? transientFailure;
  if (failure) {
    failure.response = response;
    throw failure;
  }
  return { status: "synced", message: `Delivered to ${urls.length} webhook endpoint(s)`, response };
}

// ---------------------------------------------------------------------------
// Destination: reminders (send-webinar-reminders reads the live webinars row; on a
// schedule change, re-arm reminders whose send window has not passed yet)
// ---------------------------------------------------------------------------
async function syncReminders(job: SyncJob, db: SupabaseClient): Promise<Outcome> {
  const cur = job.payload;
  const prev = job.previous_config;
  if (!prev) {
    return { status: "skipped", code: "NO_CHANGE", message: "First managed version; reminders already follow the webinar record." };
  }
  if (prev.start_at_utc === cur.start_at_utc) {
    return { status: "skipped", code: "NO_CHANGE", message: "Schedule unchanged; reminders unaffected." };
  }
  if (!cur.start_at_utc) throw new SyncError("Cannot compute start time (invalid timezone)", "REMINDER_TZ", false);

  const start = new Date(cur.start_at_utc).getTime();
  const now = Date.now();
  if (start <= now) return { status: "skipped", code: "IN_PAST", message: "New start time has already passed." };

  // Must match the windows used by send-webinar-reminders.
  const resets: Record<string, boolean> = {};
  if (now < start - 2 * 3600_000) resets.reminder_24h_sent = false;
  if (now < start - 15 * 60_000) resets.reminder_1h_sent = false;
  resets.reminder_10m_sent = false;

  const { data, error } = await db
    .from("webinar_registrations")
    .update(resets)
    .eq("webinar_id", job.webinar_id)
    .select("id");
  if (error) throw new SyncError(`Could not reschedule reminders: ${error.message}`, "REMINDER_DB", true);

  return {
    status: "synced",
    message: `Reminders rescheduled for ${data?.length ?? 0} registration(s) to the new start time (${Object.keys(resets).join(", ")} re-armed).`,
    response: { registrations: data?.length ?? 0, rearmed: Object.keys(resets) },
  };
}

function syncWhatsApp(): Outcome {
  return {
    status: "skipped",
    code: "UNSUPPORTED",
    message:
      "No outbound WhatsApp API is connected (WhatsApp access uses provider portal credentials). Already-sent messages cannot be edited; new messages and workflows should read get_webinar_published_config.",
  };
}

function syncCalendar(job: SyncJob): Outcome {
  const eventId = job.payload?.calendar_details?.event_id;
  return {
    status: "skipped",
    code: "UNSUPPORTED",
    message: eventId
      ? `Calendar event ${eventId} was not updated: no calendar API credentials are configured. Add-to-calendar links use the published time.`
      : "No calendar API integration is configured. Add-to-calendar links in emails and on the website use the published time.",
  };
}

// ---------------------------------------------------------------------------

async function processJob(job: SyncJob, db: SupabaseClient, anon: SupabaseClient, supabaseUrl: string, worker: string) {
  const startedAt = new Date().toISOString();
  let outcome: Outcome | null = null;
  let failure: SyncError | null = null;

  const { data: current } = await db.from("webinars").select("config_version").eq("id", job.webinar_id).maybeSingle();
  if (!current || current.config_version > job.config_version) {
    outcome = { status: "superseded", message: current ? `Superseded by version ${current.config_version}` : "Webinar deleted" };
  } else {
    try {
      switch (job.destination) {
        case "website": outcome = await syncWebsite(job, anon); break;
        case "google_sheets": outcome = await syncGoogleSheets(job); break;
        case "webhooks": outcome = await syncWebhooks(job, supabaseUrl); break;
        case "reminders": outcome = await syncReminders(job, db); break;
        case "whatsapp": outcome = syncWhatsApp(); break;
        case "calendar": outcome = syncCalendar(job); break;
      }
    } catch (e) {
      failure = e instanceof SyncError ? e : new SyncError((e as Error).message ?? "Unknown error", "UNEXPECTED", true);
    }
  }

  const logEntry = {
    at: startedAt,
    attempt: job.attempts,
    worker,
    outcome: failure ? "error" : outcome!.status,
    message: failure ? failure.message : outcome!.message,
    code: failure?.code,
  };
  const attemptLog = [...(job.attempt_log ?? []), logEntry].slice(-20);
  const now = new Date();
  // deno-lint-ignore no-explicit-any
  let update: Record<string, any>;

  if (failure) {
    const retry = failure.transient && job.attempts < job.max_attempts;
    const backoffMin = Math.min(2 ** Math.max(0, job.attempts - 1), MAX_BACKOFF_MIN);
    update = {
      status: retry ? "pending" : "failed",
      next_attempt_at: retry ? new Date(now.getTime() + backoffMin * 60_000).toISOString() : now.toISOString(),
      last_error: failure.message.slice(0, 1000),
      last_error_code: failure.code,
      response: failure.response ?? job.response,
    };
  } else {
    update = {
      status: outcome!.status,
      last_error: outcome!.status === "synced" ? null : outcome!.message,
      last_error_code: outcome!.status === "skipped" ? (outcome as { code: string }).code : null,
      response: "response" in outcome! ? outcome!.response ?? null : job.response,
      acknowledged_at: outcome!.status === "synced" ? now.toISOString() : null,
    };
  }

  // Only write back if we still own the lock (a reclaimed job must not be overwritten).
  const { error } = await db
    .from("webinar_sync_jobs")
    .update({ ...update, attempt_log: attemptLog, locked_at: null, locked_by: null, updated_at: now.toISOString() })
    .eq("id", job.id)
    .eq("status", "processing")
    .eq("locked_by", worker);
  if (error) console.error(`[webinar-sync-processor] could not record result for job ${job.id}`, error);

  return { id: job.id, destination: job.destination, version: job.config_version, status: update.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ ok: false, error: "Server misconfigured" }, 500);

  const db = createClient(supabaseUrl, serviceKey);

  // Auth: cron secret, the service role key (internal call), or an admin JWT.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  let authorized = (!!cronSecret && req.headers.get("x-cron-secret") === cronSecret) || (!!bearer && bearer === serviceKey);
  if (!authorized && bearer) {
    const { data: u } = await db.auth.getUser(bearer);
    if (u?.user?.id) {
      const { data: isAdmin } = await db.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      authorized = !!isAdmin;
    }
  }
  if (!authorized) return json({ ok: false, error: "Unauthorized" }, 401);

  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const webinarId = typeof body?.webinar_id === "string" ? body.webinar_id : null;
  const worker = `wsp-${crypto.randomUUID().slice(0, 8)}`;
  const deadline = Date.now() + TIME_BUDGET_MS;
  const processed: Json[] = [];

  while (Date.now() < deadline) {
    const { data: jobs, error } = await db.rpc("wm_claim_sync_jobs", { _worker: worker, _limit: 10, _webinar_id: webinarId });
    if (error) {
      console.error("[webinar-sync-processor] claim failed", error);
      return json({ ok: false, error: "Could not claim jobs", processed }, 500);
    }
    if (!jobs?.length) break;
    // Different destinations are independent; run them concurrently.
    processed.push(...await Promise.all((jobs as SyncJob[]).map((j) => processJob(j, db, anon, supabaseUrl, worker))));
  }

  return json({ ok: true, processed });
});
