-- 1. certificate_templates.name
ALTER TABLE public.certificate_templates ADD COLUMN IF NOT EXISTS name text;
UPDATE public.certificate_templates SET name = title WHERE name IS NULL;

CREATE OR REPLACE FUNCTION public.sync_certificate_template_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NULL OR btrim(NEW.name) = '' THEN
    NEW.name := NEW.title;
  ELSIF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
    NEW.title := NEW.name;
  ELSIF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND NEW.title IS NOT DISTINCT FROM OLD.title THEN
    NEW.title := NEW.name;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_certificate_template_name ON public.certificate_templates;
CREATE TRIGGER trg_sync_certificate_template_name
BEFORE INSERT OR UPDATE ON public.certificate_templates
FOR EACH ROW EXECUTE FUNCTION public.sync_certificate_template_name();

ALTER TABLE public.certificate_templates ALTER COLUMN title DROP NOT NULL;

-- 2. pgcrypto search_path for WhatsApp credential functions
CREATE OR REPLACE FUNCTION public.get_whatsapp_credentials(_coach_id uuid)
RETURNS TABLE(login_url text, user_id text, password text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _coach_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _coach_id = auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT EXISTS (SELECT 1 FROM public.whatsapp_access wa WHERE wa.coach_id = auth.uid() AND wa.is_active = true) THEN
    RAISE EXCEPTION 'WhatsApp access not enabled';
  END IF;
  RETURN QUERY
  SELECT wc.login_url,
         CASE WHEN wc.user_id_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(wc.user_id_enc, private.wa_enc_key()) ELSE NULL END,
         CASE WHEN wc.password_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(wc.password_enc, private.wa_enc_key()) ELSE NULL END
  FROM public.whatsapp_credentials wc WHERE wc.coach_id = _coach_id;
END $$;