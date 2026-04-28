-- Digital Products module

-- 1. Settings (single row)
CREATE TABLE public.digital_product_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_enabled boolean NOT NULL DEFAULT false,
  allowed_types text[] NOT NULL DEFAULT ARRAY['document','video','image','text','link','physical'],
  allow_paid boolean NOT NULL DEFAULT true,
  require_approval boolean NOT NULL DEFAULT true,
  platform_commission_percent numeric NOT NULL DEFAULT 10,
  min_price numeric,
  max_price numeric,
  allow_discount boolean NOT NULL DEFAULT true,
  allow_refunds boolean NOT NULL DEFAULT false,
  max_products_per_coach integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.digital_product_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read DP settings" ON public.digital_product_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins manage DP settings" ON public.digital_product_settings
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.digital_product_settings (global_enabled) VALUES (false);

-- 2. Per-coach access override
CREATE TABLE public.digital_product_coach_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  enabled boolean,
  allowed_types text[],
  max_products integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.digital_product_coach_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach reads own DP access" ON public.digital_product_coach_access
  FOR SELECT USING (coach_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manages DP access" ON public.digital_product_coach_access
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. Products
CREATE TABLE public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  title text NOT NULL CHECK (length(title) <= 55),
  description text,
  product_type text NOT NULL CHECK (product_type IN ('document','video','image','text','link','physical')),
  content_url text,
  content_text text,
  cover_image_url text,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  is_paid boolean NOT NULL DEFAULT false,
  price numeric,
  discount_price numeric,
  currency text NOT NULL DEFAULT 'INR',
  pass_gateway_fees boolean NOT NULL DEFAULT false,
  limited_time boolean NOT NULL DEFAULT false,
  available_from timestamptz,
  available_until timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','published','archived')),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  rejection_reason text,
  views_count integer NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_dp_coach ON public.digital_products(coach_id);
CREATE INDEX idx_dp_status ON public.digital_products(status, approval_status);

CREATE POLICY "Public reads published DP" ON public.digital_products
  FOR SELECT USING (status='published' AND approval_status='approved');
CREATE POLICY "Coach reads own DP" ON public.digital_products
  FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "Admin reads all DP" ON public.digital_products
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Coach inserts own DP" ON public.digital_products
  FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "Coach updates own DP" ON public.digital_products
  FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "Admin updates any DP" ON public.digital_products
  FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Coach deletes own DP" ON public.digital_products
  FOR DELETE USING (coach_id = auth.uid());
CREATE POLICY "Admin deletes any DP" ON public.digital_products
  FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_dp_updated BEFORE UPDATE ON public.digital_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dp_settings_updated BEFORE UPDATE ON public.digital_product_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dp_access_updated BEFORE UPDATE ON public.digital_product_coach_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Orders
CREATE TABLE public.digital_product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  gateway_fee numeric NOT NULL DEFAULT 0,
  net_to_coach numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_ref text,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','delivered','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.digital_product_orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_dpo_coach ON public.digital_product_orders(coach_id);
CREATE INDEX idx_dpo_buyer ON public.digital_product_orders(buyer_id);
CREATE INDEX idx_dpo_product ON public.digital_product_orders(product_id);

CREATE POLICY "Buyer reads own DP orders" ON public.digital_product_orders
  FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Coach reads own DP orders" ON public.digital_product_orders
  FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "Admin reads all DP orders" ON public.digital_product_orders
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyer creates own DP order" ON public.digital_product_orders
  FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Admin updates DP orders" ON public.digital_product_orders
  FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_dpo_updated BEFORE UPDATE ON public.digital_product_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Effective access resolver
CREATE OR REPLACE FUNCTION public.get_digital_product_access(_coach_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.digital_product_settings%ROWTYPE;
  o public.digital_product_coach_access%ROWTYPE;
  enabled boolean;
  types text[];
  max_products integer;
BEGIN
  SELECT * INTO s FROM public.digital_product_settings LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'no_settings');
  END IF;

  enabled := s.global_enabled;
  types := s.allowed_types;
  max_products := s.max_products_per_coach;

  SELECT * INTO o FROM public.digital_product_coach_access WHERE coach_id = _coach_id;
  IF FOUND THEN
    IF o.enabled IS NOT NULL THEN enabled := o.enabled; END IF;
    IF o.allowed_types IS NOT NULL THEN types := o.allowed_types; END IF;
    IF o.max_products IS NOT NULL THEN max_products := o.max_products; END IF;
  END IF;

  RETURN jsonb_build_object(
    'enabled', enabled,
    'allowed_types', types,
    'allow_paid', s.allow_paid,
    'require_approval', s.require_approval,
    'platform_commission_percent', s.platform_commission_percent,
    'min_price', s.min_price,
    'max_price', s.max_price,
    'allow_discount', s.allow_discount,
    'allow_refunds', s.allow_refunds,
    'max_products', max_products,
    'reason', CASE WHEN enabled THEN 'allowed' ELSE 'disabled' END
  );
END;
$$;