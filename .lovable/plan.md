# Professional Certificate Template Library

Extend the existing `certificate_templates` table and `issue-certificate` flow into a full template library: a coach-facing gallery with previews/favorites/customization, an admin manager to seed and curate 30+ designs across 10 categories, and seamless attachment to Courses, Webinars, Workshops, Masterclasses, Challenges, Memberships, and Events.

## Scope

In scope
- Coach Dashboard → **Certificate Templates** section (gallery, preview, favorite, use, duplicate & customize).
- Customization editor (colors, fonts, border, background, logo/signature/QR positions, title, footer, watermark).
- Admin → **Template Manager** (CRUD, categories, premium flag, enable/disable, assign to coaches, set default, upload backgrounds).
- Seed library: 30+ templates spanning the 10 categories (Professional Corporate, AI Certification, Modern Minimal, Luxury, Education, Creative, Webinar Participation, Course Completion, Workshop, Premium Dark).
- Wire selected template into existing `issue-certificate` PDF rendering for all source types (course, webinar, workshop, masterclass, challenge, membership, event).
- Auto-populate all listed personalization fields (learner, coach, date, cert ID, QR, etc.).

Out of scope (defer)
- True 300 DPI vector PDF engine (current HTML-to-PDF renderer kept; design assets prepared print-ready).
- Drag-and-drop visual editor (form-based customization only this pass).
- Marketplace pricing / per-template billing.

## Data model (one migration)

Extend `certificate_templates`:
- `category` (enum: `corporate | ai | minimal | luxury | education | creative | webinar | course | workshop | dark`)
- `orientation` (`landscape | portrait`)
- `style_tags` (text[])
- `is_premium` (bool), `is_active` (bool), `is_system` (bool — seed templates)
- `preview_image_url`, `background_image_url`
- `design_config` (jsonb: colors, fonts, border, positions, watermark, title, footer)
- `supported_sources` (text[]: course, webinar, workshop, masterclass, challenge, membership, event)
- `created_by` (nullable — null for system templates)

New tables
- `coach_template_favorites` (coach_id, template_id) — RLS: coach owns rows.
- `coach_template_customizations` (coach_id, base_template_id, name, design_config, created_at) — duplicated/customized copies. RLS: coach owns.
- `coach_template_assignments` (admin grants premium templates to specific coaches) — RLS: admin write, coach read own.

Add to `courses`, `webinars`, `workshops` (and any other source tables that exist): `certificate_template_id` FK (nullable). If a source table lacks cert columns, add the same `cert_*` columns the webinars table already has.

All public tables get GRANTs + RLS (authenticated read for active system templates; coach r/w own customizations & favorites; admin full).

## Edge functions

- Extend `issue-certificate`: resolve template (course/webinar/etc. → `certificate_template_id` → merged `design_config` with coach customization overrides) → render PDF using template HTML + auto-populated fields.
- New `seed-certificate-templates` (admin-only): inserts the 30+ system templates with `design_config` + generated preview thumbnails (via Lovable AI image gen for AI/luxury backgrounds; static SVG for minimal/corporate).

## UI

Coach
- `src/pages/CoachCertificateTemplates.tsx` — gallery page with category tabs, orientation filter, search, favorites filter.
- `src/components/coach/templates/TemplateCard.tsx` — thumbnail, name, category, orientation, style tag, Preview / Use / Favorite / Duplicate buttons.
- `src/components/coach/templates/TemplatePreviewModal.tsx` — large preview with sample data.
- `src/components/coach/templates/TemplateCustomizeDialog.tsx` — form editor for `design_config`.
- `CoachCourseForm.tsx`, `CoachWebinars.tsx` (+ workshop forms if present) — add "Choose Template" picker in existing Certification settings.
- Add nav entry under `CoachDashboard.tsx`.

Admin
- `src/components/admin/AdminCertificateTemplateManager.tsx` — table with CRUD, premium/active toggles, category management, coach assignment dialog, background upload.
- Tab inside existing `AdminCertificateSettings.tsx`.

Learner
- No new UI; existing `LearnerCertificates.tsx` + share modal already render whatever PDF is produced.

## Files

New
- `supabase/migrations/<ts>_certificate_template_library.sql`
- `supabase/functions/seed-certificate-templates/index.ts`
- `src/pages/CoachCertificateTemplates.tsx`
- `src/components/coach/templates/TemplateCard.tsx`
- `src/components/coach/templates/TemplatePreviewModal.tsx`
- `src/components/coach/templates/TemplateCustomizeDialog.tsx`
- `src/components/coach/templates/TemplateGalleryFilters.tsx`
- `src/components/coach/templates/CertificateTemplatePicker.tsx` (reusable picker for course/webinar forms)
- `src/components/admin/AdminCertificateTemplateManager.tsx`
- `src/hooks/useCertificateTemplates.tsx`
- `src/lib/certificateRenderer.ts` (shared HTML renderer used by edge fn + preview)

Edited
- `supabase/functions/issue-certificate/index.ts` (template-aware rendering)
- `supabase/config.toml` (register seeder)
- `src/App.tsx` (route)
- `src/pages/CoachDashboard.tsx` (nav)
- `src/components/admin/AdminCertificateSettings.tsx` (manager tab)
- `src/components/coach/CoachCourseForm.tsx`, `src/components/coach/CoachWebinars.tsx` (template picker)
- `src/integrations/supabase/types.ts` (auto-regenerated after migration)

## Notes

- Seed thumbnails: generate ~10 AI-themed backgrounds via Lovable AI image gen during seeding, store under `certificate-backgrounds` bucket (create if missing); reuse across multiple templates with different overlays.
- Customization is per-coach: edits to a system template create a row in `coach_template_customizations` rather than mutating the system row.
- Permission gating reuses existing `coach_feature_flags` (`certificate_access` etc.) — no new feature flag this pass.
