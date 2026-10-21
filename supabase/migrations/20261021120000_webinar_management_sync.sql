-- Webinar Management & Centralized Synchronization
--
-- Additive only. Extends existing tables (coach_feature_flags, webinars) and adds
-- draft / version-history / outbox tables keyed by the existing webinars.id.
--
-- Design:
--   * public.webinars stays the single authoritative record. The published
--     configuration IS the webinars row; config_version counts publishes.
--   * Drafts live in webinar_config_drafts and never touch webinars until publish,
--     so public pages and integrations never see unpublished values.
--   * Every committed config change on a managed webinar (config_version > 0)
--     writes a webinar_config_versions snapshot AND one webinar_sync_jobs row per
--     destination in the same transaction (transactional outbox).
--   * Webinars never published through Manage Webinar (config_version = 0) keep
--     their existing behaviour exactly; none of the guards below apply to them.
--
-- Rollback (drop new objects; leaves existing data untouched):
--   DROP TRIGGER IF EXISTS wm_webinars_before_insert ON public.webinars;
--   DROP TRIGGER IF EXISTS wm_webinars_before_update ON public.webinars;
--   DROP TRIGGER IF EXISTS wm_webinars_after_update ON public.webinars;
--   DROP TRIGGER IF EXISTS wm_feature_flags_audit ON public.coach_feature_flags;
--   DROP TABLE IF EXISTS public.webinar_sync_jobs, public.webinar_config_versions, public.webinar_config_drafts;

-- ---------------------------------------------------------------------------
-- 1. Per-coach permissions on the existing feature-permission table
-- ---------------------------------------------------------------------------
ALTER TABLE public.coach_feature_flags
  ADD COLUMN IF NOT EXISTS webinar_mgmt_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webinar_mgmt_edit_schedule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webinar_mgmt_edit_join_url boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webinar_mgmt_edit_whatsapp_url boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webinar_mgmt_edit_registration_url boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webinar_mgmt_publish boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webinar_mgmt_view_sync boolean NOT NULL DEFAULT false;

-- Every permission requires webinar_mgmt_access as well, so switching access off
-- revokes everything at once without touching the other toggles.
CREATE OR REPLACE FUNCTION public.wm_has_permission(_uid uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT f.webinar_mgmt_access AND CASE _perm
      WHEN 'access' THEN true
      WHEN 'edit_schedule' THEN f.webinar_mgmt_edit_schedule
      WHEN 'edit_join_url' THEN f.webinar_mgmt_edit_join_url
      WHEN 'edit_whatsapp_url' THEN f.webinar_mgmt_edit_whatsapp_url
      WHEN 'edit_registration_url' THEN f.webinar_mgmt_edit_registration_url
      WHEN 'publish' THEN f.webinar_mgmt_publish
      WHEN 'view_sync' THEN f.webinar_mgmt_view_sync
      ELSE false
    END
    FROM public.coach_feature_flags f
    WHERE f.coach_id = _uid
  ), false);
$$;

REVOKE ALL ON FUNCTION public.wm_has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wm_has_permission(uuid, text) TO authenticated, service_role;

-- Audit permission changes into the existing feature_control_audit table.
CREATE OR REPLACE FUNCTION public.wm_audit_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_new := jsonb_build_object(
    'access', NEW.webinar_mgmt_access,
    'edit_schedule', NEW.webinar_mgmt_edit_schedule,
    'edit_join_url', NEW.webinar_mgmt_edit_join_url,
    'edit_whatsapp_url', NEW.webinar_mgmt_edit_whatsapp_url,
    'edit_registration_url', NEW.webinar_mgmt_edit_registration_url,
    'publish', NEW.webinar_mgmt_publish,
    'view_sync', NEW.webinar_mgmt_view_sync
  );
  IF TG_OP = 'UPDATE' THEN
    v_old := jsonb_build_object(
      'access', OLD.webinar_mgmt_access,
      'edit_schedule', OLD.webinar_mgmt_edit_schedule,
      'edit_join_url', OLD.webinar_mgmt_edit_join_url,
      'edit_whatsapp_url', OLD.webinar_mgmt_edit_whatsapp_url,
      'edit_registration_url', OLD.webinar_mgmt_edit_registration_url,
      'publish', OLD.webinar_mgmt_publish,
      'view_sync', OLD.webinar_mgmt_view_sync
    );
    IF v_old = v_new THEN
      RETURN NEW;
    END IF;
  ELSIF NOT (v_new @? '$.* ? (@ == true)') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.feature_control_audit (feature_key, scope, coach_id, changed_by, old_value, new_value)
  VALUES ('webinar_management', 'coach', NEW.coach_id, auth.uid(), v_old, v_new);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wm_feature_flags_audit ON public.coach_feature_flags;
