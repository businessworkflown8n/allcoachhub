CREATE POLICY "Public can view active coach profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  is_suspended = false
  AND COALESCE(public_listing_status, 'active') = 'active'
  AND public.has_role(user_id, 'coach'::app_role)
);