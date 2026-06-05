
DROP POLICY IF EXISTS "Anyone can update link click counts" ON public.material_links;

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, user_id, full_name, avatar_url, slug, bio, city, country, category, category_id,
  company_name, job_title, industry, experience, experience_level, education,
  certifications, tags, social_links, linkedin_profile, intro_video_url,
  is_suspended, public_listing_status, coach_profile_image_url,
  profile_image_status, last_active_at, created_at, updated_at
) ON public.profiles TO anon;
