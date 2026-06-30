
-- Phase 1: Subscription System

-- Extend subscription_plans with payment + recurring config
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS yearly_price numeric,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'razorpay_api',
  ADD COLUMN IF NOT EXISTS payment_link_url text,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_monthly text,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_yearly text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_summary jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Extend coach_subscriptions
ALTER TABLE public.coach_subscriptions
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS auto_renewal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_id uuid,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS coach_subscriptions_one_per_coach
  ON public.coach_subscriptions (coach_id);

-- Subscription history / audit
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  from_plan_id uuid,
  to_plan_id uuid,
  event_type text NOT NULL, -- 'assigned','upgraded','renewed','expired','downgraded','cancelled','payment_failed','grace_started'
  billing_interval text,
  amount numeric,
  currency text,
  razorpay_order_id text,
  razorpay_payment_id text,
  invoice_id text,
  notes jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_history TO authenticated;
GRANT ALL ON public.subscription_history TO service_role;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches view own history"
  ON public.subscription_history FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage history"
  ON public.subscription_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS subscription_history_coach_created_idx
  ON public.subscription_history (coach_id, created_at DESC);

-- Auto-assign Free plan when a coach role is created
CREATE OR REPLACE FUNCTION public.auto_assign_free_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
  free_bundle_id uuid;
BEGIN
  IF NEW.role <> 'coach' THEN RETURN NEW; END IF;

  SELECT id INTO free_plan_id FROM public.subscription_plans
   WHERE lower(slug) = 'free' AND is_active = true LIMIT 1;

  SELECT id INTO free_bundle_id FROM public.feature_bundles
   WHERE plan_id = free_plan_id AND is_active = true LIMIT 1;

  IF free_plan_id IS NULL OR free_bundle_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.coach_subscriptions (
    coach_id, plan_id, bundle_id, status, starts_at, ends_at,
    billing_interval, auto_renewal
  ) VALUES (
    NEW.user_id, free_plan_id, free_bundle_id, 'active', now(), NULL,
    'monthly', false
  )
  ON CONFLICT (coach_id) DO NOTHING;

  INSERT INTO public.subscription_history (coach_id, to_plan_id, event_type, billing_interval, notes)
  VALUES (NEW.user_id, free_plan_id, 'assigned', 'monthly',
          jsonb_build_object('reason','auto_assign_on_role_grant'));

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_assign_free_subscription ON public.user_roles;
CREATE TRIGGER trg_auto_assign_free_subscription
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_free_subscription();

-- Backfill existing coaches with no subscription
INSERT INTO public.coach_subscriptions (coach_id, plan_id, bundle_id, status, starts_at, billing_interval, auto_renewal)
SELECT ur.user_id,
       (SELECT id FROM public.subscription_plans WHERE slug='free' LIMIT 1),
       (SELECT id FROM public.feature_bundles WHERE slug='free-bundle' LIMIT 1),
       'active', now(), 'monthly', false
FROM public.user_roles ur
WHERE ur.role = 'coach'
  AND NOT EXISTS (SELECT 1 FROM public.coach_subscriptions cs WHERE cs.coach_id = ur.user_id)
ON CONFLICT (coach_id) DO NOTHING;

-- Activate subscription after successful payment (called from edge function via service_role)
CREATE OR REPLACE FUNCTION public.activate_subscription(
  _coach_id uuid,
  _plan_id uuid,
  _billing_interval text,
  _amount numeric,
  _currency text,
  _razorpay_order_id text,
  _razorpay_payment_id text,
  _auto_renewal boolean DEFAULT false,
  _razorpay_subscription_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bundle_id uuid;
  v_ends_at timestamptz;
  v_prev_plan uuid;
  v_invoice text;
BEGIN
  SELECT id INTO v_bundle_id FROM public.feature_bundles
   WHERE plan_id = _plan_id AND is_active = true LIMIT 1;

  v_ends_at := now() + CASE WHEN _billing_interval = 'yearly' THEN interval '365 days' ELSE interval '30 days' END;
  v_invoice := 'SUB-' || to_char(now(), 'YYYYMM') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  SELECT plan_id INTO v_prev_plan FROM public.coach_subscriptions WHERE coach_id = _coach_id;

  INSERT INTO public.coach_subscriptions (
    coach_id, plan_id, bundle_id, status, starts_at, ends_at,
    billing_interval, auto_renewal, razorpay_subscription_id, grace_until, cancelled_at
  ) VALUES (
    _coach_id, _plan_id, v_bundle_id, 'active', now(), v_ends_at,
    _billing_interval, _auto_renewal, _razorpay_subscription_id, NULL, NULL
  )
  ON CONFLICT (coach_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    bundle_id = EXCLUDED.bundle_id,
    status = 'active',
    starts_at = now(),
    ends_at = EXCLUDED.ends_at,
    billing_interval = EXCLUDED.billing_interval,
    auto_renewal = EXCLUDED.auto_renewal,
    razorpay_subscription_id = EXCLUDED.razorpay_subscription_id,
    grace_until = NULL,
    cancelled_at = NULL,
    updated_at = now();

  INSERT INTO public.subscription_history (
    coach_id, from_plan_id, to_plan_id, event_type, billing_interval,
    amount, currency, razorpay_order_id, razorpay_payment_id, invoice_id
  ) VALUES (
    _coach_id, v_prev_plan, _plan_id,
    CASE WHEN v_prev_plan = _plan_id THEN 'renewed' ELSE 'upgraded' END,
    _billing_interval, _amount, _currency, _razorpay_order_id, _razorpay_payment_id, v_invoice
  );

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice, 'ends_at', v_ends_at);
END $$;

GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid,uuid,text,numeric,text,text,text,boolean,text) TO service_role;

