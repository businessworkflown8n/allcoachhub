-- 1. webinars.webinar_link — remove anonymous access, add controlled RPC
REVOKE SELECT (webinar_link) ON public.webinars FROM anon;

CREATE OR REPLACE FUNCTION public.get_webinar_join_link(_webinar_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _coach_id uuid;
  _link text;
  _link_status text;
  _is_registered boolean;
BEGIN
  SELECT coach_id, webinar_link, webinar_link_status
    INTO _coach_id, _link, _link_status
  FROM public.webinars
  WHERE id = _webinar_id;

  IF _link IS NULL THEN
    RETURN NULL;
  END IF;

  IF _uid IS NOT NULL AND (_uid = _coach_id OR public.has_role(_uid, 'admin'::app_role)) THEN
    RETURN _link;
  END IF;

  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.webinar_registrations
    WHERE webinar_id = _webinar_id AND learner_id = _uid
  ) INTO _is_registered;

  IF _is_registered AND _link_status = 'approved' THEN
    RETURN _link;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_webinar_join_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_webinar_join_link(uuid) TO anon, authenticated;

-- 2. platform_integrations_config.oauth_config — hide from Data API
REVOKE SELECT (oauth_config) ON public.platform_integrations_config FROM anon, authenticated;

-- 3. Leaderboard tables — require authenticated session for SELECT
DROP POLICY IF EXISTS "Anyone can view progress for leaderboard" ON public.daily_zip_progress;
CREATE POLICY "Authenticated can view progress for leaderboard"
  ON public.daily_zip_progress FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view scores" ON public.daily_zip_scores;
CREATE POLICY "Authenticated can view scores"
  ON public.daily_zip_scores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view level scores" ON public.daily_zip_level_scores;
CREATE POLICY "Authenticated can view level scores"
  ON public.daily_zip_level_scores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "streak_public_leaderboard" ON public.learner_streaks;
CREATE POLICY "streak_authenticated_leaderboard"
  ON public.learner_streaks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "xp_public_leaderboard" ON public.learner_xp;
CREATE POLICY "xp_authenticated_leaderboard"
  ON public.learner_xp FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "lcb_public_leaderboard" ON public.learner_course_badges;
CREATE POLICY "lcb_authenticated_leaderboard"
  ON public.learner_course_badges FOR SELECT TO authenticated USING (true);
