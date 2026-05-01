-- 1. Drip + live session fields on lessons
ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS drip_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS live_session_url text,
  ADD COLUMN IF NOT EXISTS live_session_starts_at timestamptz;

-- 2. Lesson progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners view own progress" ON public.lesson_progress
  FOR SELECT TO authenticated USING (learner_id = auth.uid());

CREATE POLICY "Learners write own progress" ON public.lesson_progress
  FOR INSERT TO authenticated WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learners delete own progress" ON public.lesson_progress
  FOR DELETE TO authenticated USING (learner_id = auth.uid());

CREATE POLICY "Coaches view progress for own courses" ON public.lesson_progress
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lesson_progress.course_id AND c.coach_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_lesson_progress_learner_course
  ON public.lesson_progress (learner_id, course_id);

-- 3. Recompute progress + auto-complete enrollment
CREATE OR REPLACE FUNCTION public.recompute_course_progress(_learner uuid, _course uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_lessons int;
  done_lessons int;
  pct numeric;
BEGIN
  SELECT count(*) INTO total_lessons
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.course_id = _course AND cl.is_published = true;

  IF total_lessons = 0 THEN RETURN 0; END IF;

  SELECT count(*) INTO done_lessons
  FROM public.lesson_progress lp
  JOIN public.course_lessons cl ON cl.id = lp.lesson_id
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE lp.learner_id = _learner AND cm.course_id = _course AND cl.is_published = true;

  pct := round((done_lessons::numeric / total_lessons::numeric) * 100, 2);

  UPDATE public.enrollments
  SET progress_percent = pct,
      completed_at = CASE WHEN pct >= 100 AND completed_at IS NULL THEN now() ELSE completed_at END
  WHERE learner_id = _learner AND course_id = _course;

  RETURN pct;
END;
$$;

-- 4. Storage buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('course-content', 'course-content', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('certificates', 'certificates', true)
  ON CONFLICT (id) DO NOTHING;

-- course-content policies (folder = coach user_id)
CREATE POLICY "Public read course-content" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-content');

CREATE POLICY "Coaches upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coaches update own folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'course-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coaches delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-content' AND auth.uid()::text = (storage.foldername(name))[1]);

-- certificates: public read, edge function (service role) writes
CREATE POLICY "Public read certificates" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');