CREATE TRIGGER wm_feature_flags_audit
  AFTER INSERT OR UPDATE ON public.coach_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.wm_audit_permission_change();

-- ---------------------------------------------------------------------------
-- 2. Extend the existing webinars table (no duplicate webinar records)
-- ---------------------------------------------------------------------------
ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS whatsapp_group_url text,
  ADD COLUMN IF NOT EXISTS registration_page_url text,
  ADD COLUMN IF NOT EXISTS calendar_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS config_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS config_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS config_updated_by uuid;

COMMENT ON COLUMN public.webinars.config_version IS
  'Published configuration version from Manage Webinar. 0 = not managed (legacy behaviour).';

-- Start instant of a webinar in UTC, or NULL if the stored timezone is not a valid IANA name.
CREATE OR REPLACE FUNCTION public.wm_start_utc(_date date, _time time, _tz text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (_date + _time) AT TIME ZONE _tz;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.wm_iso_utc(_ts timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char(_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
$$;

-- Canonical configuration snapshot. This is the payload every destination receives.
CREATE OR REPLACE FUNCTION public.wm_snapshot(w public.webinars)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := public.wm_start_utc(w.webinar_date, w.webinar_time, w.timezone);
BEGIN
  RETURN jsonb_build_object(
    'webinar_id', w.id,
    'coach_id', w.coach_id,
    'version', w.config_version,
    'title', w.title,
    'date', to_char(w.webinar_date, 'YYYY-MM-DD'),
    'start_time', to_char(w.webinar_time, 'HH24:MI'),
    'end_time', to_char(w.webinar_time + make_interval(mins => w.duration_minutes), 'HH24:MI'),
    'duration_minutes', w.duration_minutes,
    'timezone', w.timezone,
    'start_at_utc', public.wm_iso_utc(v_start),
    'end_at_utc', public.wm_iso_utc(v_start + make_interval(mins => w.duration_minutes)),
    'webinar_url', w.webinar_link,
    'webinar_url_status', w.webinar_link_status,
    'whatsapp_url', w.whatsapp_group_url,
    'registration_url', w.registration_page_url,
    'calendar_details', COALESCE(w.calendar_details, '{}'::jsonb),
    'is_published', w.is_published,
    'published_at', public.wm_iso_utc(w.config_published_at),
    'updated_by', w.config_updated_by
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wm_snapshot(public.webinars) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Drafts, version history, sync outbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webinar_config_drafts (
  webinar_id uuid PRIMARY KEY REFERENCES public.webinars(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  draft jsonb NOT NULL,
  base_version integer NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webinar_config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  version integer NOT NULL,
  config jsonb NOT NULL,
  previous_config jsonb,
  changed_fields text[] NOT NULL DEFAULT '{}',
  change_source text NOT NULL DEFAULT 'manage_webinar',
  change_summary text,
  published_by uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webinar_id, version)
);

CREATE TABLE IF NOT EXISTS public.webinar_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  config_version integer NOT NULL,
  destination text NOT NULL
    CHECK (destination IN ('website', 'google_sheets', 'webhooks', 'whatsapp', 'calendar', 'reminders')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'synced', 'failed', 'skipped', 'superseded')),
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  previous_config jsonb,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 6,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  last_error_code text,
  attempt_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  response jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wm_jobs_due ON public.webinar_sync_jobs (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_wm_jobs_webinar ON public.webinar_sync_jobs (webinar_id, destination, config_version DESC);
CREATE INDEX IF NOT EXISTS idx_wm_versions_webinar ON public.webinar_config_versions (webinar_id, version DESC);

ALTER TABLE public.webinar_config_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Read-only from the client. All writes go through the SECURITY DEFINER functions
-- below (called by the webinar-management edge function with the service role).
REVOKE INSERT, UPDATE, DELETE ON public.webinar_config_drafts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.webinar_config_versions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.webinar_sync_jobs FROM anon, authenticated;
REVOKE ALL ON public.webinar_config_drafts FROM anon;
REVOKE ALL ON public.webinar_config_versions FROM anon;
REVOKE ALL ON public.webinar_sync_jobs FROM anon;

CREATE POLICY "Coach reads own webinar drafts" ON public.webinar_config_drafts
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid() AND public.wm_has_permission(auth.uid(), 'access'));
CREATE POLICY "Admins read webinar drafts" ON public.webinar_config_drafts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coach reads own webinar versions" ON public.webinar_config_versions
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid() AND public.wm_has_permission(auth.uid(), 'access'));
CREATE POLICY "Admins read webinar versions" ON public.webinar_config_versions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coach reads own webinar sync jobs" ON public.webinar_sync_jobs
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid() AND public.wm_has_permission(auth.uid(), 'view_sync'));
CREATE POLICY "Admins read webinar sync jobs" ON public.webinar_sync_jobs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 4. Guards on webinars
-- ---------------------------------------------------------------------------

-- Version bookkeeping can only be set by the publish path, never by a client insert.
CREATE OR REPLACE FUNCTION public.wm_webinars_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.config_version := 0;
  NEW.config_published_at := NULL;
  NEW.config_updated_by := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wm_webinars_before_insert ON public.webinars;
CREATE TRIGGER wm_webinars_before_insert
  BEFORE INSERT ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.wm_webinars_before_insert();

CREATE OR REPLACE FUNCTION public.wm_webinars_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_publishing boolean := COALESCE(current_setting('wm.publishing', true), '') = NEW.id::text;
  v_config_changed boolean;
BEGIN
  IF v_publishing THEN
    RETURN NEW; -- wm_publish_config sets version fields itself
  END IF;

  -- Nobody outside the publish path may change version bookkeeping.
  NEW.config_version := OLD.config_version;
  NEW.config_published_at := OLD.config_published_at;
  NEW.config_updated_by := OLD.config_updated_by;

  IF OLD.config_version = 0 THEN
    RETURN NEW; -- unmanaged webinar: existing behaviour unchanged
  END IF;

  v_config_changed :=
    (NEW.title, NEW.webinar_date, NEW.webinar_time, NEW.duration_minutes, NEW.timezone,
     NEW.webinar_link, NEW.webinar_link_status, NEW.whatsapp_group_url,
     NEW.registration_page_url, NEW.calendar_details)
    IS DISTINCT FROM
    (OLD.title, OLD.webinar_date, OLD.webinar_time, OLD.duration_minutes, OLD.timezone,
     OLD.webinar_link, OLD.webinar_link_status, OLD.whatsapp_group_url,
     OLD.registration_page_url, OLD.calendar_details);

  IF NOT v_config_changed AND NEW.is_published IS NOT DISTINCT FROM OLD.is_published THEN
    RETURN NEW;
  END IF;

  -- A managed webinar's schedule, title and links can only change through Manage
  -- Webinar (permission + approval checks) or by an admin. This stops the legacy
  -- editor or a direct API call from bypassing disabled permissions or the link
  -- approval (webinar_link_status) workflow.
  IF v_config_changed AND v_uid IS NOT NULL AND NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'This webinar is managed through Manage Webinar. Use Manage Webinar to change its title, schedule or links.'
      USING ERRCODE = 'P0001', HINT = 'WM_MANAGED';
  END IF;

  -- Admin edits, link approvals and visibility changes become a new published
  -- version so every destination receives them.
  NEW.config_version := OLD.config_version + 1;
  NEW.config_published_at := now();
  NEW.config_updated_by := v_uid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wm_webinars_before_update ON public.webinars;
CREATE TRIGGER wm_webinars_before_update
  BEFORE UPDATE ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.wm_webinars_before_update();

-- Records the version snapshot and enqueues one sync job per destination, in the
-- same transaction as the webinars update (transactional outbox).
CREATE OR REPLACE FUNCTION public.wm_webinars_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev jsonb;
  v_cur jsonb;
  v_changed text[];
  v_source text;
  v_actor uuid;
  v_dest text;
BEGIN
  IF NEW.config_version <= OLD.config_version THEN
    RETURN NULL;
  END IF;

  v_cur := public.wm_snapshot(NEW);
  v_prev := CASE WHEN OLD.config_version > 0 THEN public.wm_snapshot(OLD) ELSE NULL END;

  SELECT COALESCE(array_agg(k ORDER BY k), '{}')
    INTO v_changed
  FROM jsonb_object_keys(v_cur) AS k
  WHERE k NOT IN ('version', 'published_at', 'updated_by')
    AND (v_prev IS NULL OR v_cur -> k IS DISTINCT FROM v_prev -> k);

  v_actor := COALESCE(NULLIF(current_setting('wm.actor', true), '')::uuid, NEW.config_updated_by, auth.uid());
  v_source := COALESCE(NULLIF(current_setting('wm.source', true), ''),
    CASE
      WHEN v_changed = ARRAY['webinar_url_status'] THEN 'link_approval'
      WHEN v_actor IS NOT NULL AND public.has_role(v_actor, 'admin'::app_role) THEN 'admin'
      WHEN v_actor = NEW.coach_id THEN 'coach'
      ELSE 'system'
    END);

  INSERT INTO public.webinar_config_versions
    (webinar_id, coach_id, version, config, previous_config, changed_fields, change_source, change_summary, published_by, published_at)
  VALUES
    (NEW.id, NEW.coach_id, NEW.config_version, v_cur, v_prev, v_changed, v_source,
     NULLIF(current_setting('wm.summary', true), ''), v_actor, COALESCE(NEW.config_published_at, now()));

  -- Older work for this webinar must never overwrite this version.
  UPDATE public.webinar_sync_jobs
     SET status = 'superseded', updated_at = now(),
         last_error = 'Superseded by version ' || NEW.config_version
   WHERE webinar_id = NEW.id
     AND config_version < NEW.config_version
     AND status IN ('pending', 'failed');

  FOREACH v_dest IN ARRAY ARRAY['website', 'google_sheets', 'webhooks', 'whatsapp', 'calendar', 'reminders'] LOOP
    INSERT INTO public.webinar_sync_jobs
      (webinar_id, coach_id, config_version, destination, idempotency_key, payload, previous_config)
    VALUES
      (NEW.id, NEW.coach_id, NEW.config_version, v_dest,
       NEW.id::text || ':v' || NEW.config_version || ':' || v_dest, v_cur, v_prev)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor, 'webinar_config_published', 'webinar', NEW.id,
          jsonb_build_object('version', NEW.config_version, 'changed_fields', v_changed, 'source', v_source));

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS wm_webinars_after_update ON public.webinars;
CREATE TRIGGER wm_webinars_after_update
  AFTER UPDATE ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.wm_webinars_after_update();

