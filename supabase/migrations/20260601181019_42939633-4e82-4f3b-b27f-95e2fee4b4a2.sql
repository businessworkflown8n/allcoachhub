-- =============================================================
-- Learner Session Hub & Recurring Sessions
-- =============================================================

-- 1. Extend coach_sessions with topic / tags / recurrence / thumbnail
ALTER TABLE public.coach_sessions
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none', -- none | daily | weekly | monthly
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb,                         -- { interval, days_of_week, end_type, end_after, end_on }
  ADD COLUMN IF NOT EXISTS parent_session_id uuid REFERENCES public.coach_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coach_sessions_parent ON public.coach_sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_tags ON public.coach_sessions USING GIN(tags);

-- 2. Session recordings (multiple per session, external URLs)
CREATE TABLE IF NOT EXISTS public.session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  title text NOT NULL,
  recording_url text NOT NULL,
  provider text, -- youtube | vimeo | loom | zoom | drive | onedrive | dropbox | other
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_recordings_session ON public.session_recordings(session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_recordings TO authenticated;
GRANT ALL ON public.session_recordings TO service_role;

ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own session recordings" ON public.session_recordings
  FOR ALL TO authenticated
  USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Enrolled learners view recordings" ON public.session_recordings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_sessions s
      WHERE s.id = session_recordings.session_id
        AND s.course_id IS NOT NULL
        AND public.learner_enrolled_in_course(auth.uid(), s.course_id)
    )
  );

CREATE POLICY "Admins view all recordings" ON public.session_recordings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Session resources (external link preferred, optional small file URL)
CREATE TABLE IF NOT EXISTS public.session_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  resource_type text NOT NULL DEFAULT 'link', -- link | file
  title text NOT NULL,
  external_url text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_resources_session ON public.session_resources(session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_resources TO authenticated;
GRANT ALL ON public.session_resources TO service_role;

ALTER TABLE public.session_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own session resources" ON public.session_resources
  FOR ALL TO authenticated
  USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Enrolled learners view resources" ON public.session_resources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_sessions s
      WHERE s.id = session_resources.session_id
        AND s.course_id IS NOT NULL
        AND public.learner_enrolled_in_course(auth.uid(), s.course_id)
    )
  );

CREATE POLICY "Admins view all resources" ON public.session_resources
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Extend coach_session_notes for learner-visible external links / files
ALTER TABLE public.coach_session_notes
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS file_url text;

-- 5. Allow enrolled learners to view CLIENT-VISIBLE notes for course-linked sessions
DROP POLICY IF EXISTS "Enrolled learners view client-visible notes" ON public.coach_session_notes;
CREATE POLICY "Enrolled learners view client-visible notes" ON public.coach_session_notes
  FOR SELECT TO authenticated
  USING (
    client_visible = true
    AND EXISTS (
      SELECT 1 FROM public.coach_sessions s
      WHERE s.id = coach_session_notes.session_id
        AND s.course_id IS NOT NULL
        AND public.learner_enrolled_in_course(auth.uid(), s.course_id)
    )
  );

-- 6. Learner session access tracking
CREATE TABLE IF NOT EXISTS public.learner_session_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  joined_at timestamptz,
  watched_recording boolean NOT NULL DEFAULT false,
  viewed_notes boolean NOT NULL DEFAULT false,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_lsa_learner ON public.learner_session_access(learner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_session_access TO authenticated;
GRANT ALL ON public.learner_session_access TO service_role;

ALTER TABLE public.learner_session_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners manage own session access" ON public.learner_session_access
  FOR ALL TO authenticated
  USING (auth.uid() = learner_id) WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Coaches view access on own sessions" ON public.learner_session_access
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_sessions s
      WHERE s.id = learner_session_access.session_id AND s.coach_id = auth.uid()
    )
  );