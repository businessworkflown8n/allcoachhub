
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected','suspended'));

UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending' AND created_at < now();

CREATE OR REPLACE FUNCTION public.enforce_approval_status_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change approval_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_approval_status ON public.profiles;
CREATE TRIGGER profiles_enforce_approval_status
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_approval_status_admin_only();

INSERT INTO public.features_master (feature_key, name, description, category, supports_usage_limit, sort_order, is_active)
VALUES ('prompt_generator', 'AI Prompt Generator', 'Access to the AI Prompt Generator tool', 'ai_tools', false, 100, true)
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.feature_controls (feature_key, global_enabled, free_enabled, pro_enabled, premium_enabled)
VALUES ('prompt_generator', true, true, true, true)
ON CONFLICT (feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_prompt_generator_access(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_status text;
  v_suspended boolean;
  v_override boolean;
  v_global boolean;
  v_sub_status text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_registered');
  END IF;

  IF v_role = 'admin' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'admin');
  END IF;

  IF v_role NOT IN ('coach','learner') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_role');
  END IF;

  SELECT approval_status, COALESCE(is_suspended,false)
    INTO v_status, v_suspended
    FROM public.profiles WHERE user_id = _user_id LIMIT 1;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_registered');
  END IF;

  IF v_suspended OR v_status = 'suspended' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'suspended');
  END IF;
  IF v_status = 'rejected' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rejected');
  END IF;
  IF v_status = 'pending' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'pending_approval');
  END IF;

  SELECT enabled INTO v_override
    FROM public.coach_feature_override
    WHERE coach_id = _user_id AND feature_key = 'prompt_generator' LIMIT 1;

  IF v_override IS NOT NULL THEN
    IF NOT v_override THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'feature_disabled');
    END IF;
  ELSE
    SELECT global_enabled INTO v_global FROM public.feature_controls WHERE feature_key = 'prompt_generator' LIMIT 1;
    IF NOT COALESCE(v_global, false) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'feature_disabled');
    END IF;
  END IF;

  IF v_role = 'coach' THEN
    SELECT status INTO v_sub_status
      FROM public.coach_subscriptions
      WHERE coach_id = _user_id
      ORDER BY created_at DESC
      LIMIT 1;
    IF v_sub_status IS NOT NULL AND v_sub_status NOT IN ('active','trial','trialing') THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'subscription_inactive');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'allowed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_prompt_generator_access(uuid) TO anon, authenticated, service_role;
