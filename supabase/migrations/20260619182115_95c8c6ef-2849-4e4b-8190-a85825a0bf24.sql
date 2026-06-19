
-- =====================================================
-- 1. coach_certificate_signatures
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coach_certificate_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_url text,
  full_name text NOT NULL,
  designation text,
  organization text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_certificate_signatures TO authenticated;
GRANT ALL ON public.coach_certificate_signatures TO service_role;

ALTER TABLE public.coach_certificate_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own signature"
  ON public.coach_certificate_signatures FOR ALL
  TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_coach_cert_sig_updated
  BEFORE UPDATE ON public.coach_certificate_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. certificate_settings (single row)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.certificate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  certificates_enabled boolean NOT NULL DEFAULT true,
  signature_upload_enabled boolean NOT NULL DEFAULT true,
  qr_verification_enabled boolean NOT NULL DEFAULT true,
  revocation_enabled boolean NOT NULL DEFAULT true,
  workshop_certificates_enabled boolean NOT NULL DEFAULT true,
  ai_kids_certificates_enabled boolean NOT NULL DEFAULT true,
  course_wise_templates_enabled boolean NOT NULL DEFAULT true,
  default_template_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.certificate_settings TO authenticated;
GRANT ALL ON public.certificate_settings TO service_role;

ALTER TABLE public.certificate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.certificate_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage settings"
  ON public.certificate_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cert_settings_updated
  BEFORE UPDATE ON public.certificate_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.certificate_settings (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;

-- =====================================================
-- 3. coach_certificate_counters
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coach_certificate_counters (
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  last_number int NOT NULL DEFAULT 0,
  PRIMARY KEY (coach_id, year)
);

GRANT ALL ON public.coach_certificate_counters TO service_role;
ALTER TABLE public.coach_certificate_counters ENABLE ROW LEVEL SECURITY;
-- No public policies; only accessible via security definer functions and service_role.

-- =====================================================
-- 4. Extend certificate_templates
-- =====================================================
ALTER TABLE public.certificate_templates
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS workshop_id uuid,
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'course',
  ADD COLUMN IF NOT EXISTS background_url text;

-- Allow platform-wide templates (coach_id nullable for system defaults)
ALTER TABLE public.certificate_templates ALTER COLUMN coach_id DROP NOT NULL;

-- Constraint via trigger (not CHECK) to keep flexible
CREATE OR REPLACE FUNCTION public.validate_certificate_template()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tier NOT IN ('standard','gold','silver','platinum') THEN
    RAISE EXCEPTION 'Invalid tier: %', NEW.tier;
  END IF;
  IF NEW.template_kind NOT IN ('course','workshop','ai_kids') THEN
    RAISE EXCEPTION 'Invalid template_kind: %', NEW.template_kind;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cert_template ON public.certificate_templates;
CREATE TRIGGER trg_validate_cert_template
  BEFORE INSERT OR UPDATE ON public.certificate_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_certificate_template();

-- Admins can manage all templates
DROP POLICY IF EXISTS "Admins manage all templates" ON public.certificate_templates;
CREATE POLICY "Admins manage all templates"
  ON public.certificate_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default platform template
INSERT INTO public.certificate_templates (id, coach_id, title, description, template_design, is_active, tier, is_default, template_kind)
SELECT gen_random_uuid(), NULL, 'AI Coach Portal Default', 'Neon AI design — used when no custom template is selected',
  '{"theme":"neon_ai","background":"#050A0F","accent":"#C7FF3D","text":"#FFFFFF"}'::jsonb,
  true, 'standard', true, 'course'
WHERE NOT EXISTS (SELECT 1 FROM public.certificate_templates WHERE is_default = true AND template_kind = 'course');

-- =====================================================
-- 5. Extend issued_certificates
-- =====================================================
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'valid',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'course',
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS learner_name text,
  ADD COLUMN IF NOT EXISTS learner_email text,
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS coach_name text,
  ADD COLUMN IF NOT EXISTS coach_designation text,
  ADD COLUMN IF NOT EXISTS coach_organization text,
  ADD COLUMN IF NOT EXISTS coach_signature_url text,
  ADD COLUMN IF NOT EXISTS duration_text text,
  ADD COLUMN IF NOT EXISTS completion_date date,
  ADD COLUMN IF NOT EXISTS linkedin_share_url text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS blockchain_hash text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Make template_id nullable (default template lookup at render time)
ALTER TABLE public.issued_certificates ALTER COLUMN template_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_issued_cert_verification_token
  ON public.issued_certificates(verification_token);

CREATE INDEX IF NOT EXISTS idx_issued_cert_coach ON public.issued_certificates(coach_id);
CREATE INDEX IF NOT EXISTS idx_issued_cert_user ON public.issued_certificates(user_id);

DROP TRIGGER IF EXISTS trg_issued_cert_updated ON public.issued_certificates;
CREATE TRIGGER trg_issued_cert_updated
  BEFORE UPDATE ON public.issued_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update policies: drop old broken policy that referenced template-coach (template can now be null)
DROP POLICY IF EXISTS "Coaches manage certificates for their templates" ON public.issued_certificates;

CREATE POLICY "Coaches manage own issued certificates"
  ON public.issued_certificates FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all issued certificates" ON public.issued_certificates;
CREATE POLICY "Admins manage all issued certificates"
  ON public.issued_certificates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 6. next_certificate_number(coach_id, year) -> text
-- =====================================================
CREATE OR REPLACE FUNCTION public.next_certificate_number(_coach_id uuid, _year int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number int;
  coach_slug text;
  formatted text;
BEGIN
  INSERT INTO public.coach_certificate_counters (coach_id, year, last_number)
  VALUES (_coach_id, _year, 1)
  ON CONFLICT (coach_id, year)
  DO UPDATE SET last_number = public.coach_certificate_counters.last_number + 1
  RETURNING last_number INTO new_number;

  SELECT COALESCE(NULLIF(upper(left(regexp_replace(slug, '[^a-zA-Z0-9]', '', 'g'), 6)), ''), 'COACH')
    INTO coach_slug
    FROM public.profiles
    WHERE user_id = _coach_id;

  IF coach_slug IS NULL THEN coach_slug := 'COACH'; END IF;

  formatted := 'ACP-' || coach_slug || '-' || _year::text || '-' || lpad(new_number::text, 6, '0');
  RETURN formatted;
END;
$$;

-- =====================================================
-- 7. verify_certificate_public(token) -> jsonb
-- =====================================================
CREATE OR REPLACE FUNCTION public.verify_certificate_public(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  cert public.issued_certificates%ROWTYPE;
BEGIN
  SELECT * INTO cert FROM public.issued_certificates WHERE verification_token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'certificate_number', cert.certificate_number,
    'learner_name', cert.learner_name,
    'course_name', cert.course_name,
    'coach_name', cert.coach_name,
    'coach_designation', cert.coach_designation,
    'coach_organization', cert.coach_organization,
    'issued_at', cert.issued_at,
    'completion_date', cert.completion_date,
    'duration_text', cert.duration_text,
    'status', cert.status,
    'source_type', cert.source_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate_public(uuid) TO anon, authenticated;

-- =====================================================
-- 8. revoke_certificate(certificate_id, reason)
-- =====================================================
CREATE OR REPLACE FUNCTION public.revoke_certificate(_certificate_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cert public.issued_certificates%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT * INTO cert FROM public.issued_certificates WHERE id = _certificate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificate not found'; END IF;

  IF NOT (cert.coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only the issuing coach or an admin can revoke this certificate';
  END IF;

  UPDATE public.issued_certificates
  SET status = 'revoked',
      revoked_at = now(),
      revoked_reason = _reason,
      revoked_by = auth.uid(),
      is_valid = false
  WHERE id = _certificate_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_certificate(uuid, text) TO authenticated;
