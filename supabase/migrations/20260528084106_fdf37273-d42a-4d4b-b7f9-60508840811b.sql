
-- 1. Extend assignments
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS passing_marks integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS reference_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coach_id uuid;

-- Backfill coach_id from courses
UPDATE public.assignments a
SET coach_id = c.coach_id
FROM public.courses c
WHERE a.course_id = c.id AND a.coach_id IS NULL;

-- Backfill status from is_published
UPDATE public.assignments SET status = 'published' WHERE is_published = true AND status = 'draft';

-- Status validation
CREATE OR REPLACE FUNCTION public.validate_assignment_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft','published','closed') THEN
    RAISE EXCEPTION 'Invalid assignment status: %', NEW.status;
  END IF;
  -- Keep is_published in sync
  NEW.is_published := (NEW.status = 'published');
  -- Ensure coach_id is populated
  IF NEW.coach_id IS NULL THEN
    SELECT coach_id INTO NEW.coach_id FROM public.courses WHERE id = NEW.course_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_assignment_status ON public.assignments;
CREATE TRIGGER trg_validate_assignment_status
BEFORE INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_assignment_status();

-- 2. Extend assignment_submissions
ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS evaluation_status text,
  ADD COLUMN IF NOT EXISTS is_late boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_type text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Auto-detect late + link_type
CREATE OR REPLACE FUNCTION public.assignment_submission_pre_save()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  dl timestamptz;
  url text;
BEGIN
  SELECT deadline_at INTO dl FROM public.assignments WHERE id = NEW.assignment_id;
  IF dl IS NOT NULL AND NEW.submitted_at > dl THEN
    NEW.is_late := true;
    IF NEW.status = 'submitted' THEN NEW.status := 'late'; END IF;
  END IF;
  url := COALESCE(NEW.submission_url, '');
  NEW.link_type := CASE
    WHEN url ILIKE '%drive.google.com%' OR url ILIKE '%docs.google.com%' THEN 'google_drive'
    WHEN url ILIKE '%onedrive.live.com%' OR url ILIKE '%1drv.ms%' OR url ILIKE '%sharepoint.com%' THEN 'onedrive'
    WHEN url ILIKE '%dropbox.com%' THEN 'dropbox'
    WHEN url ILIKE '%github.com%' OR url ILIKE '%gist.github.com%' THEN 'github'
    WHEN url <> '' THEN 'external_url'
    ELSE NULL
  END;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assignment_submission_pre_save ON public.assignment_submissions;
CREATE TRIGGER trg_assignment_submission_pre_save
BEFORE INSERT OR UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.assignment_submission_pre_save();

-- 3. Evaluation history
CREATE TABLE IF NOT EXISTS public.evaluation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL,
  evaluator_id uuid NOT NULL,
  score integer,
  evaluation_status text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eval_history_submission ON public.evaluation_history(submission_id);

GRANT SELECT, INSERT ON public.evaluation_history TO authenticated;
GRANT ALL ON public.evaluation_history TO service_role;

ALTER TABLE public.evaluation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches view history for own assignments"
ON public.evaluation_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = evaluation_history.assignment_id AND a.coach_id = auth.uid()
  )
);

CREATE POLICY "Learners view own evaluation history"
ON public.evaluation_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignment_submissions s
    WHERE s.id = evaluation_history.submission_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Admins view all evaluation history"
ON public.evaluation_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches insert history for own assignments"
ON public.evaluation_history FOR INSERT TO authenticated
WITH CHECK (
  evaluator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = evaluation_history.assignment_id AND a.coach_id = auth.uid()
  )
);

CREATE POLICY "Admins insert evaluation history"
ON public.evaluation_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND evaluator_id = auth.uid());

-- 4. Leaderboard settings (per course)
CREATE TABLE IF NOT EXISTS public.assignment_leaderboard_settings (
  course_id uuid PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.assignment_leaderboard_settings TO authenticated;
GRANT INSERT, UPDATE ON public.assignment_leaderboard_settings TO authenticated;
GRANT ALL ON public.assignment_leaderboard_settings TO service_role;

ALTER TABLE public.assignment_leaderboard_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone enrolled or coach can read leaderboard settings"
ON public.assignment_leaderboard_settings FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid())
  OR public.learner_enrolled_in_course(auth.uid(), course_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coach or admin manage leaderboard settings"
ON public.assignment_leaderboard_settings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coach or admin update leaderboard settings"
ON public.assignment_leaderboard_settings FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. Leaderboard view
CREATE OR REPLACE VIEW public.course_leaderboard_v AS
SELECT
  a.course_id,
  s.user_id,
  COUNT(DISTINCT s.assignment_id) AS submitted_count,
  COUNT(DISTINCT s.assignment_id) FILTER (WHERE s.status IN ('approved','reviewed') OR s.evaluation_status = 'pass') AS completed_count,
  COALESCE(SUM(s.score), 0) AS total_score,
  COALESCE(AVG(NULLIF(s.score, 0))::numeric(10,2), 0) AS avg_score,
  MAX(s.submitted_at) AS last_submitted_at,
  (SELECT COUNT(*) FROM public.assignments a2 WHERE a2.course_id = a.course_id AND a2.status = 'published') AS total_published,
  RANK() OVER (
    PARTITION BY a.course_id
    ORDER BY COALESCE(SUM(s.score), 0) DESC, MAX(s.submitted_at) ASC
  ) AS rank_position
FROM public.assignment_submissions s
JOIN public.assignments a ON a.id = s.assignment_id
GROUP BY a.course_id, s.user_id;

GRANT SELECT ON public.course_leaderboard_v TO authenticated;

-- 6. Notify learners when assignment becomes published
CREATE OR REPLACE FUNCTION public.notify_learners_on_assignment_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  course_title text;
  coach_name text;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'published')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'published' AND COALESCE(OLD.status,'') <> 'published') THEN
    SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;
    SELECT full_name INTO coach_name FROM public.profiles WHERE user_id = NEW.coach_id;

    INSERT INTO public.learner_notifications (learner_id, title, message, coach_id, cta_link)
    SELECT DISTINCT e.user_id,
      'New Assignment: ' || NEW.title,
      'New Assignment Added in ' || COALESCE(course_title, 'your course') ||
        CASE WHEN coach_name IS NOT NULL THEN ' by ' || coach_name ELSE '' END,
      NEW.coach_id,
      '/learner/courses?assignment=' || NEW.id::text
    FROM public.enrollments e
    WHERE e.course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_assignment_publish ON public.assignments;
CREATE TRIGGER trg_notify_assignment_publish
AFTER INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_learners_on_assignment_publish();

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
