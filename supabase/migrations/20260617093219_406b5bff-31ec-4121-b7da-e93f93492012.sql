
CREATE TABLE IF NOT EXISTS public.whatsapp_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  login_url text NOT NULL DEFAULT 'https://login.digitalsms.biz/signin.php',
  user_id text,
  password text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_credentials TO authenticated;
GRANT ALL ON public.whatsapp_credentials TO service_role;

ALTER TABLE public.whatsapp_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all whatsapp credentials"
  ON public.whatsapp_credentials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches view own credentials when access active"
  ON public.whatsapp_credentials FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_access wa
      WHERE wa.coach_id = auth.uid() AND wa.is_active = true
    )
  );

CREATE TRIGGER trg_whatsapp_credentials_updated_at
  BEFORE UPDATE ON public.whatsapp_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.whatsapp_credential_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  note text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_credential_requests TO authenticated;
GRANT ALL ON public.whatsapp_credential_requests TO service_role;

ALTER TABLE public.whatsapp_credential_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches create own credential requests"
  ON public.whatsapp_credential_requests FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches view own credential requests"
  ON public.whatsapp_credential_requests FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update credential requests"
  ON public.whatsapp_credential_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_whatsapp_credential_requests_updated_at
  BEFORE UPDATE ON public.whatsapp_credential_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
