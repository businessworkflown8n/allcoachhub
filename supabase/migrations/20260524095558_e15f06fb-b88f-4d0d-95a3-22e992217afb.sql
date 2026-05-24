
-- Phase 3: Gamification + Assignment/Quiz enhancements

-- XP wallet per user
CREATE TABLE IF NOT EXISTS public.learner_xp (
  user_id uuid PRIMARY KEY,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_self_read" ON public.learner_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_public_leaderboard" ON public.learner_xp FOR SELECT USING (true);

-- XP event log
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid,
  source text NOT NULL, -- 'lesson_complete' | 'quiz_passed' | 'assignment_approved' | 'course_complete' | 'streak_bonus'
  source_id uuid,
  points integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON public.xp_events(user_id, created_at DESC);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_events_self_read" ON public.xp_events FOR SELECT USING (auth.uid() = user_id);

-- Learning streak per user
CREATE TABLE IF NOT EXISTS public.learner_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streak_self_read" ON public.learner_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "streak_public_leaderboard" ON public.learner_streaks FOR SELECT USING (true);

-- Course-scoped badges (separate from community_badges)
CREATE TABLE IF NOT EXISTS public.course_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT '🏆',
  criteria_type text NOT NULL DEFAULT 'course_complete', -- 'course_complete'|'quiz_pass'|'lessons_count'|'xp_threshold'
  criteria_value integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_badges_public_read" ON public.course_badges FOR SELECT USING (true);
CREATE POLICY "course_badges_coach_write" ON public.course_badges FOR ALL
  USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);

CREATE TABLE IF NOT EXISTS public.learner_course_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.course_badges(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
ALTER TABLE public.learner_course_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lcb_self_read" ON public.learner_course_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lcb_public_leaderboard" ON public.learner_course_badges FOR SELECT USING (true);

-- RPC: award XP (callable by edge/triggers; also from client with strict source whitelist via RLS bypass not allowed, so we provide SECURITY DEFINER controlled function)
CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _points integer, _source text, _source_id uuid DEFAULT NULL, _course_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_total int;
  new_level int;
BEGIN
  IF _user_id IS NULL OR _points IS NULL OR _points <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid');
  END IF;
  -- Only the user themselves or service role can award
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.learner_xp (user_id, total_xp) VALUES (_user_id, _points)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = learner_xp.total_xp + EXCLUDED.total_xp, updated_at = now()
  RETURNING total_xp INTO new_total;

  new_level := GREATEST(1, floor(new_total / 100)::int + 1);
  UPDATE public.learner_xp SET level = new_level WHERE user_id = _user_id;

  INSERT INTO public.xp_events (user_id, course_id, source, source_id, points)
  VALUES (_user_id, _course_id, _source, _source_id, _points);

  RETURN jsonb_build_object('success', true, 'total_xp', new_total, 'level', new_level);
END $$;

-- RPC: update streak
CREATE OR REPLACE FUNCTION public.update_learner_streak(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.learner_streaks%ROWTYPE;
  today date := current_date;
  new_current int;
  new_longest int;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO s FROM public.learner_streaks WHERE user_id = _user_id;
  IF NOT FOUND THEN
    INSERT INTO public.learner_streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (_user_id, 1, 1, today);
    RETURN jsonb_build_object('current', 1, 'longest', 1);
  END IF;

  IF s.last_active_date = today THEN
    RETURN jsonb_build_object('current', s.current_streak, 'longest', s.longest_streak);
  ELSIF s.last_active_date = today - 1 THEN
    new_current := s.current_streak + 1;
  ELSE
    new_current := 1;
  END IF;

  new_longest := GREATEST(s.longest_streak, new_current);
  UPDATE public.learner_streaks
  SET current_streak = new_current, longest_streak = new_longest, last_active_date = today, updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object('current', new_current, 'longest', new_longest);
END $$;

-- Allow coaches to view submissions for their course assignments + grade
DO $$ BEGIN
  CREATE POLICY "coach_view_submissions" ON public.assignment_submissions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
                   WHERE a.id = assignment_submissions.assignment_id AND c.coach_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "coach_grade_submissions" ON public.assignment_submissions FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
                   WHERE a.id = assignment_submissions.assignment_id AND c.coach_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Coach manages own assignments, quizzes, quiz_questions
DO $$ BEGIN
  CREATE POLICY "coach_manage_assignments" ON public.assignments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.coach_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.coach_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "coach_manage_quizzes" ON public.quizzes FOR ALL
    USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = quizzes.course_id AND c.coach_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = quizzes.course_id AND c.coach_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "coach_manage_quiz_questions" ON public.quiz_questions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id
                   WHERE q.id = quiz_questions.quiz_id AND c.coach_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id
                        WHERE q.id = quiz_questions.quiz_id AND c.coach_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
