
-- Tighten certificate-signatures SELECT policy
DROP POLICY IF EXISTS "Read certificate signatures" ON storage.objects;
CREATE POLICY "Owner or admin read certificate signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificate-signatures'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Tighten materials bucket SELECT to respect audience_scope
DROP POLICY IF EXISTS "Anyone can view material files" ON storage.objects;
CREATE POLICY "Scoped read material files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'materials'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.file_url LIKE '%' || storage.objects.name
        AND m.is_published = true
        AND (
          m.audience_scope = 'public'
          OR m.coach_id = auth.uid()
          OR (
            m.audience_scope = 'coach_all_learners'
            AND m.coach_id IS NOT NULL
            AND public.learner_enrolled_with_coach(auth.uid(), m.coach_id)
          )
          OR (
            m.audience_scope = 'coach_course_learners'
            AND m.audience_course_id IS NOT NULL
            AND public.learner_enrolled_in_course(auth.uid(), m.audience_course_id)
          )
        )
    )
  )
);
