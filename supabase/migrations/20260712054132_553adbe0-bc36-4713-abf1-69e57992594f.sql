
-- ad_platform_connections: hide credentials_encrypted from clients
REVOKE SELECT ON public.ad_platform_connections FROM authenticated, anon;
GRANT SELECT (id, coach_id, platform, status, last_sync_at, error_log, created_at, updated_at, account_id, account_name, currency, timezone, sync_frequency, token_expires_at, needs_reconnect, sync_data_scope) ON public.ad_platform_connections TO authenticated;
GRANT ALL ON public.ad_platform_connections TO service_role;

-- drive_connections: hide access_token, refresh_token from clients
REVOKE SELECT ON public.drive_connections FROM authenticated, anon;
GRANT SELECT (id, coach_id, provider, google_account_email, expires_at, scope, root_folder_id, subfolder_ids, status, connected_at, last_sync_at, quota_total, quota_used, created_at, updated_at) ON public.drive_connections TO authenticated;
GRANT ALL ON public.drive_connections TO service_role;

-- gsc_connections: hide access_token, refresh_token from clients
REVOKE SELECT ON public.gsc_connections FROM authenticated, anon;
GRANT SELECT (id, user_id, site_url, token_expires_at, scope, status, last_synced_at, created_at, updated_at) ON public.gsc_connections TO authenticated;
GRANT ALL ON public.gsc_connections TO service_role;

-- whatsapp_credentials: hide user_id_enc, password_enc from clients
REVOKE SELECT ON public.whatsapp_credentials FROM authenticated, anon;
GRANT SELECT (id, coach_id, login_url, updated_by, created_at, updated_at) ON public.whatsapp_credentials TO authenticated;
GRANT ALL ON public.whatsapp_credentials TO service_role;
