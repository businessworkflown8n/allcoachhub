-- Server-side checks for Webinar Management & Sync.
-- Run in the Supabase SQL editor AFTER applying
-- 20261021120000_webinar_management_sync.sql. Everything runs in one transaction
-- and is rolled back at the end; no data is kept. Any failed check aborts with
-- "CHECK FAILED: ...". Success ends with NOTICE "ALL WEBINAR MANAGEMENT CHECKS PASSED".

BEGIN;

-- Runs _sql and requires it to fail with the given HINT code.
CREATE FUNCTION pg_temp.expect_hint(_sql text, _hint text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_hint text; v_msg text;
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT, v_msg = MESSAGE_TEXT;
    IF v_hint IS DISTINCT FROM _hint THEN
      RAISE EXCEPTION 'CHECK FAILED: expected % but got % (%) for: %', _hint, v_hint, v_msg, _sql;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CHECK FAILED: expected % but statement succeeded: %', _hint, _sql;
END $$;

CREATE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
$$;

DO $$
DECLARE
  a uuid := '00000000-0000-4000-a000-00000000000a';   -- coach A (all permissions)
  b uuid := '00000000-0000-4000-a000-00000000000b';   -- coach B (access only)
  learner uuid := '00000000-0000-4000-a000-0000000000c1';
  wa uuid; wb uuid; r jsonb; n int; v int; s text;
  future date := (now() + interval '30 days')::date;
BEGIN
  INSERT INTO public.coach_feature_flags (coach_id, status, webinar_mgmt_access, webinar_mgmt_edit_schedule, webinar_mgmt_edit_join_url,
    webinar_mgmt_edit_whatsapp_url, webinar_mgmt_edit_registration_url, webinar_mgmt_publish, webinar_mgmt_view_sync)
  VALUES (a, 'approved', true, true, true, true, true, true, true),
         (b, 'approved', true, false, false, false, false, false, false)
  ON CONFLICT (coach_id) DO NOTHING;

  INSERT INTO public.webinars (coach_id, title, webinar_date, webinar_time, webinar_link, timezone, config_version)
  VALUES (a, 'Coach A webinar', future, '18:00', 'https://zoom.us/j/111', 'Asia/Kolkata', 99)  -- 99 must be ignored
  RETURNING id INTO wa;
  INSERT INTO public.webinars (coach_id, title, webinar_date, webinar_time, webinar_link, timezone)
  VALUES (b, 'Coach B webinar', future, '10:00', 'https://zoom.us/j/222', 'Europe/London')
  RETURNING id INTO wb;

  SELECT config_version INTO v FROM public.webinars WHERE id = wa;
  ASSERT v = 0, 'CHECK FAILED: client-supplied config_version on insert was not reset';

  -- An existing registration must survive every change below.
  INSERT INTO public.webinar_registrations (webinar_id, learner_id) VALUES (wa, learner);

  -- 1. First publish adopts the current record as version 1 and enqueues one job per destination.
  r := public.wm_publish_config(a, wa, 0, 0, 'initial');
  ASSERT (r ->> 'version')::int = 1, 'CHECK FAILED: first publish should be version 1';
  SELECT count(*) INTO n FROM public.webinar_sync_jobs WHERE webinar_id = wa AND config_version = 1;
  ASSERT n = 6, format('CHECK FAILED: expected 6 sync jobs for v1, got %s', n);
  SELECT count(*) INTO n FROM public.webinar_config_versions WHERE webinar_id = wa;
  ASSERT n = 1, 'CHECK FAILED: expected 1 version row';

  -- 2. Draft is invisible to the published record until publish.
  PERFORM public.wm_save_draft(a, wa, jsonb_build_object(
    'title', 'Coach A webinar', 'date', to_char(future + 7, 'YYYY-MM-DD'), 'start_time', '09:00', 'end_time', '10:30',
    'timezone', 'America/New_York', 'webinar_url', 'https://zoom.us/j/111',
    'whatsapp_url', 'https://chat.whatsapp.com/abc', 'registration_url', null, 'calendar_details', '{}'::jsonb), 0);
  SELECT webinar_date::text INTO s FROM public.webinars WHERE id = wa;
  ASSERT s = future::text, 'CHECK FAILED: saving a draft changed the published webinar';

  -- 3. Stale expected version / revision is rejected (optimistic concurrency).
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_publish_config(%L, %L, 0, 1, null)', a, wa), 'WM_CONFLICT');
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_publish_config(%L, %L, 1, 7, null)', a, wa), 'WM_CONFLICT');

  -- 4. Publishing the schedule change: version 2, v1 leftovers superseded, registration kept, duration from end time.
  r := public.wm_publish_config(a, wa, 1, 1, 'moved');
  ASSERT (r ->> 'version')::int = 2 AND (r ->> 'schedule_changed')::boolean, 'CHECK FAILED: publish v2';
  SELECT count(*) INTO n FROM public.webinar_sync_jobs WHERE webinar_id = wa AND config_version = 1 AND status IN ('pending', 'failed');
  ASSERT n = 0, 'CHECK FAILED: v1 jobs were not superseded';
  SELECT count(*) INTO n FROM public.webinar_registrations WHERE webinar_id = wa AND learner_id = learner;
  ASSERT n = 1, 'CHECK FAILED: registration lost after date change';
  SELECT duration_minutes INTO n FROM public.webinars WHERE id = wa;
  ASSERT n = 90, 'CHECK FAILED: duration should be 90';
  SELECT config ->> 'start_at_utc' INTO s FROM public.webinar_config_versions WHERE webinar_id = wa AND version = 2;
  ASSERT s = to_char(((future + 7) + time '09:00') AT TIME ZONE 'America/New_York' AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'CHECK FAILED: start_at_utc not converted from America/New_York';

  -- 5. Another coach cannot touch A's webinar (same error as a missing webinar).
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_save_draft(%L, %L, %L::jsonb, 0)', b, wa,
    '{"title":"hijack","date":"2099-01-01","start_time":"10:00","end_time":"11:00","timezone":"UTC","webinar_url":"https://x.example"}'), 'WM_NOT_FOUND');
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_publish_config(%L, %L, 2, 0, null)', b, wa), 'WM_NOT_FOUND');

  -- 6. Field-level permissions: B (access only) cannot change schedule; cannot publish.
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_save_draft(%L, %L, %L::jsonb, 0)', b, wb,
    jsonb_build_object('title', 'Coach B webinar', 'date', to_char(future + 1, 'YYYY-MM-DD'), 'start_time', '10:00', 'end_time', '11:00',
      'timezone', 'Europe/London', 'webinar_url', 'https://zoom.us/j/222')), 'WM_FORBIDDEN');
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_publish_config(%L, %L, 0, 0, null)', b, wb), 'WM_FORBIDDEN');
  -- B can still change the title (access permission) as a draft.
  PERFORM public.wm_save_draft(b, wb, jsonb_build_object('title', 'Coach B renamed', 'date', to_char(future, 'YYYY-MM-DD'),
    'start_time', '10:00', 'end_time', '11:00', 'timezone', 'Europe/London', 'webinar_url', 'https://zoom.us/j/222'), 0);

  -- 7. Disabling a permission takes effect immediately.
  UPDATE public.coach_feature_flags SET webinar_mgmt_edit_join_url = false WHERE coach_id = a;
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_save_draft(%L, %L, %L::jsonb, 0)', a, wa,
    jsonb_build_object('title', 'Coach A webinar', 'date', to_char(future + 7, 'YYYY-MM-DD'), 'start_time', '09:00', 'end_time', '10:30',
      'timezone', 'America/New_York', 'webinar_url', 'https://zoom.us/j/999', 'whatsapp_url', 'https://chat.whatsapp.com/abc')), 'WM_FORBIDDEN');
  UPDATE public.coach_feature_flags SET webinar_mgmt_access = false WHERE coach_id = a;
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_discard_draft(%L, %L)', a, wa), 'WM_FORBIDDEN');
  UPDATE public.coach_feature_flags SET webinar_mgmt_access = true, webinar_mgmt_edit_join_url = true WHERE coach_id = a;
  SELECT count(*) INTO n FROM public.feature_control_audit WHERE feature_key = 'webinar_management' AND coach_id = a;
  ASSERT n >= 4, 'CHECK FAILED: permission changes were not audited';

  -- 8. Existing approval workflow: an unapproved coach cannot publish.
  UPDATE public.coach_feature_flags SET status = 'pending' WHERE coach_id = a;
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_publish_config(%L, %L, 2, 0, null)', a, wa), 'WM_NOT_APPROVED');
  UPDATE public.coach_feature_flags SET status = 'approved' WHERE coach_id = a;

  -- 9. Changing the joining URL sends it back to admin link approval.
  UPDATE public.webinars SET webinar_link_status = 'approved' WHERE id = wa;  -- as postgres (no auth.uid): treated as system/admin edit -> v3
  PERFORM public.wm_save_draft(a, wa, jsonb_build_object('title', 'Coach A webinar', 'date', to_char(future + 7, 'YYYY-MM-DD'),
    'start_time', '09:00', 'end_time', '10:30', 'timezone', 'America/New_York', 'webinar_url', 'https://zoom.us/j/999',
    'whatsapp_url', 'https://chat.whatsapp.com/abc'), 0);
  r := public.wm_publish_config(a, wa, 3, 1, 'new link');
  SELECT webinar_link_status INTO s FROM public.webinars WHERE id = wa;
  ASSERT s = 'pending' AND (r ->> 'link_reapproval_required')::boolean, 'CHECK FAILED: changed link was not sent back to approval';

  -- 10. Validation is enforced server-side.
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_save_draft(%L, %L, %L::jsonb, 0)', a, wa,
    jsonb_build_object('title', 'Coach A webinar', 'date', to_char(future + 7, 'YYYY-MM-DD'), 'start_time', '09:00', 'end_time', '10:30',
      'timezone', 'IST', 'webinar_url', 'https://zoom.us/j/999')), 'WM_INVALID');
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_save_draft(%L, %L, %L::jsonb, 0)', a, wa,
    jsonb_build_object('title', 'Coach A webinar', 'date', to_char(future + 7, 'YYYY-MM-DD'), 'start_time', '09:00', 'end_time', '10:30',
      'timezone', 'Asia/Kolkata', 'webinar_url', 'javascript:alert(1)')), 'WM_INVALID');

  -- 11. The legacy editor / direct API cannot bypass Manage Webinar on a managed webinar...
  PERFORM pg_temp.act_as(a);
  PERFORM pg_temp.expect_hint(format('UPDATE public.webinars SET webinar_date = webinar_date + 1 WHERE id = %L', wa), 'WM_MANAGED');
  PERFORM pg_temp.expect_hint(format('UPDATE public.webinars SET webinar_link_status = %L WHERE id = %L', 'approved', wa), 'WM_MANAGED');
  -- ...but non-synced fields stay editable, and unmanaged webinars behave exactly as before.
  UPDATE public.webinars SET description = 'still editable' WHERE id = wa;
  PERFORM pg_temp.act_as(b);
  UPDATE public.webinars SET webinar_date = webinar_date + 2, config_version = 50 WHERE id = wb;
  SELECT config_version INTO v FROM public.webinars WHERE id = wb;
  ASSERT v = 0, 'CHECK FAILED: coach could set config_version directly';
  PERFORM set_config('request.jwt.claims', '', true);

  -- 12. Queue: only the latest version is claimable; claimed jobs are serialised per destination.
  SELECT count(*) INTO n FROM public.wm_claim_sync_jobs('test-worker', 100, wa);
  ASSERT n = 6, format('CHECK FAILED: expected 6 claimable jobs for latest version, got %s', n);
  SELECT count(*) INTO n FROM public.webinar_sync_jobs
   WHERE webinar_id = wa AND status = 'processing' AND config_version <> (SELECT config_version FROM public.webinars WHERE id = wa);
  ASSERT n = 0, 'CHECK FAILED: an old version was claimed';
  SELECT count(*) INTO n FROM public.wm_claim_sync_jobs('test-worker-2', 100, wa);
  ASSERT n = 0, 'CHECK FAILED: jobs claimed twice';

  -- 13. Idempotency key prevents duplicate jobs for the same version/destination.
  BEGIN
    INSERT INTO public.webinar_sync_jobs (webinar_id, coach_id, config_version, destination, idempotency_key, payload)
    SELECT webinar_id, coach_id, config_version, destination, idempotency_key, payload FROM public.webinar_sync_jobs WHERE webinar_id = wa LIMIT 1;
    RAISE EXCEPTION 'CHECK FAILED: duplicate idempotency key accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- 14. Retry is admin-only.
  PERFORM pg_temp.act_as(b);
  PERFORM pg_temp.expect_hint(format('SELECT public.wm_retry_sync_job(%L)',
    (SELECT id FROM public.webinar_sync_jobs WHERE webinar_id = wa LIMIT 1)), 'WM_FORBIDDEN');
  PERFORM set_config('request.jwt.claims', '', true);

  -- 15. Public config never exposes the joining URL.
  r := public.get_webinar_published_config(wa);
  ASSERT r IS NOT NULL AND NOT (r ? 'webinar_url'), 'CHECK FAILED: public config leaked webinar_url';

  RAISE NOTICE 'Function checks passed (A=%, B=%)', wa, wb;
