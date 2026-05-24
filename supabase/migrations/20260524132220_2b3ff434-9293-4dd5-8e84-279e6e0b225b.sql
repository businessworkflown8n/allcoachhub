
-- 1) Global curriculum link settings (single row enforced via unique partial)
CREATE TABLE IF NOT EXISTS public.curriculum_link_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allowed_link_types text[] NOT NULL DEFAULT ARRAY['youtube','vimeo','google_drive','zoom','loom','website','other']::text[],
  domain_whitelist text[] NOT NULL DEFAULT ARRAY[]::text[],
  max_links_per_lesson integer NOT NULL DEFAULT 10,
  allow_preview boolean NOT NULL DEFAULT true,
  allow_downloadable boolean NOT NULL DEFAULT true,
  allow_embed boolean NOT NULL DEFAULT true,
  allow_open_new_tab boolean NOT NULL DEFAULT true,
  require_admin_approval boolean NOT NULL DEFAULT false,
  uploads_disabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed exactly one row
INSERT INTO public.curriculum_link_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.curriculum_link_settings);

ALTER TABLE public.curriculum_link_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read curriculum settings" ON public.curriculum_link_settings;
CREATE POLICY "Authenticated can read curriculum settings"
  ON public.curriculum_link_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage curriculum settings" ON public.curriculum_link_settings;
CREATE POLICY "Admins manage curriculum settings"
  ON public.curriculum_link_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_curriculum_settings_updated
  BEFORE UPDATE ON public.curriculum_link_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Lesson-level new fields
ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS link_type text,
  ADD COLUMN IF NOT EXISTS open_in_new_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS link_clicks_count integer NOT NULL DEFAULT 0;

-- 3) Click tracking table
CREATE TABLE IF NOT EXISTS public.lesson_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  user_id uuid,
  link_type text,
  url text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_link_clicks_lesson ON public.lesson_link_clicks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_link_clicks_user ON public.lesson_link_clicks(user_id);

ALTER TABLE public.lesson_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can log their own clicks" ON public.lesson_link_clicks;
CREATE POLICY "Users can log their own clicks"
  ON public.lesson_link_clicks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all clicks" ON public.lesson_link_clicks;
CREATE POLICY "Admins read all clicks"
  ON public.lesson_link_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Coaches read their lesson clicks" ON public.lesson_link_clicks;
CREATE POLICY "Coaches read their lesson clicks"
  ON public.lesson_link_clicks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_lessons cl
    JOIN public.course_modules cm ON cm.id = cl.module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cl.id = lesson_link_clicks.lesson_id AND c.coach_id = auth.uid()
  ));
