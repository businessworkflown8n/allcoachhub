-- 1) coach_category_permissions: restrict readable columns
REVOKE SELECT ON public.coach_category_permissions FROM anon, authenticated;
GRANT SELECT (id, coach_id, category_id, is_primary, status) ON public.coach_category_permissions TO anon, authenticated;
GRANT ALL ON public.coach_category_permissions TO service_role;

-- 2) drive_files: hide direct-download link from clients
REVOKE SELECT ON public.drive_files FROM anon, authenticated;
GRANT SELECT (
  id, coach_id, drive_file_id, name, mime_type, size_bytes, parent_folder_id,
  category, web_view_link, thumbnail_link, course_id, lesson_id, visibility,
  ai_tags, ai_summary, transcript, ai_processed_at, uploaded_at,
  last_synced_at, created_at, updated_at
) ON public.drive_files TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.drive_files TO authenticated;
GRANT ALL ON public.drive_files TO service_role;

-- 3) coach_certificate_counters: explicit read policies; writes remain service-role only
GRANT SELECT ON public.coach_certificate_counters TO authenticated;
GRANT ALL ON public.coach_certificate_counters TO service_role;

DROP POLICY IF EXISTS "Coaches view own certificate counter" ON public.coach_certificate_counters;
CREATE POLICY "Coaches view own certificate counter"
ON public.coach_certificate_counters
FOR SELECT TO authenticated
USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins view certificate counters" ON public.coach_certificate_counters;
CREATE POLICY "Admins view certificate counters"
ON public.coach_certificate_counters
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) material_links: owner-scoped read policy (admins already have ALL)
GRANT SELECT ON public.material_links TO authenticated;
GRANT ALL ON public.material_links TO service_role;

DROP POLICY IF EXISTS "Coaches view own material links" ON public.material_links;
CREATE POLICY "Coaches view own material links"
ON public.material_links
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.materials m
    WHERE m.id = material_links.material_id
      AND m.coach_id = auth.uid()
  )
);

-- 5) whatsapp_credential_requests: allow cleanup of stale requests
GRANT DELETE ON public.whatsapp_credential_requests TO authenticated;

DROP POLICY IF EXISTS "Coaches delete own pending requests" ON public.whatsapp_credential_requests;
CREATE POLICY "Coaches delete own pending requests"
ON public.whatsapp_credential_requests
FOR DELETE TO authenticated
USING (coach_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins delete credential requests" ON public.whatsapp_credential_requests;
CREATE POLICY "Admins delete credential requests"
ON public.whatsapp_credential_requests
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));