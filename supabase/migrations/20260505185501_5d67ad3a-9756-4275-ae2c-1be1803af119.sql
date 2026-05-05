
CREATE TABLE public.lecture_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('video_upload','youtube','recording','image')),
  title text,
  caption text,
  video_url text,
  youtube_url text,
  youtube_mode text DEFAULT 'embed' CHECK (youtube_mode IN ('embed','redirect')),
  image_url text,
  thumbnail_url text,
  duration_seconds integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lecture_media_lesson ON public.lecture_media(lesson_id, sort_order);
ALTER TABLE public.lecture_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own lecture media"
ON public.lecture_media FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.course_lessons cl JOIN public.course_modules cm ON cm.id=cl.module_id JOIN public.courses c ON c.id=cm.course_id WHERE cl.id=lecture_media.lesson_id AND c.coach_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.course_lessons cl JOIN public.course_modules cm ON cm.id=cl.module_id JOIN public.courses c ON c.id=cm.course_id WHERE cl.id=lecture_media.lesson_id AND c.coach_id=auth.uid()));

CREATE POLICY "Admin manages all lecture media"
ON public.lecture_media FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Enrolled learners view lecture media"
ON public.lecture_media FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.course_lessons cl JOIN public.course_modules cm ON cm.id=cl.module_id JOIN public.enrollments e ON e.course_id=cm.course_id WHERE cl.id=lecture_media.lesson_id AND e.learner_id=auth.uid()));

CREATE POLICY "Public view free-preview lecture media"
ON public.lecture_media FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.course_lessons cl WHERE cl.id=lecture_media.lesson_id AND cl.is_free_preview=true));

CREATE TRIGGER update_lecture_media_updated_at
BEFORE UPDATE ON public.lecture_media
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.features_master (feature_key, name, category, description)
VALUES
  ('course_video_upload', 'Course Video Upload', 'courses', 'Upload structured video files to course lessons'),
  ('course_youtube_link', 'Course YouTube Link', 'courses', 'Attach YouTube embed/redirect links to course lessons'),
  ('course_video_recording', 'Course Video Recording', 'courses', 'Record video directly into a lesson via webcam'),
  ('course_image_upload', 'Course Image Upload', 'courses', 'Attach image galleries to course lessons')
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.feature_controls (feature_key, global_enabled, free_enabled, pro_enabled, premium_enabled)
VALUES
  ('course_video_upload', true, true, true, true),
  ('course_youtube_link', true, true, true, true),
  ('course_video_recording', false, false, true, true),
  ('course_image_upload', true, true, true, true)
ON CONFLICT (feature_key) DO NOTHING;
