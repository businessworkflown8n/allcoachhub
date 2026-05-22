-- 1. stripe_subscriptions table
CREATE TABLE public.stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stripe_subs_user_id ON public.stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subs_stripe_id ON public.stripe_subscriptions(stripe_subscription_id);

ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own stripe subscriptions"
  ON public.stripe_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages stripe subscriptions"
  ON public.stripe_subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins view all stripe subscriptions"
  ON public.stripe_subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_stripe_subs_updated_at
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. subscription_plans: stripe_product_slug + price_usd
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_product_slug text,
  ADD COLUMN IF NOT EXISTS price_usd numeric DEFAULT 0;

UPDATE public.subscription_plans SET stripe_product_slug='starter_plan',   price_usd=12  WHERE slug='starter';
UPDATE public.subscription_plans SET stripe_product_slug='pro_plan',       price_usd=36  WHERE slug='pro';
UPDATE public.subscription_plans SET stripe_product_slug='premium_plan',   price_usd=72  WHERE slug='premium';
UPDATE public.subscription_plans SET stripe_product_slug='corporate_plan', price_usd=180 WHERE slug='corporate';

-- 3. payments: allow non-enrollment payments
ALTER TABLE public.payments
  ALTER COLUMN enrollment_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'course';

CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON public.payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_kind ON public.payments(kind);

-- 4. Trigger: sync stripe_subscriptions -> coach_subscriptions for feature gating
CREATE OR REPLACE FUNCTION public.sync_coach_plan_from_stripe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_id uuid;
  v_plan_slug text;
BEGIN
  -- Derive plan slug from Stripe price_id (e.g. 'pro_monthly' -> 'pro')
  v_plan_slug := split_part(NEW.price_id, '_', 1);

  SELECT id INTO v_plan_id
  FROM public.subscription_plans
  WHERE slug = v_plan_slug
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only act for coaches
  IF NOT public.has_role(NEW.user_id, 'coach'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('active', 'trialing') THEN
    INSERT INTO public.coach_subscriptions (coach_id, plan_id, status, starts_at, ends_at)
    VALUES (NEW.user_id, v_plan_id, 'active', COALESCE(NEW.current_period_start, now()), NEW.current_period_end)
    ON CONFLICT (coach_id) DO UPDATE
      SET plan_id   = EXCLUDED.plan_id,
          status    = 'active',
          starts_at = EXCLUDED.starts_at,
          ends_at   = EXCLUDED.ends_at,
          updated_at= now();
  ELSIF NEW.status = 'past_due' THEN
    UPDATE public.coach_subscriptions
      SET status='active', ends_at=NEW.current_period_end, updated_at=now()
      WHERE coach_id = NEW.user_id;
  ELSIF NEW.status = 'canceled' AND (NEW.current_period_end IS NULL OR NEW.current_period_end <= now()) THEN
    UPDATE public.coach_subscriptions
      SET status='canceled', ends_at=now(), updated_at=now()
      WHERE coach_id = NEW.user_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sync_coach_plan ON public.stripe_subscriptions;
CREATE TRIGGER sync_coach_plan
  AFTER INSERT OR UPDATE ON public.stripe_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_coach_plan_from_stripe();

-- 5. Helper for backend access checks
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stripe_subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;