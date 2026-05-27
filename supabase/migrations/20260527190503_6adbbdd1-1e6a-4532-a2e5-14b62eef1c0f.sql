
-- ============================================================
-- Security fixes batch
-- ============================================================

-- 1) messages: drop overly broad broadcast policies that exposed all DMs
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

-- 2) funnel_events: drop public SELECT; restrict to admins (INSERT remains public for tracking)
DROP POLICY IF EXISTS "Anyone can view funnel events" ON public.funnel_events;
CREATE POLICY "Admins view funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) digital_product_settings: restrict public read to authenticated only
DROP POLICY IF EXISTS "Anyone can read DP settings" ON public.digital_product_settings;
CREATE POLICY "Authenticated read DP settings"
  ON public.digital_product_settings FOR SELECT
  TO authenticated
  USING (true);

-- 4) profiles: revoke PII columns from anon (column-level privilege)
REVOKE SELECT (email, contact_number, whatsapp_number) ON public.profiles FROM anon;

-- 5) quiz_questions: hide correct_answer from learners
DROP POLICY IF EXISTS "Enrolled learners view quiz questions" ON public.quiz_questions;

CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_learner(_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question_text text, question_type text, options jsonb, points integer, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT qq.id, qq.quiz_id, qq.question_text, qq.question_type, to_jsonb(qq.options), qq.points, qq.sort_order
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = _quiz_id
    AND public.learner_enrolled_in_course(auth.uid(), q.course_id)
  ORDER BY qq.sort_order NULLS LAST, qq.id;
$$;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_learner(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quizzes%ROWTYPE;
  qq public.quiz_questions%ROWTYPE;
  score int := 0;
  total int := 0;
  details jsonb := '[]'::jsonb;
  user_ans_text text;
  user_ans_node jsonb;
  is_correct boolean;
  pct numeric;
  passed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO q FROM public.quizzes WHERE id = _quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'quiz not found'; END IF;
  IF NOT public.learner_enrolled_in_course(auth.uid(), q.course_id) THEN
    RAISE EXCEPTION 'not enrolled';
  END IF;

  FOR qq IN SELECT * FROM public.quiz_questions WHERE quiz_id = _quiz_id LOOP
    total := total + COALESCE(qq.points, 1);
    user_ans_node := _answers -> qq.id::text;
    user_ans_text := _answers ->> qq.id::text;

    IF qq.question_type = 'descriptive' THEN
      is_correct := user_ans_text IS NOT NULL AND length(btrim(user_ans_text)) > 0;
    ELSIF qq.question_type = 'multi_select' THEN
      is_correct := (
        SELECT COALESCE(array_agg(lower(btrim(x)) ORDER BY lower(btrim(x))), ARRAY[]::text[])
        FROM jsonb_array_elements_text(COALESCE(user_ans_node, '[]'::jsonb)) x
      ) = (
        SELECT COALESCE(array_agg(lower(btrim(x)) ORDER BY lower(btrim(x))), ARRAY[]::text[])
        FROM jsonb_array_elements_text(
          CASE WHEN qq.correct_answer ~ '^\[' THEN qq.correct_answer::jsonb
               ELSE to_jsonb(string_to_array(qq.correct_answer, ','))
          END
        ) x
      );
    ELSE
      is_correct := lower(btrim(COALESCE(user_ans_text, ''))) = lower(btrim(COALESCE(qq.correct_answer, '')));
    END IF;

    IF is_correct THEN score := score + COALESCE(qq.points, 1); END IF;
    details := details || jsonb_build_object('question_id', qq.id, 'correct', is_correct, 'points', qq.points);
  END LOOP;

  pct := CASE WHEN total > 0 THEN (score::numeric / total) * 100 ELSE 0 END;
  passed := pct >= COALESCE(q.pass_percentage, 70);

  INSERT INTO public.quiz_attempts (quiz_id, user_id, score, total_points, passed, answers, completed_at)
  VALUES (_quiz_id, auth.uid(), score, total, passed, details, now());

  RETURN jsonb_build_object('score', score, 'total', total, 'passed', passed, 'details', details);
END;
$$;
GRANT EXECUTE ON FUNCTION public.grade_quiz_attempt(uuid, jsonb) TO authenticated;
