
-- Drop public SELECT exposure of invite tokens; use redeem_course_invite RPC instead
DROP POLICY IF EXISTS "Anyone can view valid invites by token" ON public.course_invites;

-- Drop public SELECT exposure of material share tokens
DROP POLICY IF EXISTS "Anyone can read active links by token" ON public.material_links;

-- Restrict platform integrations config reads to admins and coaches (oauth_config column already revoked)
DROP POLICY IF EXISTS "Anyone can read platform config" ON public.platform_integrations_config;
CREATE POLICY "Coaches and admins can read platform config"
  ON public.platform_integrations_config FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coach'::app_role)
  );
