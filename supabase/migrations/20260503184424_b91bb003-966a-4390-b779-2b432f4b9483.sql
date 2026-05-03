
-- Fix 1: landing_page_leads — restrict SELECT to admins + the coach who owns the landing page
DROP POLICY IF EXISTS "Allow select leads for authenticated" ON public.landing_page_leads;

CREATE POLICY "Owning coach can view their landing page leads"
ON public.landing_page_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.landing_pages lp
    WHERE lp.id = landing_page_leads.landing_page_id
      AND lp.coach_id = auth.uid()
  )
);

-- Fix 2: funnel_config — restrict ALL ops to admins (read remains open via existing "Anyone can view")
DROP POLICY IF EXISTS "Authenticated users can manage funnel config" ON public.funnel_config;

CREATE POLICY "Admins can manage funnel config"
ON public.funnel_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: seo_page_metadata — scope SELECT to coach owner or admin
DROP POLICY IF EXISTS "Coaches can view own page SEO" ON public.seo_page_metadata;

CREATE POLICY "Coaches can view own page SEO"
ON public.seo_page_metadata
FOR SELECT
TO authenticated
USING (coach_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 4: realtime messages — require authentication for broadcast subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can send broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
