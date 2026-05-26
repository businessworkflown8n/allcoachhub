# Supabase Backend Optimization Plan (Zero-Disruption)

This plan **audits and incrementally hardens** the existing Lovable Cloud (Supabase) backend without touching the UI, routes, or current user journeys. No tables will be renamed or dropped. All work is additive, reversible, and rolled out in safe phases.

---

## Phase 0 — Audit (read-only, no changes)

Goal: produce a current-state snapshot before any change.

1. Run `supabase--linter` → list RLS gaps, function search_path issues, missing indexes.
2. Run `security--run_security_scan` → exposed data, weak policies.
3. Run `supabase--db_health` → connection / disk / WAL pressure.
4. `read_query` snapshots:
   - Tables without RLS enabled
   - Tables with RLS but zero policies
   - FK coverage (`information_schema.table_constraints`)
   - Orphan rows (e.g. `profiles.user_id` missing in `auth.users`)
   - Largest tables + missing indexes on common filter columns (`user_id`, `coach_id`, `course_id`, `created_at`)
   - Storage buckets + public/private status + policies

Deliverable: `docs/backend-audit.md` (committed, human-readable).

---

## Phase 1 — Safety Net (no schema changes)

1. **Service layer scaffold** (compatibility middleware) — additive only.
   Create `src/services/` wrappers around existing tables. Components keep importing `@/integrations/supabase/client` as today; new code uses services. No existing imports change.
   ```
   src/services/
     auth.service.ts
     profile.service.ts
     course.service.ts
     enrollment.service.ts
     webinar.service.ts
     lead.service.ts
     payment.service.ts
     storage.service.ts
     notification.service.ts
     activity.service.ts
   ```
   Each exports thin, typed functions (`list`, `getById`, `create`, `update`) that call the existing client. Centralized error handling + retry + logging.

2. **Error + fallback utility** `src/lib/safeQuery.ts` — wraps Supabase calls with try/catch, toast hook, and structured logging. Service layer uses it; components opt in over time.

---

## Phase 2 — RLS & Permissions Hardening (additive policies only)

Rule: **add or tighten policies — never remove a working one in the same migration.**

Per linter findings, for each flagged table:
- Ensure `ALTER TABLE … ENABLE ROW LEVEL SECURITY`.
- Add missing role-scoped policies using existing `has_role(uuid, app_role)` (already in DB).
- Standard matrix:
  - **Admin** → full access via `has_role(auth.uid(),'admin')`.
  - **Coach** → own rows via `coach_id = auth.uid()` (+ enrolled-learner reads where needed).
  - **Learner** → own rows via `user_id = auth.uid()` or `learner_id = auth.uid()`.
- Activity / audit / payment tables → insert-only for owners, read for admin + owner.

Each policy added in its own migration with a clear `description` so it can be reverted individually.

---

## Phase 3 — Foreign Keys, Indexes, Integrity (non-breaking)

1. Add **missing FKs** with `ON DELETE CASCADE` or `SET NULL` only where data already satisfies them. For tables with orphans, clean orphans first via `supabase--insert`, then add FK.
2. Add **indexes** on hot filter columns identified in audit (`enrollments.learner_id`, `enrollments.course_id`, `payments.user_id`, `lesson_progress(learner_id,lesson_id)`, etc.) using `CREATE INDEX CONCURRENTLY` where possible.
3. Add `updated_at` triggers where missing (reuse existing `update_updated_at_column`).
4. Lock down function `search_path` on any function the linter flags.

No table renames. No column drops. No type changes on populated columns.

---

## Phase 4 — Storage Consolidation

Existing buckets: `logos`, `materials`, `course-content`, `certificates` (already in use — **untouched**).

Add only what's missing:
- `avatars` (public) — profile images, path `{user_id}/...`
- `webinar-assets` (public) — banners/recordings refs
- `student-uploads` (private) — assignment submissions, path `{user_id}/...`

Each new bucket gets RLS policies:
- Public buckets: public SELECT, authenticated INSERT/UPDATE/DELETE scoped to `(storage.foldername(name))[1] = auth.uid()::text`.
- Private buckets: owner-only + admin read.

Frontend continues using current buckets; new uploads can migrate gradually.

---

## Phase 5 — Auth Optimization (no flow change)

- Keep current signup/login UI and `/auth`, `/login/:role`, `/signup/:role` routes intact.
- Verify `handle_new_user` trigger still creates `profiles` + `user_roles` rows (already present).
- Enable HIBP password check via `supabase--configure_auth` (does not affect existing users).
- Confirm Google OAuth configured (already in use).
- Add a tiny `useSession` hook on top of existing `useAuth` only if needed by services — existing `useAuth` stays the source of truth.

---

## Phase 6 — Observability & Logs

- New table `public.activity_logs` (only if absent) for app-level events; insert via service layer. RLS: insert by authenticated user for self; read by admin.
- New table `public.automation_logs` for edge function runs; insert via service role only; read by admin.
- Both additive, no impact on existing flows.

---

## Backup & Rollback Strategy

- **Per migration**: every migration is small, single-purpose, with a one-line description so the user can revert via Lovable's history.
- **Data backup**: before Phase 3 cleanups, export affected tables with `read_query` to JSON stored under `/mnt/documents/backup-<date>/`.
- **Rollback**: each new policy/index/bucket has a documented inverse SQL kept in `docs/rollback/<migration-id>.sql` (manual apply if needed).
- **Lovable Cloud snapshots**: rely on managed PITR; no destructive ops scheduled.

---

## Production Deployment Checklist

Per phase:
- [ ] `supabase--linter` clean for touched tables
- [ ] `security--run_security_scan` no new criticals
- [ ] Smoke test: signup, login (learner/coach/admin), course enroll, payment record read, certificate view, file upload
- [ ] `db_health` stable
- [ ] No console/network errors on key routes (`/`, `/auth`, `/coach`, `/learner`, `/admin`)

---

## What Stays Untouched (stability first)

- All React components, pages, routes, hooks (`useAuth`, `useUserRole`, etc.)
- `src/integrations/supabase/client.ts` and `types.ts` (auto-generated)
- Existing buckets and their policies
- Existing edge functions and their `verify_jwt` settings
- Existing tables, columns, and working RLS policies
- Stripe / Razorpay / Resend / GA / GSC integrations

## What Gets Optimized

- Missing RLS policies + role coverage
- Missing FKs and indexes
- Function `search_path` hardening
- Service layer + error handling
- New storage buckets for avatars / webinar / student uploads
- Activity & automation logging
- HIBP password protection

## Migration Order (safest → most impactful)

1. Phase 0 audit (read-only)
2. Phase 1 service layer (frontend-compatible, no DB change)
3. Phase 2 RLS additive policies
4. Phase 3 FKs + indexes (after orphan cleanup)
5. Phase 4 new storage buckets
6. Phase 5 auth hardening (HIBP)
7. Phase 6 logging tables

## Delayed / Higher-Risk (not in this pass)

- Renaming any existing table/column
- Consolidating overlapping tables (e.g. multiple notification tables)
- Changing existing RLS semantics
- Migrating files between buckets

---

**Next step:** approve this plan, then I'll start with Phase 0 audit and post the findings before any DB write.
