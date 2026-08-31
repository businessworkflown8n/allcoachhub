-- Phase 2 of the Digital Products / Services module: checkout loop + linking to an
-- existing Course/Webinar/Workshop. Applied directly to the live project; this documents
-- it in version control. See Phase 1 in migration 20260827043430 (n/a — Phase 1 was a
-- frontend-only change, no schema) and the earlier storage/whatsapp restoration migrations
-- in this same file series for the project's migration-gap context.

-- 1. Schema additions on digital_products
ALTER TABLE public.digital_products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS linked_course_id uuid REFERENCES public.courses(id),
  ADD COLUMN IF NOT EXISTS linked_webinar_id uuid REFERENCES public.webinars(id),
  ADD COLUMN IF NOT EXISTS linked_workshop_id uuid REFERENCES public.workshops(id);

CREATE UNIQUE INDEX IF NOT EXISTS digital_products_slug_key ON public.digital_products (slug);

-- 2. Auto-slug trigger, mirroring generate_course_slug() exactly (same regex/uniqueness shape)
CREATE OR REPLACE FUNCTION public.generate_digital_product_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  base_slug text;
  new_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 80);

  new_slug := base_slug;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.digital_products WHERE slug = new_slug AND id != NEW.id) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := new_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_digital_product_slug_trigger ON public.digital_products;
CREATE TRIGGER generate_digital_product_slug_trigger
  BEFORE INSERT OR UPDATE ON public.digital_products
  FOR EACH ROW EXECUTE FUNCTION public.generate_digital_product_slug();

-- Backfill slugs for any existing rows (title update is a no-op that still fires the trigger)
UPDATE public.digital_products SET title = title WHERE slug IS NULL;

-- 3. razorpay_orders needs the same linkage column course_id/webinar_id already have
ALTER TABLE public.razorpay_orders
  ADD COLUMN IF NOT EXISTS digital_product_id uuid REFERENCES public.digital_products(id);

-- 4. Free-product registration RPC (SECURITY DEFINER, mirrors activate_subscription's style):
-- server-side only path for genuinely free products -- paid ones always go through the real
-- Razorpay create-order/verify-payment edge functions, never this.
--
-- _enrollment_data carries the same fields Enroll.tsx already collects for course checkout
-- (full_name, email, contact_number, whatsapp_number, education_qualification,
-- current_job_title, industry, experience_level, country, city, linkedin_profile,
-- learning_objective) -- required only when the product links to a Course, because
-- public.enrollments has NOT NULL constraints on all of those columns already, independent
-- of this feature. Webinar/workshop linking and standalone content need no such data.
CREATE OR REPLACE FUNCTION public.register_free_digital_product(_product_id uuid, _enrollment_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  p public.digital_products%ROWTYPE;
  existing_order_id uuid;
  order_id uuid;
  existing_enrollment_id uuid;
  missing text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;

  SELECT * INTO p FROM public.digital_products WHERE id = _product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF p.status <> 'published' OR p.approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Product is not published';
  END IF;
  IF p.is_paid AND COALESCE(p.discount_price, p.price, 0) > 0 THEN
    RAISE EXCEPTION 'This product is not free';
  END IF;

  -- Idempotent: if this learner already has an order for this product, just return it.
  SELECT id INTO existing_order_id FROM public.digital_product_orders
    WHERE product_id = _product_id AND buyer_id = auth.uid() LIMIT 1;
  IF existing_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'order_id', existing_order_id, 'already_registered', true);
  END IF;

  IF p.linked_course_id IS NOT NULL THEN
    missing := ARRAY[]::text[];
    IF COALESCE(_enrollment_data->>'full_name', '') = '' THEN missing := missing || 'full_name'; END IF;
    IF COALESCE(_enrollment_data->>'email', '') = '' THEN missing := missing || 'email'; END IF;
    IF COALESCE(_enrollment_data->>'contact_number', '') = '' THEN missing := missing || 'contact_number'; END IF;
    IF COALESCE(_enrollment_data->>'industry', '') = '' THEN missing := missing || 'industry'; END IF;
    IF COALESCE(_enrollment_data->>'experience_level', '') = '' THEN missing := missing || 'experience_level'; END IF;
    IF COALESCE(_enrollment_data->>'country', '') = '' THEN missing := missing || 'country'; END IF;
    IF COALESCE(_enrollment_data->>'city', '') = '' THEN missing := missing || 'city'; END IF;
    IF array_length(missing, 1) > 0 THEN
      RAISE EXCEPTION 'Missing required registration fields: %', array_to_string(missing, ', ');
    END IF;
  END IF;

  INSERT INTO public.digital_product_orders (
    product_id, coach_id, buyer_id, amount_paid, platform_fee, gateway_fee, net_to_coach,
    currency, payment_status, payment_ref, delivery_status
  ) VALUES (
    _product_id, p.coach_id, auth.uid(), 0, 0, 0, 0,
    p.currency, 'paid', NULL,
    CASE WHEN p.linked_course_id IS NOT NULL OR p.linked_webinar_id IS NOT NULL OR p.linked_workshop_id IS NOT NULL
         OR p.product_type IN ('document','video','image','text','link') THEN 'delivered' ELSE 'pending' END
  ) RETURNING id INTO order_id;

  UPDATE public.digital_products SET sales_count = sales_count + 1 WHERE id = _product_id;

  IF p.linked_course_id IS NOT NULL THEN
    SELECT id INTO existing_enrollment_id FROM public.enrollments
      WHERE learner_id = auth.uid() AND course_id = p.linked_course_id;
    IF existing_enrollment_id IS NOT NULL THEN
      UPDATE public.enrollments SET payment_status = 'paid', payment_locked = true WHERE id = existing_enrollment_id;
    ELSE
      INSERT INTO public.enrollments (
        learner_id, course_id, coach_id, full_name, email, contact_number, whatsapp_number,
        education_qualification, current_job_title, industry, experience_level, country, city,
        linkedin_profile, learning_objective, payment_status, payment_locked, amount_paid, currency
      ) VALUES (
        auth.uid(), p.linked_course_id, p.coach_id,
        _enrollment_data->>'full_name', _enrollment_data->>'email', _enrollment_data->>'contact_number',
        COALESCE(_enrollment_data->>'whatsapp_number', ''), COALESCE(_enrollment_data->>'education_qualification', ''),
        COALESCE(_enrollment_data->>'current_job_title', ''), _enrollment_data->>'industry',
        _enrollment_data->>'experience_level', _enrollment_data->>'country', _enrollment_data->>'city',
        COALESCE(_enrollment_data->>'linkedin_profile', ''), COALESCE(_enrollment_data->>'learning_objective', ''),
        'paid', true, 0, p.currency
      );
    END IF;
  END IF;

  IF p.linked_webinar_id IS NOT NULL THEN
    INSERT INTO public.webinar_registrations (webinar_id, learner_id, payment_status, amount_paid)
    VALUES (p.linked_webinar_id, auth.uid(), 'paid', 0)
    ON CONFLICT (webinar_id, learner_id) DO UPDATE SET payment_status = 'paid';
  END IF;

  IF p.linked_workshop_id IS NOT NULL THEN
    INSERT INTO public.workshop_registrations (workshop_id, user_id, status)
    VALUES (p.linked_workshop_id, auth.uid(), 'registered')
    ON CONFLICT (workshop_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', order_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_free_digital_product(uuid, jsonb) TO authenticated;
