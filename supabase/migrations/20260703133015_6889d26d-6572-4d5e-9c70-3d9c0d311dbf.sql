
-- 1) profiles: prevent anonymous scraping of coach contact PII (email, phone, whatsapp, city, etc.)
--    Column-level SELECT privileges limit what anon can read; RLS row policy is unchanged.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, user_id, full_name, avatar_url, created_at, updated_at, bio, category,
  experience, certifications, social_links, intro_video_url, education,
  job_title, industry, experience_level, country, is_suspended, slug,
  category_id, public_listing_status, coach_profile_image_url, profile_image_status
) ON public.profiles TO anon;

-- 2) drive_connections: never send OAuth access/refresh tokens to the browser.
--    Tokens are still readable by service_role (edge functions); coach client sessions
--    can read all non-token columns.
REVOKE SELECT (access_token, refresh_token) ON public.drive_connections FROM authenticated, anon;
