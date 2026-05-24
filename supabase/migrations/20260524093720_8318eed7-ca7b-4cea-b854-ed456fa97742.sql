
-- Continue learning pointer
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS last_accessed_lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;

-- LESSON NOTES (private per learner)
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  body text NOT NULL,
  video_timestamp_sec integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_learner_lesson ON public.lesson_notes(learner_id, lesson_id);
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners manage own notes" ON public.lesson_notes
  FOR ALL TO authenticated USING (learner_id = auth.uid()) WITH CHECK (learner_id = auth.uid());
CREATE TRIGGER trg_lesson_notes_updated BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LESSON RESOURCES (coach attaches)
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'link',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON public.lesson_resources(lesson_id);
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manage lesson resources" ON public.lesson_resources
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_modules cm ON cm.id = cl.module_id
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cl.id = lesson_resources.lesson_id AND c.coach_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_modules cm ON cm.id = cl.module_id
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cl.id = lesson_resources.lesson_id AND c.coach_id = auth.uid()
    )
  );
CREATE POLICY "Learners view resources for accessible courses" ON public.lesson_resources
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_modules cm ON cm.id = cl.module_id
      WHERE cl.id = lesson_resources.lesson_id
        AND public.user_has_course_access(auth.uid(), cm.course_id)
    )
  );

-- LESSON DISCUSSIONS
CREATE TABLE IF NOT EXISTS public.lesson_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.lesson_discussions(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_disc_lesson ON public.lesson_discussions(lesson_id, created_at);
ALTER TABLE public.lesson_discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View discussions for accessible courses" ON public.lesson_discussions
  FOR SELECT TO authenticated USING (
    public.user_has_course_access(auth.uid(), course_id)
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Post own discussions" ON public.lesson_discussions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND (
      public.user_has_course_access(auth.uid(), course_id)
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coach_id = auth.uid())
    )
  );
CREATE POLICY "Edit own discussions" ON public.lesson_discussions
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Delete own discussions" ON public.lesson_discussions
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_lesson_disc_updated BEFORE UPDATE ON public.lesson_discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LESSON BOOKMARKS
CREATE TABLE IF NOT EXISTS public.lesson_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id, lesson_id)
);
ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners manage own bookmarks" ON public.lesson_bookmarks
  FOR ALL TO authenticated USING (learner_id = auth.uid()) WITH CHECK (learner_id = auth.uid());

-- Invite redemption RPC: creates an access_grant for the current user
CREATE OR REPLACE FUNCTION public.redeem_course_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.course_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT * INTO inv FROM public.course_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invite'; END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;
  IF inv.use_count >= inv.max_uses THEN RAISE EXCEPTION 'Invite already used'; END IF;

  INSERT INTO public.course_access_grants (course_id, cohort_id, user_id, granted_by, notes, is_active)
  VALUES (inv.course_id, inv.cohort_id, auth.uid(), inv.created_by, 'Redeemed invite ' || left(_token, 8), true)
  ON CONFLICT DO NOTHING;

  UPDATE public.course_invites SET use_count = use_count + 1 WHERE id = inv.id;
  RETURN jsonb_build_object('success', true, 'course_id', inv.course_id);
END $$;
