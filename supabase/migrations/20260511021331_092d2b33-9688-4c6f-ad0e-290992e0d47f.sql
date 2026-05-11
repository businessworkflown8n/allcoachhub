
ALTER TABLE public.coach_websites
  ADD COLUMN IF NOT EXISTS header_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_variant TEXT DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS animation_enabled BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.coach_website_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  preview_image TEXT,
  theme_color TEXT DEFAULT '#84cc16',
  hero_variant TEXT DEFAULT 'gradient',
  layout_variant TEXT DEFAULT 'classic',
  content_sections JSONB DEFAULT '{}'::jsonb,
  header_config JSONB DEFAULT '{}'::jsonb,
  section_visibility JSONB DEFAULT '{}'::jsonb,
  is_premium BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coach_website_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published templates" ON public.coach_website_templates;
CREATE POLICY "Public read published templates" ON public.coach_website_templates
  FOR SELECT USING (is_published = true OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage templates" ON public.coach_website_templates;
CREATE POLICY "Admins manage templates" ON public.coach_website_templates
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_coach_website_templates_updated_at
  BEFORE UPDATE ON public.coach_website_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.coach_website_templates (name, category, description, theme_color, hero_variant, layout_variant, content_sections, display_order) VALUES
('AI Mastery Pro', 'AI Coaching', 'Premium AI coaching template with neon gradients and 3D CTAs.', '#a855f7', 'particle', 'spotlight',
  '{"cta_headline":"Master AI in 30 Days","cta_subtext":"Join 10,000+ learners building real AI products.","demo_heading":"Book Your Free AI Strategy Call","stats":[{"value":"10K+","label":"AI Learners"},{"value":"50+","label":"AI Projects"},{"value":"4.9★","label":"Rating"},{"value":"95%","label":"Placement"}]}'::jsonb, 1),
('Business Accelerator', 'Business Coaching', 'Corporate-grade template for business mentors and consultants.', '#3b82f6', 'gradient', 'grid',
  '{"cta_headline":"Scale Your Business 10x","cta_subtext":"Proven frameworks used by 500+ founders.","demo_heading":"Schedule Strategy Session","stats":[{"value":"500+","label":"Founders"},{"value":"$50M+","label":"Revenue Generated"},{"value":"4.8★","label":"Rating"}]}'::jsonb, 2),
('Fitness Transform', 'Fitness Coaching', 'Bold, energetic template for fitness and wellness coaches.', '#ef4444', 'gradient', 'carousel',
  '{"cta_headline":"Transform Your Body in 12 Weeks","cta_subtext":"Personalized programs, real results.","demo_heading":"Get Your Fitness Plan","stats":[{"value":"2K+","label":"Clients"},{"value":"50K+","label":"Lbs Lost"},{"value":"4.9★","label":"Rating"}]}'::jsonb, 3),
('Trading Pro Academy', 'Trading Coaching', 'High-ticket template for trading and investment educators.', '#10b981', 'particle', 'spotlight',
  '{"cta_headline":"Trade Like the Pros","cta_subtext":"Learn proven strategies from veteran traders.","demo_heading":"Book Free Trading Demo","stats":[{"value":"5K+","label":"Traders"},{"value":"85%","label":"Win Rate"},{"value":"4.9★","label":"Rating"}]}'::jsonb, 4),
('Digital Marketing Pro', 'Digital Marketing', 'Conversion-optimized template for digital marketing courses.', '#f59e0b', 'gradient', 'grid',
  '{"cta_headline":"Become a Digital Marketing Expert","cta_subtext":"Master SEO, Ads, Content & Social.","demo_heading":"Free Marketing Audit","stats":[{"value":"3K+","label":"Marketers"},{"value":"100+","label":"Brands"},{"value":"4.8★","label":"Rating"}]}'::jsonb, 5),
('Webinar Funnel Pro', 'Webinar Funnel', 'High-converting webinar registration funnel template.', '#8b5cf6', 'gradient', 'classic',
  '{"cta_headline":"Reserve Your Free Spot","cta_subtext":"Limited seats. Live training starts soon.","demo_heading":"Save My Seat","stats":[{"value":"10K+","label":"Attendees"},{"value":"50+","label":"Webinars"},{"value":"4.9★","label":"Rating"}]}'::jsonb, 6),
('Masterclass Elite', 'Masterclass', 'Premium masterclass template with countdown and authority design.', '#ec4899', 'particle', 'spotlight',
  '{"cta_headline":"Join the Masterclass","cta_subtext":"One-time live session. Lifetime impact.","demo_heading":"Reserve My Seat","stats":[{"value":"5K+","label":"Alumni"},{"value":"4.9★","label":"Rating"},{"value":"98%","label":"Recommend"}]}'::jsonb, 7),
('Consulting Authority', 'Consulting', 'Authority-driven template for consultants and advisors.', '#0ea5e9', 'classic', 'grid',
  '{"cta_headline":"Strategic Consulting That Delivers","cta_subtext":"Tailored solutions for ambitious leaders.","demo_heading":"Book Discovery Call","stats":[{"value":"200+","label":"Clients"},{"value":"15+","label":"Years"},{"value":"4.9★","label":"Rating"}]}'::jsonb, 8),
('High-Ticket Funnel', 'High-Ticket Funnel', 'Premium funnel template optimized for high-ticket coaching offers.', '#84cc16', 'gradient', 'spotlight',
  '{"cta_headline":"Apply for the Inner Circle","cta_subtext":"Limited to 20 serious clients per quarter.","demo_heading":"Apply Now","stats":[{"value":"100+","label":"Members"},{"value":"$10M+","label":"Client Revenue"},{"value":"4.9★","label":"Rating"}]}'::jsonb, 9),
('Lead Magnet Pro', 'Lead Generation', 'Lead capture optimized template with prominent form.', '#06b6d4', 'gradient', 'classic',
  '{"cta_headline":"Get the Free Guide","cta_subtext":"Download instantly. Transform today.","demo_heading":"Send Me the Guide","stats":[{"value":"50K+","label":"Downloads"},{"value":"4.8★","label":"Rating"},{"value":"95%","label":"Recommend"}]}'::jsonb, 10);
