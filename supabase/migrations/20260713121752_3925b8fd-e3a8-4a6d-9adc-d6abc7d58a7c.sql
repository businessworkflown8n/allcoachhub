-- Allow public read of communication settings so the frontend toggles apply for anon/learner/coach users
GRANT SELECT ON public.communication_settings TO anon;

CREATE POLICY "Public can read communication settings"
ON public.communication_settings
FOR SELECT
TO anon, authenticated
USING (true);