
-- DRIVE_CONNECTIONS: remove client SELECT of token columns
DROP POLICY IF EXISTS "Coach views own drive connection" ON public.drive_connections;
DROP POLICY IF EXISTS "Admin sees all drive connections" ON public.drive_connections;

REVOKE SELECT ON public.drive_connections FROM anon, authenticated;

GRANT SELECT (id, coach_id, provider, google_account_email, expires_at, scope, root_folder_id, subfolder_ids, status, connected_at, last_sync_at, quota_total, quota_used, created_at, updated_at)
  ON public.drive_connections TO authenticated;

CREATE POLICY "Coach views own drive connection metadata"
  ON public.drive_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Admin views all drive connection metadata"
  ON public.drive_connections FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- GSC_CONNECTIONS: split ALL policy so tokens are not client-readable
DROP POLICY IF EXISTS "Users manage own GSC connection" ON public.gsc_connections;
DROP POLICY IF EXISTS "Admins view all GSC connections" ON public.gsc_connections;

REVOKE SELECT ON public.gsc_connections FROM anon, authenticated;

GRANT SELECT (id, user_id, site_url, token_expires_at, scope, status, last_synced_at, created_at, updated_at)
  ON public.gsc_connections TO authenticated;

CREATE POLICY "Users view own GSC connection metadata"
  ON public.gsc_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own GSC connection"
  ON public.gsc_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own GSC connection"
  ON public.gsc_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own GSC connection"
  ON public.gsc_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view GSC connection metadata"
  ON public.gsc_connections FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