-- Expiry sweep: 7-day grace then downgrade to Free
CREATE OR REPLACE FUNCTION public.sweep_expired_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
  free_bundle_id uuid;
  grace_count int := 0;
  downgrade_count int := 0;
  r record;
BEGIN
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug='free' LIMIT 1;
  SELECT id INTO free_bundle_id FROM public.feature_bundles WHERE slug='free-bundle' LIMIT 1;

  -- Start 7-day grace for active paid subscriptions past ends_at without auto-renew success
  FOR r IN
    SELECT * FROM public.coach_subscriptions
    WHERE status = 'active'
      AND ends_at IS NOT NULL
      AND ends_at < now()
      AND plan_id <> free_plan_id
      AND grace_until IS NULL
  LOOP
    UPDATE public.coach_subscriptions
    SET status = 'past_due',
        grace_until = now() + interval '7 days',
        updated_at = now()
    WHERE id = r.id;

    INSERT INTO public.subscription_history (coach_id, from_plan_id, to_plan_id, event_type, notes)
    VALUES (r.coach_id, r.plan_id, r.plan_id, 'grace_started', jsonb_build_object('grace_until', now() + interval '7 days'));
    grace_count := grace_count + 1;
  END LOOP;

  -- Downgrade to Free after grace expires
  FOR r IN
    SELECT * FROM public.coach_subscriptions
    WHERE status IN ('past_due','expired')
      AND grace_until IS NOT NULL
      AND grace_until < now()
      AND plan_id <> free_plan_id
  LOOP
    UPDATE public.coach_subscriptions
    SET plan_id = free_plan_id,
        bundle_id = free_bundle_id,
        status = 'active',
        starts_at = now(),
        ends_at = NULL,
        grace_until = NULL,
        billing_interval = 'monthly',
        auto_renewal = false,
        updated_at = now()
    WHERE id = r.id;

    INSERT INTO public.subscription_history (coach_id, from_plan_id, to_plan_id, event_type, notes)
    VALUES (r.coach_id, r.plan_id, free_plan_id, 'downgraded', jsonb_build_object('reason','grace_expired'));
    downgrade_count := downgrade_count + 1;
  END LOOP;

  RETURN jsonb_build_object('grace_started', grace_count, 'downgraded', downgrade_count);
END $$;

GRANT EXECUTE ON FUNCTION public.sweep_expired_subscriptions() TO service_role;

-- Coach-initiated cancel (turns off auto-renew, keeps paid plan until ends_at)
CREATE OR REPLACE FUNCTION public.cancel_my_subscription()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.coach_subscriptions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v FROM public.coach_subscriptions WHERE coach_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'no subscription'; END IF;

  UPDATE public.coach_subscriptions
  SET auto_renewal = false, cancelled_at = now(), updated_at = now()
  WHERE coach_id = auth.uid();

  INSERT INTO public.subscription_history (coach_id, from_plan_id, to_plan_id, event_type, notes, created_by)
  VALUES (auth.uid(), v.plan_id, v.plan_id, 'cancelled', jsonb_build_object('keeps_access_until', v.ends_at), auth.uid());

  RETURN jsonb_build_object('success', true, 'access_until', v.ends_at);
END $$;

GRANT EXECUTE ON FUNCTION public.cancel_my_subscription() TO authenticated;
