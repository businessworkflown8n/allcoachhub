# Webinar Management & Centralized Synchronization

Additive feature on the existing Supabase project (`fwtmgvszacuebhxnshct`). No Lovable Cloud, no new database, no duplicate webinar records.

## How it works

```
Coach (Manage Webinar) ──► webinar-management edge fn ──► wm_save_draft / wm_publish_config (SQL, service_role only)
                                                              │  ownership · permissions · coach approval · validation · version check
                                                              ▼
                                         public.webinars  (authoritative published config, config_version++)
                                                              │  AFTER UPDATE trigger, same transaction
                                                              ▼
                              webinar_config_versions (history)  +  webinar_sync_jobs (outbox, 1 row per destination)
                                                              │
                         webinar-sync-processor (kicked after publish + pg_cron every minute)
                                                              ▼
              website read-back · Google Sheets upsert · workflow webhooks · reminders · WhatsApp · calendar
```

- **Drafts** live in `webinar_config_drafts` and never touch `webinars`, so the website and integrations only ever see published values.
- **Concurrency**: publish requires the expected `config_version` and draft `revision`; a draft started from an older version cannot be published (`WM_STALE_DRAFT`).
- **Ordering**: when a new version is published, older pending/failed jobs become `superseded`. The processor re-checks the live version before acting, and only one job per webinar and destination can be `processing` at a time. The Sheets row also stores the version and is never overwritten by an older one.
- **Idempotency**: `idempotency_key = <webinar_id>:v<version>:<destination>` is unique. Webhook bodies are deterministic and carry the same `Idempotency-Key` on every retry. Endpoints that already acknowledged are not called again, and Sheets updates the row matching `webinar_id` instead of appending.
- **Retries**: transient errors (network, 408/429/5xx) back off 1, 2, 4, 8, 16 minutes, then the job is `failed`. Admins can retry the latest version from the monitor.
- **Statuses**: `pending`, `processing`, `synced` (destination acknowledged or read-back verified), `failed`, `skipped` (shown as "Not applied": not configured, unsupported, or nothing to change), `superseded`. The UI never counts `skipped` as synced.

## Existing pieces reused

| Need | Reused |
|---|---|
| Per-coach permissions | `coach_feature_flags` (7 new boolean columns), same toggle pattern as Coach Feature Approval |
| Permission audit | `feature_control_audit` (`feature_key = 'webinar_management'`) |
| Publish / retry audit | `activity_logs` (`webinar_config_published`, `webinar_sync_retry`) |
| Coach approval | `coach_feature_flags.status = 'approved'` is required to publish (unchanged workflow) |
| Join-link approval | `webinars.webinar_link_status`: a changed joining URL is reset to `pending` and goes through the existing Admin → Webinars approval |
| Webinar record | `webinars` (extended), `webinar_registrations` (untouched apart from re-arming reminder flags) |
| Reminders | `send-webinar-reminders` cron (now timezone-aware) |
| Google auth | Service-account JWT pattern from `submit-indexing` |
| Cron auth | `CRON_SECRET` / `x-cron-secret` pattern from `inactive-user-reminder` |

## Database migration

`supabase/migrations/20261021120000_webinar_management_sync.sql`

- `coach_feature_flags`: `webinar_mgmt_access`, `webinar_mgmt_edit_schedule`, `webinar_mgmt_edit_join_url`, `webinar_mgmt_edit_whatsapp_url`, `webinar_mgmt_edit_registration_url`, `webinar_mgmt_publish`, `webinar_mgmt_view_sync`. All default `false`, and every permission also requires `access`.
- `webinars`: `whatsapp_group_url`, `registration_page_url`, `calendar_details`, `config_version`, `config_published_at`, `config_updated_by`.
- New tables (RLS on, read-only from the client): `webinar_config_drafts`, `webinar_config_versions`, `webinar_sync_jobs`.
  - Coaches can read their own drafts and versions with `access`, and their own jobs with `view_sync`. Admins can read everything. Clients can't insert, update or delete.
- Triggers on `webinars`:
  - Clients cannot set the version columns.
  - On a **managed** webinar (`config_version > 0`), non-admin direct edits to the title, schedule, links or link status are rejected (`WM_MANAGED`). This closes the bypass through the old "My Webinars" editor or the REST API.
  - Admin edits, link approvals and visibility changes become new versions and are synced.
  - Webinars never published through Manage Webinar (`config_version = 0`) behave exactly as before.
- Functions:
  - `wm_save_draft`, `wm_discard_draft`, `wm_publish_config`, `wm_claim_sync_jobs`: service role only.
  - `wm_retry_sync_job`: checks for admin.
  - `get_webinar_published_config`: public-safe and never returns the joining URL. Workflows and WhatsApp templates use it to read the latest values.

## Edge functions

| Function | Status | Notes |
|---|---|---|
| `webinar-management` | new | Actions `list`, `save_draft`, `discard_draft`, `publish`, `retry`. The coach id always comes from the verified JWT |
| `webinar-sync-processor` | new | `verify_jwt = false`. Accepts `x-cron-secret`, the service-role key, or an admin JWT |
| `send-webinar-reminders` | changed | Computes the start time in the webinar's timezone (it previously read the time as UTC) and shows the timezone |
| `send-webinar-confirmation` | changed | Google Calendar link uses the real UTC start and the email shows the timezone |
| `_shared/webinarTime.ts` | new | IANA timezone → UTC conversion |

## Frontend

