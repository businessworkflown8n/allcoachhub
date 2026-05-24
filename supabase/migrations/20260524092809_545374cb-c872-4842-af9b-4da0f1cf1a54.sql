
-- Extend courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS learning_outcomes text,
  ADD COLUMN IF NOT EXISTS prerequisites text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_visibility_chk') THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_visibility_chk
      CHECK (visibility IN ('public','private','unlisted'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_access_type_chk') THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_access_type_chk
      CHECK (access_type IN ('free','paid','invite','private'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_status_chk') THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_status_chk
      CHECK (status IN ('draft','pending_review','published','archived','private'));
  END IF;
END $$;

-- Extend course_lessons with link provider metadata (content_url already exists)
ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- ============ COHORTS ============
CREATE TABLE IF NOT EXISTS public.course_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_seats integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cohorts_course ON public.course_cohorts(course_id);
ALTER TABLE public.course_cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own cohorts" ON public.course_cohorts;
CREATE POLICY "Coaches manage own cohorts" ON public.course_cohorts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage all cohorts" ON public.course_cohorts;
CREATE POLICY "Admins manage all cohorts" ON public.course_cohorts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Enrolled learners view cohorts" ON public.course_cohorts;
CREATE POLICY "Enrolled learners view cohorts" ON public.course_cohorts
  FOR SELECT TO authenticated
  USING (is_active = true AND public.learner_enrolled_in_course(auth.uid(), course_id));

CREATE TRIGGER trg_cohorts_updated_at
  BEFORE UPDATE ON public.course_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ACCESS GRANTS ============
CREATE TABLE IF NOT EXISTS public.course_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.course_cohorts(id) ON DELETE SET NULL,
  user_id uuid,
  email text,
  expires_at timestamptz,
  granted_by uuid,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_grants_course ON public.course_access_grants(course_id);
CREATE INDEX IF NOT EXISTS idx_grants_user ON public.course_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_grants_email ON public.course_access_grants(lower(email));
ALTER TABLE public.course_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own grants" ON public.course_access_grants;
CREATE POLICY "Coaches manage own grants" ON public.course_access_grants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage all grants" ON public.course_access_grants;
CREATE POLICY "Admins manage all grants" ON public.course_access_grants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Learners view own grants" ON public.course_access_grants;
CREATE POLICY "Learners view own grants" ON public.course_access_grants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_grants_updated_at
  BEFORE UPDATE ON public.course_access_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INVITES ============
CREATE TABLE IF NOT EXISTS public.course_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.course_cohorts(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  email text,
  max_uses integer NOT NULL DEFAULT 1,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invites_course ON public.course_invites(course_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.course_invites(token);
ALTER TABLE public.course_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own invites" ON public.course_invites;
CREATE POLICY "Coaches manage own invites" ON public.course_invites
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage all invites" ON public.course_invites;
CREATE POLICY "Admins manage all invites" ON public.course_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Public lookup by token (for redemption flow); only valid tokens
DROP POLICY IF EXISTS "Anyone can view valid invites by token" ON public.course_invites;
CREATE POLICY "Anyone can view valid invites by token" ON public.course_invites
  FOR SELECT TO anon, authenticated
  USING (
    use_count < max_uses
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Helper to check if a user has access to a private/invite course
CREATE OR REPLACE FUNCTION public.user_has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments WHERE learner_id = _user_id AND course_id = _course_id
  ) OR EXISTS (
    SELECT 1 FROM public.course_access_grants
    WHERE course_id = _course_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        user_id = _user_id
        OR lower(email) = lower((SELECT email FROM auth.users WHERE id = _user_id))
      )
  );
$$;
