
-- Webinar Certification Settings
ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS cert_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_title text,
  ADD COLUMN IF NOT EXISTS cert_description text,
  ADD COLUMN IF NOT EXISTS cert_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cert_signature_id uuid REFERENCES public.coach_certificate_signatures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cert_completion_criteria text NOT NULL DEFAULT 'attended',
  ADD COLUMN IF NOT EXISTS cert_validity_months integer,
  ADD COLUMN IF NOT EXISTS cert_qr_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS learning_outcomes text,
  ADD COLUMN IF NOT EXISTS skills_covered text;

-- Admin global toggles for webinar certs + AI/LinkedIn features
ALTER TABLE public.certificate_settings
  ADD COLUMN IF NOT EXISTS webinar_cert_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS linkedin_sharing_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_post_generation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_verification_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_cert_limit integer;

-- Per-coach feature flag
ALTER TABLE public.coach_feature_flags
  ADD COLUMN IF NOT EXISTS webinar_certification_access boolean NOT NULL DEFAULT true;

-- Allow webinar source on issued_certificates (no check constraint exists, source_type is text)
-- Add explicit webinar_id pointer for easy joins
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS webinar_id uuid REFERENCES public.webinars(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_issued_certificates_webinar ON public.issued_certificates(webinar_id) WHERE webinar_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webinars_cert_enabled ON public.webinars(cert_enabled) WHERE cert_enabled = true;
