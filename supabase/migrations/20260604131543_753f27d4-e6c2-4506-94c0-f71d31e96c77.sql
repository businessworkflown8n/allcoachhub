CREATE TABLE public.course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  tagline text,
  description text,
  icon text,
  thumbnail_url text,
  banner_url text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.course_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_categories TO authenticated;
GRANT ALL ON public.course_categories TO service_role;

ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible course categories"
  ON public.course_categories FOR SELECT
  USING (is_visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert course categories"
  ON public.course_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course categories"
  ON public.course_categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course categories"
  ON public.course_categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_course_categories_updated_at
  BEFORE UPDATE ON public.course_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.course_categories (name, slug, tagline, description, icon, sort_order) VALUES
  ('AI Kids Pro', 'ai-kids-pro', 'Future Skills Program for Class 5–12 Students', 'Learn AI, Build Projects, Create the Future. A 4-level learning path (Explorer, Creator, Innovator, Future Leader) covering ChatGPT, Generative AI, prompt engineering, AI websites, AI video, automation and entrepreneurship for students.', '🚀', 1),
  ('AI for Professionals', 'ai-for-professionals', 'Level up your career with AI skills', 'AI tools and workflows for working professionals.', '💼', 2),
  ('AI for Freelancers', 'ai-for-freelancers', 'Earn more with AI-powered services', 'Productivity and delivery tools for freelancers.', '🧑‍💻', 3),
  ('AI for Business Owners', 'ai-for-business', 'Grow your business with AI', 'AI strategy and automation for SMBs and founders.', '🏢', 4),
  ('AI Certifications', 'ai-certifications', 'Industry-recognised AI credentials', 'Structured certification programs.', '🎓', 5),
  ('AI Marketing', 'ai-marketing', 'Marketing in the age of AI', 'AI for content, ads, SEO and growth.', '📈', 6),
  ('AI Automation', 'ai-automation', 'Automate the boring stuff', 'No-code and low-code AI automation.', '⚡', 7);