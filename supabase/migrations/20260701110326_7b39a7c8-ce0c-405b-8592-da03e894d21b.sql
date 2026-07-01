
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS yearly_discount_percent numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS monthly_billing_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS yearly_billing_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.coach_subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id uuid REFERENCES public.subscription_plans(id),
  ADD COLUMN IF NOT EXISTS pending_billing_interval text;

CREATE OR REPLACE FUNCTION public.schedule_plan_change(_plan_id uuid, _billing_interval text DEFAULT 'monthly')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _sub public.coach_subscriptions%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _sub FROM public.coach_subscriptions WHERE coach_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription';
  END IF;

  UPDATE public.coach_subscriptions
    SET pending_plan_id = _plan_id,
        pending_billing_interval = _billing_interval,
        auto_renewal = false,
        updated_at = now()
    WHERE coach_id = _uid;

  INSERT INTO public.subscription_history (coach_id, event_type, to_plan_id, billing_interval, notes)
  VALUES (_uid, 'downgrade_scheduled', _plan_id, _billing_interval,
          'Downgrade will apply at end of current billing cycle');

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_plan_change(uuid, text) TO authenticated;
