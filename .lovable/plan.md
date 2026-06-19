## Dynamic Certificate System — Full Build

A platform-wide Certificate of Completion system matching the attached neon-green AI design. Coaches manually issue certificates; learners download/share/verify; admins configure templates and toggles.

### 1. Database changes (one migration)

Extend existing `issued_certificates` and `certificate_templates`, add new tables:

- **`coach_certificate_signatures`** (per-coach signature profile)
  - `coach_id` (FK profiles, unique), `signature_url` (PNG transparent in `certificate-assets` bucket), `full_name`, `designation`, `organization`
- **`certificate_settings`** (single-row admin config)
  - `certificates_enabled`, `signature_upload_enabled`, `qr_verification_enabled`, `revocation_enabled`, `workshop_certificates_enabled`, `ai_kids_certificates_enabled`, `default_template_id`
- **Extend `certificate_templates`**: `tier` enum (`standard|gold|silver|platinum`), `is_default`, `course_id` (nullable, for course-specific override), `workshop_id` (nullable)
- **Extend `issued_certificates`**:
  - `certificate_number` (text, unique, format `ACP-{coach-slug}-{YYYY}-{6digit}`)
  - `verification_token` (uuid)
  - `status` (`valid|revoked`), `revoked_at`, `revoked_reason`
  - `source_type` (`course|workshop|ai_kids`), `source_id`
  - `learner_name`, `course_name`, `coach_name`, `coach_designation`, `coach_organization`, `coach_signature_url` (denormalized snapshot for tamper-resistant verification)
  - `duration_text`, `issued_on`, `pdf_url`
- **Per-coach sequence**: `coach_certificate_counters(coach_id, year, last_number)` + SECURITY DEFINER function `next_certificate_number(coach_id, year)` that atomically increments and returns the formatted ID
- **Storage buckets**: `certificate-signatures` (private, coach + admin RW; public read via signed URL in PDFs), `certificates` (private, learner read own)
- **RLS**:
  - Signatures: coach manages own; admins all; service_role all
  - Settings: admin RW; authenticated read
  - Issued: learner reads own; coach reads own-issued; admins all; public lookup by `verification_token` via SECURITY DEFINER RPC only (no direct anon SELECT)

### 2. Edge functions

- **`issue-certificate`** (replaces/extends `generate-certificate`): input `{ source_type, source_id, learner_id }`; validates coach owns the source; snapshots coach signature + learner/course data; calls `next_certificate_number`; renders PDF (A4 landscape, 300dpi via `pdf-lib` + embedded SVG QR from `qrcode`); uploads to `certificates` bucket; updates row; fires email via existing Resend integration.
- **`verify-certificate`** (public, no JWT): input `{ token }`; returns sanitized public fields only (learner name, course, coach, dates, status). Backed by SECURITY DEFINER RPC.
- **`revoke-certificate`**: coach/admin only.

### 3. Certificate PDF design

Matches attached image:
- Background `#050A0F`, neon `#C7FF3D`, white text; circuit pattern SVG corners; AI head silhouette left; robot + nodes right
- Header "CERTIFICATE OF COMPLETION" in neon
- Center: learner name (script font), "has successfully completed the course", course name (large)
- Footer band: Issued on • Laurel + medal • Certificate No.
- Coach signature PNG + name + designation + organization
- QR code bottom-right linking to `/verify-certificate/{token}`
- `www.aicoachportal.com` footer ribbon
- Generated server-side with `pdf-lib`; assets embedded from `/supabase/functions/_shared/cert-assets/`

### 4. UI surfaces

- **`/verify-certificate/:token`** (new public page) — neon-themed verification card showing learner, course, coach, dates, Valid/Revoked badge.
- **Learner → `/learner/certificates`** (rewrite existing): grid of certificate cards with preview thumbnail, Download PDF, Share, "Add to LinkedIn" (uses LinkedIn certification URL pattern), Verify (opens public page).
- **Coach → `/coach/certificates`** (new tab in CoachDashboard): stats (total issued, this month), table with search, filter by course, actions: Download, Resend, Revoke. "Issue Certificate" button on each completed enrollment.
- **Coach → Profile → Certificate Signature** card: upload PNG, fields for full name / designation / organization, live preview.
- **Admin → `/admin/certificate-settings`** (new): all enable/disable toggles, default template selector, template gallery (Standard/Gold/Silver/Platinum) with upload, course-wise template assignment, revocation log.
- **Coach Enrollment view**: "Issue Certificate" button appears once learner hits 100% (visual indicator only; coach still confirms — matches "Manual coach approval" trigger).

### 5. Integration points

- Hook into existing `lesson_progress` to compute completion % (no auto-issue — manual only per your choice).
- Reuse `course-completion-email` template; add certificate attachment + verification link.
- Add `useCoachFeatures` flag `certificates_enabled` so admins can per-coach disable.

### Technical notes

- Certificate ID format per coach: `ACP-{slug}-{YYYY}-{NNNNNN}` where slug = first 6 chars of coach username/profile slug, uppercased.
- Verification uses a separate UUID token (not the certificate number) so IDs can be shared publicly without enabling enumeration.
- PDF generation runs in edge function with `pdf-lib` (Deno-compatible) + `qrcode` from `npm:`.
- Signatures stored as transparent PNG; rendered at 180px wide on PDF (≈1.2 inches).
- Snapshotting coach data on issuance ensures revoked/changed signatures don't retroactively alter old certificates.
- LinkedIn integration uses the "Add to Profile" URL pattern (`https://www.linkedin.com/profile/add?...`) — no API needed.
- WhatsApp delivery deferred to a follow-up (uses existing Digital SMS integration; only a stub button included).
- Blockchain/NFT noted as "future" — schema includes `blockchain_hash` nullable column but no on-chain integration yet.

### Build order

1. Migration (schema + RPC + buckets + RLS)
2. `issue-certificate` + `verify-certificate` edge functions
3. Public `/verify-certificate/:token` page
4. Coach signature upload UI
5. Coach `/coach/certificates` dashboard + issuance flow
6. Learner certificates rewrite
7. Admin certificate settings page
8. Multi-template gallery (Gold/Silver/Platinum)

Given the size, I'll implement in this order across the next turns. This first turn will deliver steps 1–4.
