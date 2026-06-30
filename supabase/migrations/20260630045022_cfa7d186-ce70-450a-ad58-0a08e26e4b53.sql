
-- 1. communication_settings: restrict SELECT to admin only
DROP POLICY IF EXISTS "Authenticated can read communication settings" ON public.communication_settings;
CREATE POLICY "Admins can read communication settings"
ON public.communication_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. feature_access_audit_log: lock INSERT to admins / service_role
DROP POLICY IF EXISTS "Authenticated inserts audit" ON public.feature_access_audit_log;
CREATE POLICY "Admins insert audit"
ON public.feature_access_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. webinars.webinar_link: revoke column-level SELECT from public roles.
-- Public listings continue to work via other columns; join link must be fetched
-- via the SECURITY DEFINER RPCs (get_webinar_join_link / get_owner_webinar_link).
REVOKE SELECT (webinar_link) ON public.webinars FROM anon;
REVOKE SELECT (webinar_link) ON public.webinars FROM authenticated;
