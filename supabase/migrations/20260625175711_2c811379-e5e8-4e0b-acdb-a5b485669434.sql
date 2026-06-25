
-- Extend certificate_templates
ALTER TABLE public.certificate_templates
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'corporate',
  ADD COLUMN IF NOT EXISTS orientation text DEFAULT 'landscape',
  ADD COLUMN IF NOT EXISTS style_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_image_url text,
  ADD COLUMN IF NOT EXISTS background_image_url text,
  ADD COLUMN IF NOT EXISTS design_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS supported_sources text[] DEFAULT ARRAY['course','webinar','workshop','masterclass','challenge','membership','event'],
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Allow authenticated users to read active templates (read-only for non-admins)
DO $$ BEGIN
  CREATE POLICY "Anyone authenticated can view active templates"
    ON public.certificate_templates FOR SELECT
    TO authenticated
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Coach favorites
CREATE TABLE IF NOT EXISTS public.coach_template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, template_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_template_favorites TO authenticated;
GRANT ALL ON public.coach_template_favorites TO service_role;
ALTER TABLE public.coach_template_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage their favorites"
  ON public.coach_template_favorites FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Coach customizations (duplicated templates)
CREATE TABLE IF NOT EXISTS public.coach_template_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  design_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  orientation text DEFAULT 'landscape',
  preview_image_url text,
  background_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_template_customizations TO authenticated;
GRANT ALL ON public.coach_template_customizations TO service_role;
ALTER TABLE public.coach_template_customizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage their customizations"
  ON public.coach_template_customizations FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Admin assignments (which coaches can use a premium template)
CREATE TABLE IF NOT EXISTS public.coach_template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, template_id)
);
GRANT SELECT ON public.coach_template_assignments TO authenticated;
GRANT ALL ON public.coach_template_assignments TO service_role;
ALTER TABLE public.coach_template_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches read own assignments"
  ON public.coach_template_assignments FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage assignments"
  ON public.coach_template_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add certificate_template_id to source tables
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS certificate_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS certificate_customization_id uuid REFERENCES public.coach_template_customizations(id) ON DELETE SET NULL;

ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS certificate_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS certificate_customization_id uuid REFERENCES public.coach_template_customizations(id) ON DELETE SET NULL;

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS certificate_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS certificate_customization_id uuid REFERENCES public.coach_template_customizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cert_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_title text,
  ADD COLUMN IF NOT EXISTS cert_description text;

-- updated_at trigger for customizations
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_customizations_updated_at ON public.coach_template_customizations;
CREATE TRIGGER trg_customizations_updated_at
  BEFORE UPDATE ON public.coach_template_customizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
