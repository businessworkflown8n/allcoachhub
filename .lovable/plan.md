# Google Drive Storage Integration — Build Plan

Parallel track alongside the in-progress WhatsApp module. Reuses your existing Google OAuth client (you'll add Drive scopes in Google Cloud Console).

## Prerequisite (you do this once, manually)

In Google Cloud Console for the project that owns `GOOGLE_CLIENT_ID`:
1. **Enable Drive API** (APIs & Services → Library → Google Drive API → Enable)
2. **OAuth consent screen → Scopes → Add**:
   - `https://www.googleapis.com/auth/drive.file` (per-file access, lightest scope)
   - `https://www.googleapis.com/auth/drive.metadata.readonly` (for storage stats)
3. **Credentials → OAuth Client → Authorized redirect URIs → Add**:
   - `https://www.aicoachportal.com/oauth/google-drive/callback`
   - `https://aicoachportal.com/oauth/google-drive/callback`
   - `https://allcoachhub.lovable.app/oauth/google-drive/callback`

If consent screen is in "Testing" mode, add the connecting coaches as test users until you publish it.

## Phase 1 — Database (1 migration)

Tables (all RLS = coach owns own rows + admin sees all):
- `drive_connections` — `coach_id` (unique), `google_account_email`, `access_token` (encrypted via pgsodium? — store plain in DB protected by RLS), `refresh_token`, `expires_at`, `scope`, `root_folder_id`, `subfolder_ids` jsonb, `status` (connected/expired/revoked), `connected_at`, `last_sync_at`, `quota_total`, `quota_used`
- `drive_files` — `coach_id`, `drive_file_id`, `name`, `mime_type`, `size_bytes`, `parent_folder_id`, `web_view_link`, `web_content_link`, `thumbnail_link`, `course_id` nullable, `lesson_id` nullable, `category` (course/recording/pdf/assignment/student_upload/archived), `visibility` (private/students/public/restricted), `ai_tags` text[], `ai_summary` text, `transcript` text, `uploaded_at`, `last_synced_at`
- `drive_access_settings` — global admin flags: `is_enabled`, `max_upload_size_mb`, `allowed_mime_types` text[], `require_admin_approval`
- `drive_coach_overrides` — `coach_id`, `is_suspended`, `is_approved`, `approved_at`, `approved_by`, `notes`
- `drive_activity_log` — `coach_id`, `learner_id`, `file_id`, `action` (upload/download/stream/share/delete), `metadata` jsonb, `created_at`
- Helper RPC: `drive_get_or_create_folder_structure(_coach_id)` (server-side after OAuth)

Seed: 1 row in `drive_access_settings` with defaults (enabled, 500MB max, common mime allowlist).

## Phase 2 — Edge Functions

- `drive-oauth-start` → builds Google OAuth URL with state=coach_id, returns to client
- `drive-oauth-callback` → exchanges code for tokens, stores in `drive_connections`, triggers folder bootstrap
- `drive-refresh-token` → called by other functions when access token expired
- `drive-create-folders` → creates "AI Coach Portal" root + 6 subfolders, saves IDs
- `drive-list-files` → proxied folder listing with pagination
- `drive-upload-init` → returns resumable upload session URL so browser uploads directly to Drive (no server bandwidth)
- `drive-file-register` → after browser upload completes, registers file in `drive_files`, runs AI tagging
- `drive-file-delete` → deletes from Drive + DB
- `drive-storage-stats` → about.get → quota numbers
- `drive-ai-process` → Lovable AI (gemini-2.5-flash) — auto-tag + PDF summary + (Phase 2.5) video transcript via Gemini multimodal
- `drive-share-toggle` → flips file permission (private ↔ anyone-with-link)
- `drive-disconnect` → revokes token, marks status=revoked

All Deno std 0.190.0, manual corsHeaders, JWT verify on protected ones.

## Phase 3 — Coach Dashboard UI (`/coach/drive`)

- `DriveConnectionCard` — Connect / Reconnect / Disconnect, status pill, account email
- `StorageDashboard` — animated radial usage card, total/used/remaining, file-type breakdown bar chart, recent uploads list, largest-files list, last sync time
- `FolderBrowser` — left tree (6 standard folders), right grid with thumbnails, breadcrumbs
- `FileCard` — thumbnail, name, size, AI tags, visibility chip, kebab menu (rename/share/delete/AI-summary)
- `UploadDropzone` — drag & drop + bulk, chunked resumable upload to Drive directly, per-file progress bars, mime/size validation against admin settings
- `DrivePickerModal` — reused inside course lesson editor: "Upload from Google Drive" source option
- `FilePreviewModal` — Drive embed iframe for video/PDF/image, AI summary tab, transcript tab
- `PermissionsPanel` — private / student-only / stream-only / public-link / restricted-by-course
- `AISearchBar` — semantic search across `ai_tags` + `ai_summary` + name (Postgres ILIKE first, AI rerank optional)

## Phase 4 — Admin Panel (new "Drive Storage" tab in `AdminDashboard`)

- Global toggle, max upload size, allowed mime types
- Connected coaches table with quota usage, suspend, approve, view files
- Storage analytics chart (total usage across all coaches)
- Activity log viewer

## Phase 5 — Learner Experience

- Course lesson player reads `drive_file_id` → embeds `https://drive.google.com/file/d/{id}/preview` (streaming, resume supported by Drive)
- Download button only if file `visibility` allows
- File preview cards in course resources tab

## Phase 6 — Notifications

Reuse existing notification system to push:
- Storage > 90% used
- Upload complete
- Sync failed / Drive disconnected (token revoked)
- AI processing complete (transcript/summary ready)

## What I'm NOT building (and why)

- **Virus scanning** — needs ClamAV server or VirusTotal API (paid). Out of stack. Drive already scans uploads server-side.
- **FFmpeg transcoding / CDN** — Drive's `/preview` endpoint handles adaptive streaming natively. No need.
- **Elasticsearch** — overkill; Postgres FTS + AI tags is sufficient at this scale.
- **OneDrive / Dropbox / S3** — schema is provider-agnostic (`drive_connections.provider` defaulting to 'google_drive') so adding later is a new edge function + UI tab, not a rewrite.
- **Firebase/Auth0/BullMQ/NestJS** — not your stack. Using Supabase auth + Edge Functions + Postgres.

## File count estimate

- 1 migration
- 12 edge functions
- ~18 React files (pages, components, hooks)
- 2 small admin tab additions

**Total: ~33 files.** I'll batch them in parallel writes.

## Risks

- Google OAuth consent screen verification: if you have >100 users connecting, Google requires verification for sensitive Drive scopes. `drive.file` is **non-sensitive** so this is avoided as long as we stick to that scope. We'll create files in coach's Drive but won't read files we didn't create.
- Token refresh: refresh tokens can be invalidated if user revokes from Google account. We handle 401 → mark `status=expired` → prompt reconnect.
- Per-coach quota limits are the **coach's own Drive** (15GB free) — we just display it, can't expand it.

## Build order

1. You confirm prerequisite Google Cloud setup is done (or accept "I'll do it after").
2. Migration (Phase 1).
3. Edge functions (Phase 2) — batched.
4. Coach UI (Phase 3) — batched.
5. Admin UI (Phase 4) + Learner playback (Phase 5) + Notifications (Phase 6).
