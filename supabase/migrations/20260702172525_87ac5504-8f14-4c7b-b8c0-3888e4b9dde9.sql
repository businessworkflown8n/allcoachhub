
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS payment_option TEXT DEFAULT 'pay_now',
  ADD COLUMN IF NOT EXISTS original_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS pay_later_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS late_fee_percentage NUMERIC DEFAULT 10,
  ADD COLUMN IF NOT EXISTS pay_later_selected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_enrollments_payment_option ON public.enrollments(payment_option);
