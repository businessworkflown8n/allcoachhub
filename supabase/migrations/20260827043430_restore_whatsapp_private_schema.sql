-- Restores the `private` schema and private.wa_enc_key() function that
-- set_whatsapp_credentials()/get_whatsapp_credentials() depend on. This
-- schema was created by migration 20260627131354 on the original Supabase
-- project but was never carried over when the app was pointed at the
-- migrated project (fwtmgvszacuebhxnshct) -- even though the whatsapp_*
-- tables and these two RPC functions *were* carried over, leaving
-- set_whatsapp_credentials() failing with "schema \"private\" does not
-- exist" whenever an admin tried to save a coach's WhatsApp dashboard
-- credentials. Recreated with the exact original key literal so it stays
-- compatible with any rows encrypted before the gap.
--
-- Also fixes a second, previously-latent bug found while restoring this:
-- set_whatsapp_credentials() never had `extensions` in its search_path even
-- though pgcrypto's pgp_sym_encrypt/pgp_sym_decrypt live in the `extensions`
-- schema on this project (get_whatsapp_credentials was already fixed for
-- this in migration 20260801152759, but the write path was missed). Without
-- this, saving would have failed again right after the private-schema fix,
-- just with a different error ("function pgp_sym_encrypt does not exist").
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.wa_enc_key()
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = private
AS $$ SELECT 'wa_creds_aicoachportal_v1_4fk93Lz0qP8sR2nM5tV9xY1bH7jD'::text $$;
REVOKE ALL ON FUNCTION private.wa_enc_key() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.set_whatsapp_credentials(_coach_id uuid, _login_url text, _user_id text, _password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, extensions AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  INSERT INTO public.whatsapp_credentials (coach_id, login_url, user_id_enc, password_enc, updated_by)
  VALUES (
    _coach_id,
    COALESCE(NULLIF(_login_url, ''), 'https://login.digitalsms.biz/signin.php'),
    extensions.pgp_sym_encrypt(_user_id, private.wa_enc_key()),
    extensions.pgp_sym_encrypt(_password, private.wa_enc_key()),
    auth.uid()
  )
  ON CONFLICT (coach_id) DO UPDATE SET
    login_url = EXCLUDED.login_url,
    user_id_enc = EXCLUDED.user_id_enc,
    password_enc = EXCLUDED.password_enc,
    updated_by = auth.uid(),
    updated_at = now();
END $$;
GRANT EXECUTE ON FUNCTION public.set_whatsapp_credentials(uuid, text, text, text) TO authenticated;
