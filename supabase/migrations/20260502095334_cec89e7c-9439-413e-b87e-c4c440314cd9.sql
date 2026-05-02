-- Add access mode + expiry to external_link_controls
ALTER TABLE public.external_link_controls
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS url_template text;

-- Validate access_mode values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_external_link_access_mode'
  ) THEN
    CREATE OR REPLACE FUNCTION public.validate_external_link_access_mode()
    RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $f$
    BEGIN
      IF NEW.access_mode NOT IN ('public','private') THEN
        RAISE EXCEPTION 'access_mode must be public or private';
      END IF;
      RETURN NEW;
    END;
    $f$;
    CREATE TRIGGER trg_validate_external_link_access_mode
    BEFORE INSERT OR UPDATE ON public.external_link_controls
    FOR EACH ROW EXECUTE FUNCTION public.validate_external_link_access_mode();
  END IF;
END $$;

-- Seed AI Mastermind Learning control row
INSERT INTO public.external_link_controls (feature_key, label, description, category, public_url, url_template, is_enabled, access_mode)
VALUES (
  'ai_mastermind_learning',
  'AI Mastermind Learning Page',
  'Coach-specific LinkedIn pledge / badge generator. Toggle external access and choose Public (no login) or Private (login required).',
  'ai_mastermind',
  '/Ai-mastermind-learning',
  '/Ai-mastermind-learning/{coachSlug}',
  false,
  'public'
)
ON CONFLICT (feature_key) DO UPDATE
  SET url_template = EXCLUDED.url_template,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      label = EXCLUDED.label;

-- Click/access tracking table
CREATE TABLE IF NOT EXISTS public.external_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  coach_slug text,
  access_mode text NOT NULL DEFAULT 'public',
  was_authenticated boolean NOT NULL DEFAULT false,
  required_login boolean NOT NULL DEFAULT false,
  user_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log external link clicks" ON public.external_link_clicks;
CREATE POLICY "Anyone can log external link clicks"
  ON public.external_link_clicks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read external link clicks" ON public.external_link_clicks;
CREATE POLICY "Admins read external link clicks"
  ON public.external_link_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_external_link_clicks_feature ON public.external_link_clicks(feature_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_link_clicks_coach ON public.external_link_clicks(coach_slug);