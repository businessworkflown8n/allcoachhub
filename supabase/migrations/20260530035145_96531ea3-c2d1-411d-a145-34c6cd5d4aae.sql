-- Public can read APPROVED coach-category assignments (needed for /categories pages)
CREATE POLICY "Public can read approved category assignments"
ON public.coach_category_permissions
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

GRANT SELECT ON public.coach_category_permissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_category_permissions TO authenticated;
GRANT ALL ON public.coach_category_permissions TO service_role;