- Coach: **Manage Webinar** (`/coach/manage-webinar`), shown only with `webinar_mgmt_access` — `src/components/coach/CoachManageWebinar.tsx`.
- Admin: **Webinar Management** (`/admin/webinar-management`), with a *Permissions* tab ("Webinar Management Permissions") and a *Sync monitor* tab — `src/components/admin/AdminWebinarManagement.tsx`.
- Public `/webinars`:
  - Live and upcoming status uses the webinar's timezone.
  - The timezone is shown on cards.
  - Registered learners get "Add to calendar" and "Join WhatsApp group" links.
- No hardcoded webinar dates or URLs were found on the site. Public pages already read the `webinars` table, so publishing updates them directly.

## Setup

1. Apply the migration (SQL editor or `supabase db push`).
2. Deploy the functions:
   ```bash
   supabase functions deploy webinar-management webinar-sync-processor send-webinar-reminders send-webinar-confirmation --project-ref fwtmgvszacuebhxnshct
   ```
3. Schedule the retry worker. This reuses the existing `CRON_SECRET` value, stored in Vault:
   ```sql
   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'webinar_sync_cron_secret');
   select cron.schedule('webinar-sync-processor', '* * * * *', $$
     select net.http_post(
       url := 'https://fwtmgvszacuebhxnshct.supabase.co/functions/v1/webinar-sync-processor',
       headers := jsonb_build_object('Content-Type', 'application/json',
         'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'webinar_sync_cron_secret')),
       body := '{}'::jsonb, timeout_milliseconds := 60000);
   $$);
   ```
4. Optional destinations (Edge Function secrets). Without them the destination is reported as "Not applied", never as synced:

   | Destination | Secrets |
   |---|---|
   | Google Sheets | `WEBINAR_SYNC_SHEET_ID`, `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` (falls back to `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON`), optional `WEBINAR_SYNC_SHEET_TAB` (default `Webinars`). Share the sheet with the service account's `client_email` as Editor and enable the Sheets API in its Google Cloud project. |
   | Google Sheets without a key (in use) | `WEBINAR_SYNC_SHEETS_WEBAPP_URL` + `WEBINAR_SYNC_SHEETS_WEBAPP_TOKEN`: an Apps Script web app owned by the sheet owner (`docs/webinar-sheet-sync.gs`, deployed as Execute as: Me / Access: Anyone). Used when no service-account JSON is set. Sync sheet: https://docs.google.com/spreadsheets/d/10GXTSodwqTOW6Ov3uZDJGCsZFykQ3u7eTcPXlZW8J1Q |
| Workflows (n8n / Zapier / Make) | `WEBINAR_SYNC_WEBHOOK_URLS` (comma-separated https URLs), `WEBINAR_SYNC_WEBHOOK_SECRET` (HMAC-SHA256 of the body in `X-Webinar-Signature: sha256=…`). Dedupe on `Idempotency-Key` / `event_id`. |

5. Grant permissions under Admin → Webinar Management → Permissions.

### Webhook payload

```json
{
  "event": "webinar.config.published",
  "event_id": "<webinar_id>:v3:webhooks",
  "webinar_id": "…", "config_version": 3, "coach_id": "…",
  "title": "…", "date": "2026-11-05", "start_time": "18:00", "end_time": "19:30", "duration_minutes": 90,
  "timezone": "Asia/Kolkata", "start_at_utc": "2026-11-05T12:30:00Z", "end_at_utc": "2026-11-05T14:00:00Z",
  "webinar_url": "https://… (null until the link is admin-approved)", "webinar_url_status": "approved",
  "whatsapp_url": "…", "registration_url": "…", "is_published": true, "published_at": "…",
  "previous": { "date": "…", "start_time": "…", "timezone": "…", "start_at_utc": "…" },
  "latest_config_endpoint": "https://fwtmgvszacuebhxnshct.supabase.co/rest/v1/rpc/get_webinar_published_config"
}
```

Downstream workflows should treat `config_version` as monotonic and ignore events older than the last one they processed.

## Testing

- `src/lib/webinarManagement.test.ts` (Vitest) covers timezone conversion including DST and the date line, validation, field→permission mapping, change detection, the calendar link, and the sync-state rollup. Run it with `npm test`.
- `supabase/tests/webinar_management_checks.sql` covers ownership, field permissions, immediate revocation, approval gating, link re-approval, optimistic concurrency, superseding, claim serialisation, idempotency, the legacy-editor guard, retry authorization, RLS isolation, and preservation of registrations. Paste it into the SQL editor after the migration. It runs in one transaction and rolls back.

## Limitations

- **WhatsApp**: there is no outbound WhatsApp API in the project. WhatsApp access is provider-portal credentials only, and `funnel-processor` marks WhatsApp as not configured. The destination is always "Not applied". Sent messages cannot be edited, and new messages and workflows should read `get_webinar_published_config`.
- **Calendar**: there is no calendar API integration or stored OAuth for calendars. Provider and event id are stored but not pushed. Add-to-calendar links use the published time.
- **Reminders**: `send-webinar-reminders` reads the live record, so obsolete times can never be sent. On a schedule change, reminders whose send window is still ahead are re-armed. A reminder that was already delivered for the old time cannot be recalled.
- **Legacy editor**: "My Webinars" still edits unmanaged webinars as before. For managed ones it gets a clear error for schedule, title or link changes. Separately, the existing `webinars` RLS lets a coach set `webinar_link_status` on **unmanaged** webinars (self-approval). This is pre-existing and left unchanged to avoid altering current behaviour; it is worth a follow-up.
