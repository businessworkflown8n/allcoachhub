-- Allow guests (anon) to read the public coach directory.
-- The view coach_public_profiles already filters to non-suspended, public-listing coaches,
-- so running it as the view owner (bypassing the column-level PII restrictions on profiles
-- for anon) is safe and matches the "public directory" intent.
ALTER VIEW public.coach_public_profiles SET (security_invoker = off);
GRANT SELECT ON public.coach_public_profiles TO anon, authenticated;