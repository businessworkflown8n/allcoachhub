
-- 1. Fix touch_updated_at search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 2. communication_settings: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read communication settings" ON public.communication_settings;
CREATE POLICY "Authenticated can read communication settings"
  ON public.communication_settings FOR SELECT
  TO authenticated
  USING (true);

-- 3. Drop broad leaderboard SELECT policies
DROP POLICY IF EXISTS "Authenticated can view progress for leaderboard" ON public.daily_zip_progress;
DROP POLICY IF EXISTS "Authenticated can view scores" ON public.daily_zip_scores;
DROP POLICY IF EXISTS "Authenticated can view level scores" ON public.daily_zip_level_scores;
DROP POLICY IF EXISTS "streak_authenticated_leaderboard" ON public.learner_streaks;
DROP POLICY IF EXISTS "xp_authenticated_leaderboard" ON public.learner_xp;

-- Add self-read for daily_zip tables
CREATE POLICY "Users read own daily_zip_progress" ON public.daily_zip_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users read own daily_zip_scores" ON public.daily_zip_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users read own daily_zip_level_scores" ON public.daily_zip_level_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Leaderboard RPCs (security definer, return only safe aggregated fields)
CREATE OR REPLACE FUNCTION public.get_xp_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE(user_id uuid, total_xp int, level int, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.user_id, x.total_xp, x.level, p.full_name, p.avatar_url
  FROM public.learner_xp x
  LEFT JOIN public.profiles p ON p.user_id = x.user_id
  ORDER BY x.total_xp DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;
GRANT EXECUTE ON FUNCTION public.get_xp_leaderboard(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_daily_zip_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE(user_id uuid, current_level int, total_games_played int, full_name text, country text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.user_id, d.current_level, d.total_games_played, p.full_name, p.country
  FROM public.daily_zip_progress d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  ORDER BY d.current_level DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;
GRANT EXECUTE ON FUNCTION public.get_daily_zip_leaderboard(int) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_daily_zip_community_stats()
RETURNS TABLE(total_players bigint, total_solved bigint, highest_level int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::bigint,
         COALESCE(sum(total_games_played), 0)::bigint,
         COALESCE(max(current_level), 0)::int
  FROM public.daily_zip_progress;
$$;
GRANT EXECUTE ON FUNCTION public.get_daily_zip_community_stats() TO authenticated, anon;

-- 4. student-uploads coach read policy (coach can read submissions for their courses)
DROP POLICY IF EXISTS "Coaches read student uploads for their courses" ON storage.objects;
CREATE POLICY "Coaches read student uploads for their courses"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-uploads'
  AND EXISTS (
    SELECT 1 FROM public.assignment_submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    JOIN public.courses c ON c.id = a.course_id
    WHERE c.coach_id = auth.uid()
      AND (s.submission_url LIKE '%' || storage.objects.name || '%'
           OR s.submission_url LIKE '%' || storage.objects.name)
  )
);

-- 5. Token columns: revoke from authenticated/anon (service_role retains via GRANT ALL)
REVOKE SELECT (access_token, refresh_token, scope) ON public.drive_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token, scope) ON public.gsc_connections FROM authenticated;
REVOKE SELECT (credentials_encrypted) ON public.ad_platform_connections FROM authenticated;

-- 6. Encrypt whatsapp_credentials with pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.wa_enc_key()
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = private
AS $$ SELECT 'wa_creds_aicoachportal_v1_4fk93Lz0qP8sR2nM5tV9xY1bH7jD'::text $$;
REVOKE ALL ON FUNCTION private.wa_enc_key() FROM PUBLIC;

ALTER TABLE public.whatsapp_credentials ADD COLUMN IF NOT EXISTS user_id_enc bytea;
ALTER TABLE public.whatsapp_credentials ADD COLUMN IF NOT EXISTS password_enc bytea;

UPDATE public.whatsapp_credentials
SET user_id_enc = CASE WHEN user_id IS NOT NULL THEN pgp_sym_encrypt(user_id, private.wa_enc_key()) ELSE NULL END,
    password_enc = CASE WHEN password IS NOT NULL THEN pgp_sym_encrypt(password, private.wa_enc_key()) ELSE NULL END
WHERE user_id_enc IS NULL AND password_enc IS NULL;

ALTER TABLE public.whatsapp_credentials DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.whatsapp_credentials DROP COLUMN IF EXISTS password;

CREATE OR REPLACE FUNCTION public.set_whatsapp_credentials(_coach_id uuid, _login_url text, _user_id text, _password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  INSERT INTO public.whatsapp_credentials (coach_id, login_url, user_id_enc, password_enc, updated_by)
  VALUES (
    _coach_id,
    COALESCE(NULLIF(_login_url, ''), 'https://login.digitalsms.biz/signin.php'),
    pgp_sym_encrypt(_user_id, private.wa_enc_key()),
    pgp_sym_encrypt(_password, private.wa_enc_key()),
    auth.uid()
  )
  ON CONFLICT (coach_id) DO UPDATE SET
    login_url = EXCLUDED.login_url,
    user_id_enc = EXCLUDED.user_id_enc,
    password_enc = EXCLUDED.password_enc,
    updated_by = auth.uid(),
    updated_at = now();
END $$;
GRANT EXECUTE ON FUNCTION public.set_whatsapp_credentials(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_whatsapp_credentials(_coach_id uuid)
RETURNS TABLE(login_url text, user_id text, password text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _coach_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _coach_id = auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT EXISTS (SELECT 1 FROM public.whatsapp_access wa WHERE wa.coach_id = auth.uid() AND wa.is_active = true) THEN
    RAISE EXCEPTION 'WhatsApp access not enabled';
  END IF;
  RETURN QUERY
  SELECT wc.login_url,
         CASE WHEN wc.user_id_enc IS NOT NULL THEN pgp_sym_decrypt(wc.user_id_enc, private.wa_enc_key()) ELSE NULL END,
         CASE WHEN wc.password_enc IS NOT NULL THEN pgp_sym_decrypt(wc.password_enc, private.wa_enc_key()) ELSE NULL END
  FROM public.whatsapp_credentials wc WHERE wc.coach_id = _coach_id;
END $$;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_credentials(uuid) TO authenticated;

-- Block direct reads of encrypted columns from clients
REVOKE SELECT (user_id_enc, password_enc) ON public.whatsapp_credentials FROM authenticated;
