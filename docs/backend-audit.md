# Backend Audit — Supabase (Lovable Cloud)

_Generated alongside the Backend Optimization Plan. Read-only snapshot._

## Summary

- **Tables**: ~150+ in `public` schema (existing, in use). No table renames or drops performed.
- **Linter**: 91 pre-existing WARN-level issues (mostly permissive RLS policies on legacy admin / public tables). Deliberately not rewritten in this pass to preserve current behavior. They are tracked for Phase 2 review.
- **Storage**: 4 existing buckets untouched (`logos`, `materials`, `course-content`, `certificates`). 3 new buckets added (`avatars`, `webinar-assets`, `student-uploads`) with strict folder-owner policies.
- **Auth**: `handle_new_user` trigger working; `profiles` + `user_roles` auto-created on signup. RBAC via `has_role(uuid, app_role)` security-definer function.
- **Health**: stable.

## Already configured correctly (do not touch)

- Auth signup/login flows + role-based redirect (`/coach`, `/learner`, `/admin`)
- `handle_new_user` trigger and `user_roles` table
- `has_role` security-definer function (recursion-safe)
- Existing buckets and their policies
- All edge functions and their `verify_jwt` config
- Stripe / Razorpay / Resend / GA / GSC integrations

## Optimized in this pass (additive, reversible)

| Area | Change |
| --- | --- |
| Storage | New `avatars`, `webinar-assets`, `student-uploads` buckets + folder-owner RLS |
| Logs | New `activity_logs` + `automation_logs` tables with RLS |
| Service layer | `src/services/*` typed wrappers + `src/lib/safeQuery.ts` |
| Auth | HIBP password protection enabled |

## Deferred for stability (Phase 2+, manual review required)

- Replacing legacy `USING (true)` policies on admin/public tables — risk of breaking working flows; needs per-table behavior review.
- Adding missing FKs on `daily_zip` tables (currently client-side map by design).
- Consolidating overlapping notification tables.
- Migrating files between buckets.

## Rollback

- Service layer files are net-new; deleting `src/services/` and `src/lib/safeQuery.ts` is non-breaking (no existing component imports them).
- New buckets can be removed via `DELETE FROM storage.buckets WHERE id IN ('avatars','webinar-assets','student-uploads')`.
- New log tables can be dropped via `DROP TABLE public.activity_logs, public.automation_logs CASCADE`.

## Production checklist

- [x] Linter run before + after migration (no new criticals)
- [x] Migration scoped to additive resources only
- [x] No frontend component touched
- [x] No existing RLS policy removed or altered
- [x] No existing bucket modified
