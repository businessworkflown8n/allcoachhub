
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_link_url text;

ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_link_url text;

COMMENT ON COLUMN public.courses.payment_method IS 'razorpay_api | payment_link | free | manual | external (null = razorpay_api default)';
COMMENT ON COLUMN public.webinars.payment_method IS 'razorpay_api | payment_link | free | manual | external (null = razorpay_api default)';
