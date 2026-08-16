-- Recreates storage buckets + RLS policies that existed on the previous Supabase
-- project but were not carried over when the app was pointed at the migrated
-- project (fwtmgvszacuebhxnshct). Storage buckets/objects live outside the
-- Postgres schema dump, so they had to be recreated explicitly. This migration
-- documents that recreation (already applied directly against the project) so
-- it is tracked in version control and replays cleanly on any future project.

-- 1. coach-profile-images (public; coach profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('coach-profile-images','coach-profile-images', true, 5242880,
        ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp'];

DROP POLICY IF EXISTS "coach_profile_images_public_read" ON storage.objects;
CREATE POLICY "coach_profile_images_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'coach-profile-images');

DROP POLICY IF EXISTS "coach_profile_images_owner_insert" ON storage.objects;
CREATE POLICY "coach_profile_images_owner_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-profile-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "coach_profile_images_owner_update" ON storage.objects;
CREATE POLICY "coach_profile_images_owner_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-profile-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "coach_profile_images_admin_delete" ON storage.objects;
CREATE POLICY "coach_profile_images_admin_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-profile-images'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- 2. course-thumbnails (public; admin-managed, coach owns own folder)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

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

-- 3. certificate-templates (private; admin write, authenticated read via signed URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('certificate-templates', 'certificate-templates', false, 5242880,
        ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage certificate-templates objects" ON storage.objects;
CREATE POLICY "Admins manage certificate-templates objects"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'certificate-templates' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'certificate-templates' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated read certificate-templates" ON storage.objects;
CREATE POLICY "Authenticated read certificate-templates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certificate-templates');

-- 4. coach-logos (private; owner manages own folder, authenticated read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('coach-logos', 'coach-logos', false, 2097152,
        ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Coach manages own logo" ON storage.objects;
CREATE POLICY "Coach manages own logo"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'coach-logos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (bucket_id = 'coach-logos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Authenticated read coach-logos" ON storage.objects;
CREATE POLICY "Authenticated read coach-logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'coach-logos');

-- 5. certificate-signatures (private; owner/admin manage own folder, owner/admin read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('certificate-signatures', 'certificate-signatures', false, 2097152,
        ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Owner or admin read certificate signatures" ON storage.objects;
CREATE POLICY "Owner or admin read certificate signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificate-signatures'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Coach uploads own signature" ON storage.objects;
CREATE POLICY "Coach uploads own signature"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificate-signatures'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Coach updates own signature" ON storage.objects;
CREATE POLICY "Coach updates own signature"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificate-signatures'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Coach deletes own signature" ON storage.objects;
CREATE POLICY "Coach deletes own signature"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificate-signatures'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

-- 6. certificate-pdfs (private; issue-certificate edge function writes via service role, authenticated read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('certificate-pdfs', 'certificate-pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Read certificate PDFs" ON storage.objects;
CREATE POLICY "Read certificate PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificate-pdfs');

DROP POLICY IF EXISTS "Coach writes own certificate PDFs" ON storage.objects;
CREATE POLICY "Coach writes own certificate PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificate-pdfs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Coach updates own certificate PDFs" ON storage.objects;
CREATE POLICY "Coach updates own certificate PDFs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificate-pdfs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );
