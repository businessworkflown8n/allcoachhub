
ALTER VIEW public.coach_public_profiles SET (security_invoker = true);

GRANT SELECT (
  id, user_id, full_name, slug, avatar_url, bio, category, category_id,
  experience, experience_level, job_title, company_name, industry,
  country, city, tags, certifications, education, social_links,
  intro_video_url, linkedin_profile, is_suspended, public_listing_status,
  last_active_at, created_at
) ON public.profiles TO anon, authenticated;
