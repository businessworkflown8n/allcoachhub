-- Register LinkedIn Post Generator feature in master + controls
INSERT INTO public.features_master (feature_key, name, description, category, depends_on, supports_usage_limit, sort_order)
VALUES (
  'linkedin_post',
  'LinkedIn Post',
  'AI Mastermind LinkedIn Post Generator + branded badge image for coaches.',
  'growth',
  NULL,
  true,
  100
)
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.feature_controls (feature_key, global_enabled, free_enabled, pro_enabled, premium_enabled, free_usage_limit, pro_usage_limit, premium_usage_limit)
VALUES ('linkedin_post', false, true, true, true, NULL, NULL, NULL)
ON CONFLICT (feature_key) DO NOTHING;

-- Track generations for analytics + future leaderboard
CREATE TABLE IF NOT EXISTS public.linkedin_post_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  coach_slug TEXT,
  visitor_name TEXT,
  visitor_role TEXT,
  visitor_company TEXT,
  visitor_excitement TEXT,
  post_text TEXT,
  image_url TEXT,
  action TEXT NOT NULL DEFAULT 'generated', -- generated | copied | shared | downloaded
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_post_generations ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous visitors on public coach page) can insert tracking events
CREATE POLICY "Anyone can log linkedin post events"
ON public.linkedin_post_generations
FOR INSERT
WITH CHECK (true);

-- Coaches see their own analytics; admins see all
CREATE POLICY "Coaches view own linkedin post events"
ON public.linkedin_post_generations
FOR SELECT
USING (auth.uid() = coach_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_linkedin_post_gen_coach ON public.linkedin_post_generations(coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_gen_action ON public.linkedin_post_generations(action);