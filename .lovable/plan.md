# Webinar Certification & AI LinkedIn Sharing

Extend the existing certificate system (courses) to webinars, reusing the `issued_certificates`, `certificate_templates`, `coach_certificate_signatures`, `coach_certificate_counters`, and `certificate_settings` tables. Add per-webinar certification config and AI-generated LinkedIn posts.

## 1. Database (migration)

**Extend `webinars`** with certification config columns:
- `cert_enabled` (bool, default false)
- `cert_title`, `cert_description` (text)
- `cert_template_id` (uuid → certificate_templates)
- `cert_signature_id` (uuid → coach_certificate_signatures)
- `cert_completion_criteria` (text: `attended` | `manual` | `quiz_pass`)
- `cert_validity_months` (int, nullable)
- `cert_qr_enabled` (bool, default true)

**Extend `issued_certificates`** (already supports courses) to allow webinar source:
- Add `webinar_id` (uuid, nullable, FK webinars), `source_type` (text: `course` | `webinar`, default `course`).
- Update `next_certificate_number` to accept a source slug (`COURSE` vs `WEB`) → format `ACP-WEB-{YYYY}-{000000}`.

**Extend `certificate_settings`** (admin global toggles):
- `webinar_cert_enabled`, `linkedin_sharing_enabled`, `ai_post_generation_enabled`, `qr_verification_enabled`, `public_verification_enabled`, `monthly_cert_limit` (int).

**Extend `coach_feature_flags`**: `webinar_certification_access` (bool, default true) for admin per-coach toggle.

RLS: webinar certs inherit existing `issued_certificates` policies (learner reads own, coach reads issued, admin all). Add GRANTs unchanged (existing table).

## 2. Edge Functions

- **`issue-webinar-certificate`** — input `{ webinar_id, learner_id }`. Verifies attendance (`webinar_registrations.attended=true`), checks coach `cert_enabled` + admin flags + monthly limit, calls `next_certificate_number(coach, year)` with WEB prefix, renders PDF (reuse PDF code from `issue-certificate`), uploads to `certificate-pdfs` bucket at `webinars/{coach}/{cert_number}.pdf`, inserts `issued_certificates` with `source_type='webinar'` and `webinar_id`.
- **`generate-linkedin-post`** — input `{ certificate_id }`. Loads cert + webinar (title, description, learning_outcomes, skills) + coach profile, calls Lovable AI (`google/gemini-3-flash-preview`) with strict positive-only system prompt, returns post text + hashtags. Handles 429/402.
- **`verify-certificate`** — already exists; extend to return `source_type`, `webinar_name` when applicable.

All use `npm:@supabase/supabase-js@2/cors`, manual JWT validate where needed.

## 3. Coach UI

- **`CoachWebinarForm.tsx`** (edit `src/components/coach/...`): add "🎓 Certification Settings" card — toggle, template picker (reuse `certificate_templates`), signature picker (reuse `coach_certificate_signatures`), title/description/criteria/validity/QR toggle, live preview reusing existing preview component.
- **`CoachCertificates.tsx`**: add tab/filter to switch between Course and Webinar certificates; bulk issue button for a webinar's attendees.

## 4. Learner UI

- **`LearnerWebinars.tsx`**: in "Completed Webinars" list, when `cert_enabled` + attended, show **🎓 Generate Certificate** button → invokes `issue-webinar-certificate`, then opens share modal.
- **`LearnerCertificates.tsx`**: unify course + webinar certs in a single list (filter chip). Each card: View / Download PDF / Verify / Share on LinkedIn / Copy link.
- **New `CertificateShareModal.tsx`**: Download, Copy verification URL, **Generate AI LinkedIn Post** (calls edge function, shows editable textarea), **Share on LinkedIn** (deep link to LinkedIn share with prefilled text + cert URL).

## 5. Public verification

- `/verify-certificate/:token` already exists — update to render webinar name + coach when `source_type='webinar'`.
- Short URL alias `/certificate/:number` → resolves number to token and renders same page.

## 6. Admin UI

- **`AdminCertificateSettings.tsx`**: add Webinar Certification section with toggles for: webinar_cert_enabled, linkedin_sharing_enabled, ai_post_generation_enabled, qr_verification_enabled, public_verification_enabled, monthly_cert_limit. Add per-coach feature flag override (existing pattern via `coach_feature_flags`).

## 7. AI Content Rules

System prompt for `generate-linkedin-post` enforces: positive only, no comparisons, no false claims, no negative/controversial content, include webinar title + coach name + cert ID + 5–7 professional hashtags, 150–220 words, unique per learner (include learner first name + timestamp seed).

## Files

**New**
- `supabase/functions/issue-webinar-certificate/index.ts`
- `supabase/functions/generate-linkedin-post/index.ts`
- `src/components/learner/CertificateShareModal.tsx`
- Migration SQL

**Edited**
- `supabase/functions/verify-certificate/index.ts`
- `supabase/config.toml`
- `src/components/coach/CoachWebinarForm.tsx` (or webinar create/edit component — verify exact filename first)
- `src/components/coach/CoachCertificates.tsx`
- `src/components/learner/LearnerWebinars.tsx`
- `src/components/learner/LearnerCertificates.tsx`
- `src/components/admin/AdminCertificateSettings.tsx`
- `src/pages/VerifyCertificate.tsx`
- `src/App.tsx` (add `/certificate/:number` route)

## Out of scope (defer)
WhatsApp delivery, bulk-generate UI polish, analytics dashboard, badges, expiry auto-revocation, multi-template marketplace — flagged as Premium follow-ups.
