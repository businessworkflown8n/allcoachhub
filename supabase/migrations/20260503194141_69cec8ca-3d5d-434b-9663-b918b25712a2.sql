
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_listing_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_public_listing_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_public_listing_status_check
  CHECK (public_listing_status IN ('active','hold'));

DROP VIEW IF EXISTS public.coach_public_profiles;

CREATE VIEW public.coach_public_profiles
WITH (security_invoker=on) AS
SELECT id, user_id, full_name, slug, avatar_url, bio, category, category_id,
       experience, experience_level, job_title, company_name, industry,
       country, city, tags, certifications, education, social_links,
       intro_video_url, linkedin_profile, is_suspended,
       public_listing_status, last_active_at, created_at
FROM public.profiles p
WHERE is_suspended = false
  AND public_listing_status = 'active'
  AND has_role(user_id, 'coach'::app_role);

GRANT SELECT ON public.coach_public_profiles TO anon, authenticated;
