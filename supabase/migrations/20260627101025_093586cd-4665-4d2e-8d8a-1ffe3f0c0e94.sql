
ALTER TABLE public.razorpay_orders
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'course',
  ADD COLUMN IF NOT EXISTS webinar_id uuid,
  ADD COLUMN IF NOT EXISTS service_id uuid;

ALTER TABLE public.razorpay_orders
  ALTER COLUMN course_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_razorpay_orders_webinar_id ON public.razorpay_orders(webinar_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_kind ON public.razorpay_orders(kind);
