
-- 1) profiles: hide contact PII from anonymous visitors
REVOKE SELECT (contact_number, whatsapp_number, email) ON public.profiles FROM anon;

-- 2) webinars: hide webinar_link from anon and authenticated; owner/admin reach it via RPC or service role
REVOKE SELECT (webinar_link) ON public.webinars FROM anon, authenticated;

-- Provide a SECURITY DEFINER helper so a coach can fetch their own webinar link (owners/admins).
CREATE OR REPLACE FUNCTION public.get_owner_webinar_link(_webinar_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
  v_coach uuid;
BEGIN
  SELECT coach_id, webinar_link INTO v_coach, v_link
  FROM public.webinars
  WHERE id = _webinar_id;

  IF v_coach IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() = v_coach OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN v_link;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_webinar_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_webinar_link(uuid) TO authenticated;

-- 3) daily_zip_puzzles: hide solution_data from regular users
REVOKE SELECT (solution_data) ON public.daily_zip_puzzles FROM anon, authenticated;

-- Admins still need access for management UI; expose via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.admin_get_puzzle_solution(_puzzle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solution jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NULL;
  END IF;

  SELECT solution_data INTO v_solution
  FROM public.daily_zip_puzzles
  WHERE id = _puzzle_id;

  RETURN v_solution;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_puzzle_solution(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_puzzle_solution(uuid) TO authenticated;
