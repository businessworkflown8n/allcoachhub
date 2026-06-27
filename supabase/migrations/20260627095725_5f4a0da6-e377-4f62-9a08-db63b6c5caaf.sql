-- Drop Stripe legacy tables and function
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid, text);
DROP TABLE IF EXISTS public.membership_subscriptions CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.stripe_subscriptions CASCADE;

-- Clean payments table of Stripe legacy columns
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_session_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature text,
  ADD COLUMN IF NOT EXISTS invoice_id text,
  ADD COLUMN IF NOT EXISTS invoice_url text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text;

DROP INDEX IF EXISTS public.idx_payments_stripe_session;
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment ON public.payments(razorpay_payment_id);

-- Enrollments: add Razorpay reference columns
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

-- razorpay_orders table
CREATE TABLE public.razorpay_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  coach_id uuid,
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text,
  receipt text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  notes jsonb DEFAULT '{}'::jsonb,
  signature_verified boolean NOT NULL DEFAULT false,
  error_code text,
  error_description text,
  enrollment_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.razorpay_orders TO authenticated;
GRANT ALL ON public.razorpay_orders TO service_role;

ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own razorpay orders"
  ON public.razorpay_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all razorpay orders"
  ON public.razorpay_orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches view orders for own courses"
  ON public.razorpay_orders FOR SELECT
  USING (auth.uid() = coach_id);

CREATE INDEX idx_razorpay_orders_user ON public.razorpay_orders(user_id);
CREATE INDEX idx_razorpay_orders_course ON public.razorpay_orders(course_id);
CREATE INDEX idx_razorpay_orders_status ON public.razorpay_orders(status);

CREATE TRIGGER razorpay_orders_updated_at
  BEFORE UPDATE ON public.razorpay_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();