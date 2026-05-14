
-- =========================================
-- WhatsApp Module: extend whatsapp_access
-- =========================================
ALTER TABLE public.whatsapp_access
  ADD COLUMN IF NOT EXISTS meta_phone_number_id text,
  ADD COLUMN IF NOT EXISTS meta_waba_id text,
  ADD COLUMN IF NOT EXISTS meta_display_name text,
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- =========================================
-- whatsapp_campaigns extensions
-- =========================================
ALTER TABLE public.whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS template_variables jsonb DEFAULT '{}'::jsonb;

-- =========================================
-- whatsapp_credits
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  monthly_quota integer NOT NULL DEFAULT 0,
  last_reset_at timestamptz,
  next_reset_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_credits coach view own"
  ON public.whatsapp_credits FOR SELECT
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wa_credits admin manage"
  ON public.whatsapp_credits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wa_credits_updated
  BEFORE UPDATE ON public.whatsapp_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- whatsapp_credit_transactions
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('topup','send','refund','admin_grant','monthly_reset','plan_renewal')),
  campaign_id uuid,
  payment_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wact_coach ON public.whatsapp_credit_transactions(coach_id, created_at DESC);
ALTER TABLE public.whatsapp_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_credit_tx coach view own"
  ON public.whatsapp_credit_transactions FOR SELECT
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wa_credit_tx admin manage"
  ON public.whatsapp_credit_transactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- whatsapp_subscription_plans
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  monthly_messages integer NOT NULL,
  price_inr numeric(10,2) NOT NULL DEFAULT 0,
  price_usd numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_plans public read active"
  ON public.whatsapp_subscription_plans FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wa_plans admin manage"
  ON public.whatsapp_subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wa_plans_updated
  BEFORE UPDATE ON public.whatsapp_subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- whatsapp_coach_subscriptions
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_coach_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.whatsapp_subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due','trialing')),
  provider text CHECK (provider IN ('razorpay','stripe','manual')),
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wcs_coach ON public.whatsapp_coach_subscriptions(coach_id);
ALTER TABLE public.whatsapp_coach_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_sub coach view own"
  ON public.whatsapp_coach_subscriptions FOR SELECT
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wa_sub admin manage"
  ON public.whatsapp_coach_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wa_sub_updated
  BEFORE UPDATE ON public.whatsapp_coach_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- whatsapp_conversations
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  contact_id uuid,
  wa_phone text NOT NULL,
  contact_name text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, wa_phone)
);
CREATE INDEX IF NOT EXISTS idx_wa_conv_coach ON public.whatsapp_conversations(coach_id, last_message_at DESC);
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_conv coach manage own"
  ON public.whatsapp_conversations FOR ALL
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wa_conv_updated
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- whatsapp_messages
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  wa_message_id text,
  content text,
  media_url text,
  media_type text,
  template_id uuid,
  template_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed','received')),
  error text,
  sent_by uuid,
  campaign_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.whatsapp_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wa_msg_coach ON public.whatsapp_messages(coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_wa_id ON public.whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_msg coach manage own"
  ON public.whatsapp_messages FOR ALL
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================
-- whatsapp_automations
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('keyword','new_contact','enrollment','inactivity','first_message','no_reply')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  use_ai_reply boolean NOT NULL DEFAULT false,
  ai_persona text,
  total_runs integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_auto_coach ON public.whatsapp_automations(coach_id, is_active);
ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_auto coach manage own"
  ON public.whatsapp_automations FOR ALL
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wa_auto_updated
  BEFORE UPDATE ON public.whatsapp_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- whatsapp_automation_runs
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.whatsapp_automations(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  conversation_id uuid,
  trigger_payload jsonb,
  result jsonb,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','skipped')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_runs_coach ON public.whatsapp_automation_runs(coach_id, created_at DESC);
ALTER TABLE public.whatsapp_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_runs coach view own"
  ON public.whatsapp_automation_runs FOR SELECT
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wa_runs admin manage"
  ON public.whatsapp_automation_runs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- Functions
-- =========================================
CREATE OR REPLACE FUNCTION public.wa_consume_credit(_coach_id uuid, _count integer, _campaign_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_balance integer;
  new_balance integer;
BEGIN
  IF _count <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid count');
  END IF;

  SELECT balance INTO cur_balance
  FROM public.whatsapp_credits
  WHERE coach_id = _coach_id
  FOR UPDATE;

  IF cur_balance IS NULL THEN
    INSERT INTO public.whatsapp_credits (coach_id, balance) VALUES (_coach_id, 0);
    cur_balance := 0;
  END IF;

  IF cur_balance < _count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', cur_balance);
  END IF;

  new_balance := cur_balance - _count;
  UPDATE public.whatsapp_credits
    SET balance = new_balance, updated_at = now()
    WHERE coach_id = _coach_id;

  INSERT INTO public.whatsapp_credit_transactions (coach_id, delta, balance_after, reason, campaign_id)
  VALUES (_coach_id, -_count, new_balance, 'send', _campaign_id);

  RETURN jsonb_build_object('success', true, 'balance', new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_admin_grant_credits(_coach_id uuid, _amount integer, _reason text DEFAULT 'admin_grant', _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_balance integer;
  new_balance integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant credits';
  END IF;

  SELECT balance INTO cur_balance
  FROM public.whatsapp_credits
  WHERE coach_id = _coach_id
  FOR UPDATE;

  IF cur_balance IS NULL THEN
    INSERT INTO public.whatsapp_credits (coach_id, balance) VALUES (_coach_id, 0);
    cur_balance := 0;
  END IF;

  new_balance := cur_balance + _amount;
  UPDATE public.whatsapp_credits
    SET balance = new_balance, updated_at = now()
    WHERE coach_id = _coach_id;

  INSERT INTO public.whatsapp_credit_transactions (coach_id, delta, balance_after, reason, notes)
  VALUES (_coach_id, _amount, new_balance, _reason, _notes);

  RETURN jsonb_build_object('success', true, 'balance', new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_get_or_create_conversation(_coach_id uuid, _wa_phone text, _contact_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
BEGIN
  SELECT id INTO conv_id FROM public.whatsapp_conversations
   WHERE coach_id = _coach_id AND wa_phone = _wa_phone;

  IF conv_id IS NULL THEN
    INSERT INTO public.whatsapp_conversations (coach_id, wa_phone, contact_name)
    VALUES (_coach_id, _wa_phone, _contact_name)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$;

-- =========================================
-- Realtime
-- =========================================
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_credits REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_credits;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- Seed plans
-- =========================================
INSERT INTO public.whatsapp_subscription_plans (name, slug, monthly_messages, price_inr, price_usd, features, sort_order)
VALUES
  ('Starter', 'starter', 1000, 999, 12, '["1,000 messages/mo","Bulk send","Basic templates","Email support"]'::jsonb, 1),
  ('Growth', 'growth', 10000, 4999, 60, '["10,000 messages/mo","Campaigns + scheduler","CRM inbox","Automations","Priority support"]'::jsonb, 2),
  ('Scale', 'scale', 50000, 19999, 240, '["50,000 messages/mo","AI auto-reply","Advanced analytics","Multiple agents","Dedicated manager"]'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;
