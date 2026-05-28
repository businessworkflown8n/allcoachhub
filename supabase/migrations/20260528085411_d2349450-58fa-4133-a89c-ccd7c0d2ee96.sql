
-- 1. Add per-coach feature flag
ALTER TABLE public.coach_feature_flags
  ADD COLUMN IF NOT EXISTS assignments_access boolean NOT NULL DEFAULT true;

-- Helper to check whether a coach has assignments enabled
CREATE OR REPLACE FUNCTION public.coach_has_assignments_access(_coach_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT assignments_access FROM public.coach_feature_flags WHERE coach_id = _coach_id),
    true
  );
$$;

-- 2. Tighten assignments SELECT: only enrolled learners (when published) or owning coach or admin
DROP POLICY IF EXISTS "Authenticated can view published assignments" ON public.assignments;

CREATE POLICY "Enrolled learners view published assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND public.coach_has_assignments_access(coach_id)
  AND public.learner_enrolled_in_course(auth.uid(), course_id)
);

-- Coach manage policies already exist; add feature-gate via wrapper policy
DROP POLICY IF EXISTS "Coaches manage own assignments" ON public.assignments;
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.assignments;

CREATE POLICY "Coaches manage own assignments"
ON public.assignments
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.coach_id = auth.uid())
  AND public.coach_has_assignments_access(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.coach_id = auth.uid())
  AND public.coach_has_assignments_access(auth.uid())
);

CREATE POLICY "Admins view all assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Submissions: ensure learners only submit if enrolled & feature enabled
DROP POLICY IF EXISTS "Users manage own submissions" ON public.assignment_submissions;

CREATE POLICY "Enrolled learners insert own submissions"
ON public.assignment_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_submissions.assignment_id
      AND a.is_published = true
      AND public.coach_has_assignments_access(a.coach_id)
      AND public.learner_enrolled_in_course(auth.uid(), a.course_id)
  )
);

CREATE POLICY "Learners view own submissions"
ON public.assignment_submissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Learners update own submissions"
ON public.assignment_submissions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Learners delete own submissions"
ON public.assignment_submissions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
