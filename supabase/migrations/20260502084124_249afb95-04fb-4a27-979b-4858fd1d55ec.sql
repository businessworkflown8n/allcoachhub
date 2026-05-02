-- External Link Controls: admin-managed toggles for cross-cutting public tools
CREATE TABLE IF NOT EXISTS public.external_link_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  public_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.external_link_controls ENABLE ROW LEVEL SECURITY;

-- Anyone can read the toggle so logged-in users can know if a feature is available
CREATE POLICY "Public can view external link controls"
ON public.external_link_controls FOR SELECT
USING (true);

CREATE POLICY "Admins manage external link controls insert"
ON public.external_link_controls FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage external link controls update"
ON public.external_link_controls FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage external link controls delete"
ON public.external_link_controls FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_external_link_controls_updated_at
BEFORE UPDATE ON public.external_link_controls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the initial AI Jobs & News LinkedIn Post feature
INSERT INTO public.external_link_controls (feature_key, label, description, category, public_url, is_enabled)
VALUES (
  'ai_jobs_news_linkedin_post',
  'LinkedIn Post Generator',
  'Public AI Mastermind LinkedIn post generator under AI Jobs & News. Logged-in users can generate a personalized post and branded badge.',
  'ai_jobs_news',
  '/ai-jobs-news/linkedin-post',
  false
)
ON CONFLICT (feature_key) DO NOTHING;

-- Track usage of the public generator for analytics
CREATE TABLE IF NOT EXISTS public.public_linkedin_post_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_linkedin_post_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can log their actions"
ON public.public_linkedin_post_generations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all public LinkedIn generations"
ON public.public_linkedin_post_generations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own logs"
ON public.public_linkedin_post_generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);