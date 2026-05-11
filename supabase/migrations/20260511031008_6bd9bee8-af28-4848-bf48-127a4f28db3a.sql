
-- chat_history: drop public SELECT
DROP POLICY IF EXISTS "Lead session can read own chat" ON public.chat_history;

-- funnel_email_logs: drop public SELECT, restrict to admins
DROP POLICY IF EXISTS "Anyone can view email logs" ON public.funnel_email_logs;
CREATE POLICY "Admins can view email logs"
  ON public.funnel_email_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- landing_pages: drop unrestricted policies
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.landing_pages;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.landing_pages;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.landing_pages;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.landing_pages;
-- Add admin manage policy
CREATE POLICY "Admins manage all landing pages"
  ON public.landing_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- landing_page_features: replace overly broad ALL policy
DROP POLICY IF EXISTS "Auth users manage features" ON public.landing_page_features;
CREATE POLICY "Coach manages own landing page features"
  ON public.landing_page_features FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.landing_pages lp
    WHERE lp.id = landing_page_features.landing_page_id
      AND lp.coach_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.landing_pages lp
    WHERE lp.id = landing_page_features.landing_page_id
      AND lp.coach_id = auth.uid()
  ));
CREATE POLICY "Admins manage all landing page features"
  ON public.landing_page_features FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- landing_page_cta_clicks: scope SELECT to owning coach + admins
DROP POLICY IF EXISTS "Auth users view clicks" ON public.landing_page_cta_clicks;
CREATE POLICY "Coach views own landing page clicks"
  ON public.landing_page_cta_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.landing_pages lp
    WHERE lp.id = landing_page_cta_clicks.landing_page_id
      AND lp.coach_id = auth.uid()
  ));
CREATE POLICY "Admins view all landing page clicks"
  ON public.landing_page_cta_clicks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- messages: drop the broadcast policies that broke privacy
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;