END $$;

-- 16. RLS: coach B cannot read coach A's drafts, versions or sync jobs.
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-00000000000b', 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.webinar_config_versions WHERE coach_id = '00000000-0000-4000-a000-00000000000a';
  ASSERT n = 0, 'CHECK FAILED: coach B can read coach A versions';
  SELECT count(*) INTO n FROM public.webinar_sync_jobs WHERE coach_id = '00000000-0000-4000-a000-00000000000a';
  ASSERT n = 0, 'CHECK FAILED: coach B can read coach A sync jobs';
  -- B lacks view_sync, so B cannot read even its own jobs.
  SELECT count(*) INTO n FROM public.webinar_sync_jobs;
  ASSERT n = 0, 'CHECK FAILED: coach without view_sync can read sync jobs';
  BEGIN
    INSERT INTO public.webinar_config_drafts (webinar_id, coach_id, draft, base_version)
    SELECT id, coach_id, '{}'::jsonb, 0 FROM public.webinars LIMIT 1;
    RAISE EXCEPTION 'CHECK FAILED: client could insert a draft directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.wm_publish_config('00000000-0000-4000-a000-00000000000b', gen_random_uuid(), 0, 0, null);
    RAISE EXCEPTION 'CHECK FAILED: authenticated role can call wm_publish_config directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'ALL WEBINAR MANAGEMENT CHECKS PASSED';
END $$;

ROLLBACK;
