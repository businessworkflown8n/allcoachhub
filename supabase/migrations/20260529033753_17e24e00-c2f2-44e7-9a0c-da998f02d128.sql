
-- Create public course-thumbnails bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS policies for course-thumbnails
DROP POLICY IF EXISTS "Public read course-thumbnails" ON storage.objects;
CREATE POLICY "Public read course-thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "Admins manage course-thumbnails" ON storage.objects;
CREATE POLICY "Admins manage course-thumbnails"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Coaches upload own course-thumbnails" ON storage.objects;
CREATE POLICY "Coaches upload own course-thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-thumbnails'
    AND public.has_role(auth.uid(), 'coach'::app_role)
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Coaches update own course-thumbnails" ON storage.objects;
CREATE POLICY "Coaches update own course-thumbnails"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-thumbnails'
    AND public.has_role(auth.uid(), 'coach'::app_role)
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Coaches delete own course-thumbnails" ON storage.objects;
CREATE POLICY "Coaches delete own course-thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-thumbnails'
    AND public.has_role(auth.uid(), 'coach'::app_role)
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Add tracking columns to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS thumbnail_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS thumbnail_updated_by uuid;
