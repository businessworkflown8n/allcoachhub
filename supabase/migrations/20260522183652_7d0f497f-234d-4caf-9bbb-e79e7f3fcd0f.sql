
-- 1. Messages: remove dangerous broadcast policies
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

-- 2. Funnel config: restrict to admins
DROP POLICY IF EXISTS "Anyone can view funnel config" ON public.funnel_config;
CREATE POLICY "Admins can view funnel config"
  ON public.funnel_config
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Platform settings: restrict sensitive keys
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;

CREATE POLICY "Public can read non-sensitive settings"
  ON public.platform_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key NOT IN (
      'commission_percent',
      'webinar_commission_percent',
      'referral_commission_percent',
      'platform_fee_percent'
    )
  );

CREATE POLICY "Admins can read all settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Profiles PII: revoke sensitive columns from anonymous role
REVOKE SELECT (email, contact_number, whatsapp_number)
  ON public.profiles FROM anon;
