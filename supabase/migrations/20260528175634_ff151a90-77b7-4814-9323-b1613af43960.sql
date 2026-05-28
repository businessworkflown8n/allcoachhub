
-- 1. Extend coach_sessions
ALTER TABLE public.coach_sessions
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_10m_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_on_create boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_coach_sessions_course ON public.coach_sessions(course_id);

-- 2. Enrolled learners can SELECT sessions for their courses
DROP POLICY IF EXISTS "Enrolled learners view course sessions" ON public.coach_sessions;
CREATE POLICY "Enrolled learners view course sessions"
ON public.coach_sessions
FOR SELECT
TO authenticated
USING (
  course_id IS NOT NULL
  AND public.learner_enrolled_in_course(auth.uid(), course_id)
);

-- 3. Trigger: notify enrolled learners on insert/significant update of a course-linked session
CREATE OR REPLACE FUNCTION public.notify_enrolled_learners_on_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title text;
  coach_name text;
  notify_kind text := NULL;
BEGIN
  IF NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    notify_kind := 'scheduled';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
      notify_kind := 'cancelled';
    ELSIF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.meeting_url IS DISTINCT FROM OLD.meeting_url
       OR NEW.title IS DISTINCT FROM OLD.title THEN
      notify_kind := 'updated';
    END IF;
  END IF;

  IF notify_kind IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;
  SELECT full_name INTO coach_name FROM public.profiles WHERE user_id = NEW.coach_id;

  INSERT INTO public.learner_notifications (learner_id, title, message, coach_id, cta_link)
  SELECT DISTINCT e.learner_id,
    CASE notify_kind
      WHEN 'scheduled' THEN 'New live session: ' || NEW.title
      WHEN 'cancelled' THEN 'Session cancelled: ' || NEW.title
      ELSE 'Session updated: ' || NEW.title
    END,
    'Course: ' || COALESCE(course_title,'(your course)')
      || CASE WHEN coach_name IS NOT NULL THEN ' · Coach ' || coach_name ELSE '' END
      || ' · ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC',
    NEW.coach_id,
    '/learner/courses'
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_session_learners ON public.coach_sessions;
CREATE TRIGGER trg_notify_session_learners
AFTER INSERT OR UPDATE ON public.coach_sessions
FOR EACH ROW EXECUTE FUNCTION public.notify_enrolled_learners_on_session();

-- 4. Trigger: notify enrolled learners on module publish
CREATE OR REPLACE FUNCTION public.notify_enrolled_learners_on_module_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title text;
  coach_uid uuid;
  coach_name text;
BEGIN
  IF NOT ((TG_OP = 'INSERT' AND NEW.is_published = true)
       OR (TG_OP = 'UPDATE' AND NEW.is_published = true AND COALESCE(OLD.is_published,false) = false)) THEN
    RETURN NEW;
  END IF;

  SELECT title, coach_id INTO course_title, coach_uid FROM public.courses WHERE id = NEW.course_id;
  SELECT full_name INTO coach_name FROM public.profiles WHERE user_id = coach_uid;

  INSERT INTO public.learner_notifications (learner_id, title, message, coach_id, cta_link)
  SELECT DISTINCT e.learner_id,
    'New module: ' || NEW.title,
    'New module added to ' || COALESCE(course_title,'your course')
      || CASE WHEN coach_name IS NOT NULL THEN ' by ' || coach_name ELSE '' END,
    coach_uid,
    '/learner/courses'
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_module_publish ON public.course_modules;
CREATE TRIGGER trg_notify_module_publish
AFTER INSERT OR UPDATE ON public.course_modules
FOR EACH ROW EXECUTE FUNCTION public.notify_enrolled_learners_on_module_publish();

-- 5. Realtime publication
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.course_modules; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.course_lessons; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.coach_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.course_modules REPLICA IDENTITY FULL;
ALTER TABLE public.course_lessons REPLICA IDENTITY FULL;
