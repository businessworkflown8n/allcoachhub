
-- 1) Restrict anon access to sensitive coach contact columns on profiles
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, user_id, full_name, avatar_url, created_at, updated_at, bio, category,
  experience, certifications, social_links, intro_video_url, education, job_title,
  industry, experience_level, country, city, linkedin_profile, is_suspended,
  company_name, tags, last_active_at, slug, category_id, public_listing_status,
  coach_profile_image_url, profile_image_status
) ON public.profiles TO anon;

-- 2) Lock down chat_history INSERT to authenticated users only
DROP POLICY IF EXISTS "Validated lead can insert chat" ON public.chat_history;
CREATE POLICY "Authenticated users insert chat for valid lead"
ON public.chat_history
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.chatbot_leads WHERE id = chat_history.lead_id)
);

-- 3) Restrict certificate-pdfs SELECT to owner folder or admin
DROP POLICY IF EXISTS "Read certificate PDFs" ON storage.objects;
CREATE POLICY "Owner or admin read certificate PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificate-pdfs'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