-- ---------------------------------------------------------------------------
-- 5. Validation (shared by save-draft and publish)
-- ---------------------------------------------------------------------------
-- Draft shape: { title, date, start_time, end_time, timezone, webinar_url,
--                whatsapp_url, registration_url, calendar_details }
CREATE OR REPLACE FUNCTION public.wm_validate_config(_c jsonb)
RETURNS integer -- duration in minutes
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_start time;
  v_end time;
  v_duration integer;
  v_key text;
BEGIN
  IF jsonb_typeof(_c) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid configuration' USING HINT = 'WM_INVALID';
  END IF;

  IF length(btrim(COALESCE(_c ->> 'title', ''))) NOT BETWEEN 3 AND 200 THEN
    RAISE EXCEPTION 'Title must be between 3 and 200 characters' USING HINT = 'WM_INVALID';
  END IF;

  IF COALESCE(_c ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Date must be YYYY-MM-DD' USING HINT = 'WM_INVALID';
  END IF;
  BEGIN
    PERFORM (_c ->> 'date')::date;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Date is not a valid calendar date' USING HINT = 'WM_INVALID';
  END;

  IF COALESCE(_c ->> 'start_time', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
     OR COALESCE(_c ->> 'end_time', '') !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'Start and end times must be HH:MM (24-hour)' USING HINT = 'WM_INVALID';
  END IF;
  v_start := (_c ->> 'start_time')::time;
  v_end := (_c ->> 'end_time')::time;
  v_duration := (EXTRACT(EPOCH FROM (v_end - v_start)) / 60)::integer;
  IF v_duration <= 0 THEN
    v_duration := v_duration + 1440; -- ends after midnight
  END IF;
  IF v_duration NOT BETWEEN 15 AND 720 THEN
    RAISE EXCEPTION 'Webinar length must be between 15 minutes and 12 hours' USING HINT = 'WM_INVALID';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _c ->> 'timezone')
     OR (_c ->> 'timezone') !~ '^[A-Za-z]+(/[A-Za-z0-9_+-]+)+$|^UTC$' THEN
    RAISE EXCEPTION 'Timezone must be a valid IANA identifier such as Asia/Kolkata' USING HINT = 'WM_INVALID';
  END IF;

  IF COALESCE(_c ->> 'webinar_url', '') !~ '^https://[^\s<>"]+$' OR length(_c ->> 'webinar_url') > 2048 THEN
    RAISE EXCEPTION 'Joining URL must be a valid https:// link' USING HINT = 'WM_INVALID';
  END IF;

  IF NULLIF(_c ->> 'whatsapp_url', '') IS NOT NULL
     AND ((_c ->> 'whatsapp_url') !~ '^https://(chat\.whatsapp\.com|(www\.)?whatsapp\.com|wa\.me)/[^\s<>"]+$'
          OR length(_c ->> 'whatsapp_url') > 2048) THEN
    RAISE EXCEPTION 'WhatsApp URL must be a chat.whatsapp.com, whatsapp.com or wa.me https:// link' USING HINT = 'WM_INVALID';
  END IF;

  IF NULLIF(_c ->> 'registration_url', '') IS NOT NULL
     AND ((_c ->> 'registration_url') !~ '^https://[^\s<>"]+$' OR length(_c ->> 'registration_url') > 2048) THEN
    RAISE EXCEPTION 'Registration page URL must be a valid https:// link' USING HINT = 'WM_INVALID';
  END IF;

  IF _c ? 'calendar_details' AND jsonb_typeof(_c -> 'calendar_details') <> 'null' THEN
    IF jsonb_typeof(_c -> 'calendar_details') <> 'object' THEN
      RAISE EXCEPTION 'Calendar details must be an object' USING HINT = 'WM_INVALID';
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(_c -> 'calendar_details') LOOP
      IF v_key NOT IN ('provider', 'calendar_id', 'event_id', 'notes') THEN
        RAISE EXCEPTION 'Unsupported calendar field: %', v_key USING HINT = 'WM_INVALID';
      END IF;
      IF length(COALESCE(_c -> 'calendar_details' ->> v_key, '')) > 500 THEN
        RAISE EXCEPTION 'Calendar field % is too long', v_key USING HINT = 'WM_INVALID';
      END IF;
    END LOOP;
    IF COALESCE(_c -> 'calendar_details' ->> 'provider', 'none') NOT IN ('none', 'google', 'outlook', 'other') THEN
      RAISE EXCEPTION 'Calendar provider must be none, google, outlook or other' USING HINT = 'WM_INVALID';
    END IF;
  END IF;

  RETURN v_duration;
END;
$$;

-- Which permission each changed field needs. Returns the first missing permission, or NULL.
CREATE OR REPLACE FUNCTION public.wm_missing_field_permission(_actor uuid, w public.webinars, _c jsonb, _duration integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (_c ->> 'date', _c ->> 'start_time', _duration, _c ->> 'timezone')
     IS DISTINCT FROM (to_char(w.webinar_date, 'YYYY-MM-DD'), to_char(w.webinar_time, 'HH24:MI'), w.duration_minutes, w.timezone)
     AND NOT public.wm_has_permission(_actor, 'edit_schedule') THEN
    RETURN 'edit_schedule';
  END IF;
  IF (_c ->> 'webinar_url') IS DISTINCT FROM w.webinar_link
     AND NOT public.wm_has_permission(_actor, 'edit_join_url') THEN
    RETURN 'edit_join_url';
  END IF;
  IF NULLIF(_c ->> 'whatsapp_url', '') IS DISTINCT FROM w.whatsapp_group_url
     AND NOT public.wm_has_permission(_actor, 'edit_whatsapp_url') THEN
    RETURN 'edit_whatsapp_url';
  END IF;
  IF NULLIF(_c ->> 'registration_url', '') IS DISTINCT FROM w.registration_page_url
     AND NOT public.wm_has_permission(_actor, 'edit_registration_url') THEN
    RETURN 'edit_registration_url';
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Coach operations (service_role only; the edge function verifies the JWT
--    and passes the authenticated user id as _actor)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wm_load_owned_webinar(_actor uuid, _webinar_id uuid)
RETURNS public.webinars
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.webinars;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING HINT = 'WM_UNAUTHENTICATED';
  END IF;
  SELECT * INTO w FROM public.webinars WHERE id = _webinar_id FOR UPDATE;
  -- Same message for "missing" and "not yours" so ids of other coaches' webinars are not confirmed.
  IF w.id IS NULL OR w.coach_id <> _actor THEN
    RAISE EXCEPTION 'Webinar not found' USING HINT = 'WM_NOT_FOUND';
  END IF;
  IF NOT public.wm_has_permission(_actor, 'access') THEN
    RAISE EXCEPTION 'Webinar Management is not enabled for your account' USING HINT = 'WM_FORBIDDEN';
  END IF;
  RETURN w;
END;
$$;

CREATE OR REPLACE FUNCTION public.wm_save_draft(_actor uuid, _webinar_id uuid, _draft jsonb, _expected_revision integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.webinars;
  d public.webinar_config_drafts;
  v_duration integer;
  v_missing text;
  v_clean jsonb;
BEGIN
  w := public.wm_load_owned_webinar(_actor, _webinar_id);
  v_duration := public.wm_validate_config(_draft);
  v_missing := public.wm_missing_field_permission(_actor, w, _draft, v_duration);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'You do not have permission to change this field (%)', v_missing USING HINT = 'WM_FORBIDDEN';
  END IF;

  v_clean := jsonb_build_object(
    'title', btrim(_draft ->> 'title'),
    'date', _draft ->> 'date',
    'start_time', _draft ->> 'start_time',
    'end_time', _draft ->> 'end_time',
    'timezone', _draft ->> 'timezone',
    'webinar_url', btrim(_draft ->> 'webinar_url'),
    'whatsapp_url', NULLIF(btrim(COALESCE(_draft ->> 'whatsapp_url', '')), ''),
    'registration_url', NULLIF(btrim(COALESCE(_draft ->> 'registration_url', '')), ''),
    'calendar_details', COALESCE(_draft -> 'calendar_details', '{}'::jsonb)
  );

  SELECT * INTO d FROM public.webinar_config_drafts WHERE webinar_id = _webinar_id FOR UPDATE;
  IF d.webinar_id IS NULL THEN
    IF COALESCE(_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'This draft was discarded or published elsewhere. Reload to continue.' USING HINT = 'WM_CONFLICT';
    END IF;
    INSERT INTO public.webinar_config_drafts (webinar_id, coach_id, draft, base_version, revision, updated_by)
    VALUES (_webinar_id, w.coach_id, v_clean, w.config_version, 1, _actor)
    RETURNING * INTO d;
  ELSE
    IF d.revision <> COALESCE(_expected_revision, -1) THEN
      RAISE EXCEPTION 'This draft was changed in another session. Reload to see the latest draft.' USING HINT = 'WM_CONFLICT';
    END IF;
    UPDATE public.webinar_config_drafts
       SET draft = v_clean, revision = revision + 1, updated_by = _actor, updated_at = now()
     WHERE webinar_id = _webinar_id
    RETURNING * INTO d;
  END IF;

  RETURN jsonb_build_object('revision', d.revision, 'base_version', d.base_version, 'updated_at', d.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.wm_discard_draft(_actor uuid, _webinar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.wm_load_owned_webinar(_actor, _webinar_id);
  DELETE FROM public.webinar_config_drafts WHERE webinar_id = _webinar_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wm_publish_config(
  _actor uuid,
  _webinar_id uuid,
  _expected_version integer,
  _expected_revision integer,
  _summary text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.webinars;
  d public.webinar_config_drafts;
  c jsonb;
  v_duration integer;
  v_missing text;
  v_status text;
  v_link_changed boolean;
  v_schedule_changed boolean;
  v_start timestamptz;
BEGIN
  w := public.wm_load_owned_webinar(_actor, _webinar_id);

  IF NOT public.wm_has_permission(_actor, 'publish') THEN
    RAISE EXCEPTION 'You do not have permission to publish webinar changes' USING HINT = 'WM_FORBIDDEN';
  END IF;

  -- Existing Admin -> Coach approval workflow: only approved coaches publish.
  SELECT status INTO v_status FROM public.coach_feature_flags WHERE coach_id = _actor;
  IF COALESCE(v_status, 'pending') <> 'approved' THEN
    RAISE EXCEPTION 'Your coach account must be approved by an admin before publishing' USING HINT = 'WM_NOT_APPROVED';
  END IF;

  IF w.config_version <> COALESCE(_expected_version, -1) THEN
    RAISE EXCEPTION 'This webinar was updated by someone else (now version %). Reload before publishing.', w.config_version
      USING HINT = 'WM_CONFLICT';
  END IF;

  SELECT * INTO d FROM public.webinar_config_drafts WHERE webinar_id = _webinar_id FOR UPDATE;
  IF d.webinar_id IS NULL THEN
    IF w.config_version > 0 THEN
      RAISE EXCEPTION 'There are no draft changes to publish' USING HINT = 'WM_NO_CHANGES';
    END IF;
    -- First publish without edits: adopt the current record as version 1.
    c := jsonb_build_object(
      'title', w.title,
      'date', to_char(w.webinar_date, 'YYYY-MM-DD'),
      'start_time', to_char(w.webinar_time, 'HH24:MI'),
      'end_time', to_char(w.webinar_time + make_interval(mins => w.duration_minutes), 'HH24:MI'),
      'timezone', w.timezone,
      'webinar_url', w.webinar_link,
      'whatsapp_url', w.whatsapp_group_url,
      'registration_url', w.registration_page_url,
      'calendar_details', COALESCE(w.calendar_details, '{}'::jsonb)
    );
  ELSE
    IF d.revision <> COALESCE(_expected_revision, -1) THEN
      RAISE EXCEPTION 'The draft changed in another session. Reload before publishing.' USING HINT = 'WM_CONFLICT';
    END IF;
    IF d.base_version <> w.config_version THEN
      RAISE EXCEPTION 'This draft was started from version % but version % is now published. Discard the draft and edit again.',
        d.base_version, w.config_version USING HINT = 'WM_STALE_DRAFT';
    END IF;
    c := d.draft;
  END IF;

  v_duration := public.wm_validate_config(c);
  v_missing := public.wm_missing_field_permission(_actor, w, c, v_duration);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'You do not have permission to change this field (%)', v_missing USING HINT = 'WM_FORBIDDEN';
  END IF;

  v_schedule_changed := (c ->> 'date', c ->> 'start_time', v_duration, c ->> 'timezone')
    IS DISTINCT FROM (to_char(w.webinar_date, 'YYYY-MM-DD'), to_char(w.webinar_time, 'HH24:MI'), w.duration_minutes, w.timezone);
  v_link_changed := (c ->> 'webinar_url') IS DISTINCT FROM w.webinar_link;

  IF w.config_version > 0 AND NOT v_schedule_changed AND NOT v_link_changed
     AND btrim(c ->> 'title') IS NOT DISTINCT FROM w.title
     AND NULLIF(c ->> 'whatsapp_url', '') IS NOT DISTINCT FROM w.whatsapp_group_url
     AND NULLIF(c ->> 'registration_url', '') IS NOT DISTINCT FROM w.registration_page_url
     AND COALESCE(c -> 'calendar_details', '{}'::jsonb) IS NOT DISTINCT FROM COALESCE(w.calendar_details, '{}'::jsonb) THEN
    RAISE EXCEPTION 'The draft is identical to the published configuration' USING HINT = 'WM_NO_CHANGES';
  END IF;

  IF v_schedule_changed THEN
    v_start := ((c ->> 'date')::date + (c ->> 'start_time')::time) AT TIME ZONE (c ->> 'timezone');
    IF v_start <= now() THEN
      RAISE EXCEPTION 'The new start time is in the past' USING HINT = 'WM_INVALID';
    END IF;
  END IF;

  PERFORM set_config('wm.publishing', _webinar_id::text, true);
  PERFORM set_config('wm.actor', _actor::text, true);
  PERFORM set_config('wm.source', 'manage_webinar', true);
  PERFORM set_config('wm.summary', COALESCE(left(_summary, 500), ''), true);

  UPDATE public.webinars SET
    title = btrim(c ->> 'title'),
    webinar_date = (c ->> 'date')::date,
    webinar_time = (c ->> 'start_time')::time,
    duration_minutes = v_duration,
    timezone = c ->> 'timezone',
    webinar_link = c ->> 'webinar_url',
    -- A changed joining URL goes back through the existing admin link approval.
    webinar_link_status = CASE WHEN v_link_changed THEN 'pending' ELSE webinar_link_status END,
    whatsapp_group_url = NULLIF(c ->> 'whatsapp_url', ''),
    registration_page_url = NULLIF(c ->> 'registration_url', ''),
    calendar_details = COALESCE(c -> 'calendar_details', '{}'::jsonb),
    config_version = w.config_version + 1,
    config_published_at = now(),
    config_updated_by = _actor,
    updated_at = now()
  WHERE id = _webinar_id;

  PERFORM set_config('wm.publishing', '', true);
  PERFORM set_config('wm.source', '', true);
  PERFORM set_config('wm.summary', '', true);
  PERFORM set_config('wm.actor', '', true);

  DELETE FROM public.webinar_config_drafts WHERE webinar_id = _webinar_id;

  RETURN jsonb_build_object(
    'version', w.config_version + 1,
    'link_reapproval_required', v_link_changed AND w.config_version > 0,
    'schedule_changed', v_schedule_changed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wm_load_owned_webinar(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wm_save_draft(uuid, uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wm_discard_draft(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wm_publish_config(uuid, uuid, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wm_missing_field_permission(uuid, public.webinars, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wm_validate_config(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wm_save_draft(uuid, uuid, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.wm_discard_draft(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.wm_publish_config(uuid, uuid, integer, integer, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Queue operations
-- ---------------------------------------------------------------------------
-- Claims due jobs for the processor. Serialises work per (webinar, destination)
-- and supersedes anything older than the currently published version.
CREATE OR REPLACE FUNCTION public.wm_claim_sync_jobs(_worker text, _limit integer DEFAULT 20, _webinar_id uuid DEFAULT NULL)
RETURNS SETOF public.webinar_sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.webinar_sync_jobs j
     SET status = 'superseded', updated_at = now(),
         last_error = 'Superseded by version ' || w.config_version
    FROM public.webinars w
   WHERE j.webinar_id = w.id
     AND j.config_version < w.config_version
     AND j.status IN ('pending', 'failed');

  -- Recover jobs whose worker died mid-flight.
  UPDATE public.webinar_sync_jobs
     SET status = 'pending', locked_at = NULL, locked_by = NULL, updated_at = now(),
         last_error = COALESCE(last_error, 'Worker timed out; requeued')
   WHERE status = 'processing' AND locked_at < now() - interval '10 minutes';

  RETURN QUERY
  WITH due AS (
    SELECT j.id
      FROM public.webinar_sync_jobs j
     WHERE j.status = 'pending'
       AND j.next_attempt_at <= now()
       AND (_webinar_id IS NULL OR j.webinar_id = _webinar_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.webinar_sync_jobs p
          WHERE p.webinar_id = j.webinar_id
            AND p.destination = j.destination
            AND p.status = 'processing')
     ORDER BY j.created_at
     LIMIT GREATEST(1, LEAST(COALESCE(_limit, 20), 100))
     FOR UPDATE OF j SKIP LOCKED
  ), claimed AS (
    UPDATE public.webinar_sync_jobs j
       SET status = 'processing', locked_at = now(), locked_by = _worker,
           attempts = j.attempts + 1, updated_at = now()
      FROM due
     WHERE j.id = due.id
    RETURNING j.*
  )
  SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.wm_claim_sync_jobs(text, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wm_claim_sync_jobs(text, integer, uuid) TO service_role;

-- Admin retry of a failed (or not-configured) destination for the CURRENT version only.
CREATE OR REPLACE FUNCTION public.wm_retry_sync_job(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j public.webinar_sync_jobs;
  v_current integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can retry synchronization' USING HINT = 'WM_FORBIDDEN';
  END IF;

  SELECT * INTO j FROM public.webinar_sync_jobs WHERE id = _job_id FOR UPDATE;
  IF j.id IS NULL THEN
    RAISE EXCEPTION 'Sync job not found' USING HINT = 'WM_NOT_FOUND';
  END IF;
  SELECT config_version INTO v_current FROM public.webinars WHERE id = j.webinar_id;
  IF j.config_version <> v_current THEN
    RAISE EXCEPTION 'This job is for version % but version % is published; only the latest version can be retried', j.config_version, v_current
      USING HINT = 'WM_CONFLICT';
  END IF;
  IF j.status NOT IN ('failed', 'skipped') THEN
    RAISE EXCEPTION 'Only failed or skipped jobs can be retried (status is %)', j.status USING HINT = 'WM_CONFLICT';
  END IF;

  UPDATE public.webinar_sync_jobs
     SET status = 'pending', next_attempt_at = now(), max_attempts = attempts + 6,
         locked_at = NULL, locked_by = NULL, updated_at = now(),
         attempt_log = attempt_log || jsonb_build_array(jsonb_build_object(
           'at', public.wm_iso_utc(now()), 'event', 'manual_retry', 'by', auth.uid()))
   WHERE id = _job_id;

  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'webinar_sync_retry', 'webinar', j.webinar_id,
          jsonb_build_object('job_id', j.id, 'destination', j.destination, 'version', j.config_version));
END;
$$;

REVOKE ALL ON FUNCTION public.wm_retry_sync_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wm_retry_sync_job(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Latest published configuration for workflows / WhatsApp templates
-- ---------------------------------------------------------------------------
-- Public-safe: never returns the joining URL (that stays behind the existing
-- get_webinar_join_link / get_owner_webinar_link RPCs and admin link approval).
CREATE OR REPLACE FUNCTION public.get_webinar_published_config(_webinar_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.wm_snapshot(w) - 'webinar_url' - 'updated_by' - 'calendar_details'
    FROM public.webinars w
   WHERE w.id = _webinar_id
     AND w.is_published = true
     AND w.config_version > 0;
$$;

REVOKE ALL ON FUNCTION public.get_webinar_published_config(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_webinar_published_config(uuid) TO anon, authenticated, service_role;
