
-- ============================================================
-- CURRENCIES TABLE
-- ============================================================
CREATE TABLE public.currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_name TEXT NOT NULL,
  currency_code TEXT NOT NULL UNIQUE,
  currency_symbol TEXT NOT NULL,
  country TEXT,
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.currencies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active currencies"
  ON public.currencies FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage currencies insert"
  ON public.currencies FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage currencies update"
  ON public.currencies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage currencies delete"
  ON public.currencies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_currencies_updated_at
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Protect INR + enforce single default
CREATE OR REPLACE FUNCTION public.protect_inr_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.currency_code = 'INR' THEN
      RAISE EXCEPTION 'INR currency cannot be deleted';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.currency_code = 'INR' AND NEW.is_active = false THEN
      RAISE EXCEPTION 'INR currency cannot be deactivated';
    END IF;
    IF OLD.currency_code = 'INR' AND NEW.currency_code <> 'INR' THEN
      RAISE EXCEPTION 'INR currency code cannot be changed';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_inr
  BEFORE UPDATE OR DELETE ON public.currencies
  FOR EACH ROW EXECUTE FUNCTION public.protect_inr_currency();

CREATE OR REPLACE FUNCTION public.enforce_single_default_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.currencies SET is_default = false
    WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_currency
  AFTER INSERT OR UPDATE OF is_default ON public.currencies
  FOR EACH ROW WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_currency();

-- Seed currencies
INSERT INTO public.currencies (currency_name, currency_code, currency_symbol, country, exchange_rate, is_active, is_default) VALUES
  ('Indian Rupee', 'INR', '₹', 'India', 1, true, true),
  ('US Dollar', 'USD', '$', 'United States', 0.012, false, false),
  ('Euro', 'EUR', '€', 'European Union', 0.011, false, false),
  ('British Pound', 'GBP', '£', 'United Kingdom', 0.0095, false, false),
  ('UAE Dirham', 'AED', 'AED', 'United Arab Emirates', 0.044, false, false);

-- ============================================================
-- COACH CURRENCY REQUESTS
-- ============================================================
CREATE TABLE public.coach_currency_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  requested_currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ccr_coach ON public.coach_currency_requests(coach_id);
CREATE INDEX idx_ccr_status ON public.coach_currency_requests(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_currency_requests TO authenticated;
GRANT ALL ON public.coach_currency_requests TO service_role;

ALTER TABLE public.coach_currency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches see own requests, admins see all"
  ON public.coach_currency_requests FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches create own requests"
  ON public.coach_currency_requests FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Admins update requests"
  ON public.coach_currency_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete requests"
  ON public.coach_currency_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ccr_updated_at
  BEFORE UPDATE ON public.coach_currency_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- COACH CURRENCY SETTINGS
-- ============================================================
CREATE TABLE public.coach_currency_settings (
  coach_id UUID NOT NULL PRIMARY KEY,
  primary_currency TEXT NOT NULL DEFAULT 'INR',
  allowed_currencies TEXT[] NOT NULL DEFAULT ARRAY['INR']::TEXT[],
  currency_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_currency_settings TO authenticated;
GRANT ALL ON public.coach_currency_settings TO service_role;

ALTER TABLE public.coach_currency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches read own settings, admins read all"
  ON public.coach_currency_settings FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches insert own settings"
  ON public.coach_currency_settings FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches update own primary, admins update all"
  ON public.coach_currency_settings FOR UPDATE TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete settings"
  ON public.coach_currency_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ccs_updated_at
  BEFORE UPDATE ON public.coach_currency_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate that primary_currency is always in allowed_currencies
CREATE OR REPLACE FUNCTION public.validate_coach_currency_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Always ensure INR is in allowed list
  IF NOT ('INR' = ANY(NEW.allowed_currencies)) THEN
    NEW.allowed_currencies := array_append(NEW.allowed_currencies, 'INR');
  END IF;
  -- Primary must be in allowed
  IF NOT (NEW.primary_currency = ANY(NEW.allowed_currencies)) THEN
    NEW.primary_currency := 'INR';
  END IF;
  NEW.currency_updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ccs
  BEFORE INSERT OR UPDATE ON public.coach_currency_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_coach_currency_settings();
