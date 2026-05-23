
-- 1) course_lessons: gate full lesson reads behind enrollment / preview / ownership
DROP POLICY IF EXISTS "Public can view published lessons" ON public.course_lessons;

-- Anonymous + authenticated: only free-preview published lessons
CREATE POLICY "Public can view free preview lessons"
ON public.course_lessons
FOR SELECT
TO public
USING (is_published = true AND is_free_preview = true);

-- Enrolled learners: full access to published lessons in their courses
CREATE POLICY "Enrolled learners view published lessons"
ON public.course_lessons
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.course_modules cm
    WHERE cm.id = course_lessons.module_id
      AND public.learner_enrolled_in_course(auth.uid(), cm.course_id)
  )
);

-- (Coaches already have ALL via "Coaches manage own lessons")

-- 2) quiz_questions: restrict to enrolled learners + coaches; hide correct_answer at column level
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;

CREATE POLICY "Enrolled learners view quiz questions"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.quizzes q
    WHERE q.id = quiz_questions.quiz_id
      AND public.learner_enrolled_in_course(auth.uid(), q.course_id)
  )
);

-- Hide correct_answer from learners at the column-grant level.
-- Coaches read it via SECURITY DEFINER helpers / direct grading flows; client SELECTs from
-- learners will simply not return the column.
REVOKE SELECT (correct_answer) ON public.quiz_questions FROM anon, authenticated;
