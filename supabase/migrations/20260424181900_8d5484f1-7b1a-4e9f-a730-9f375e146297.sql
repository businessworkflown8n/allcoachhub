CREATE TABLE public.knowledge_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  hero_image_url TEXT,
  primary_keyword TEXT,
  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published topics"
  ON public.knowledge_topics FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage topics"
  ON public.knowledge_topics FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_knowledge_topics_updated_at
  BEFORE UPDATE ON public.knowledge_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.knowledge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.knowledge_topics(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  slug TEXT NOT NULL,
  ai_summary TEXT,
  detailed_explanation TEXT,
  key_takeaways JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  source_references JSONB DEFAULT '[]'::jsonb,
  focus_keyword TEXT,
  secondary_keywords TEXT[],
  meta_title TEXT,
  meta_description TEXT,
  hero_image_url TEXT,
  author_name TEXT DEFAULT 'AI Coach Portal Editorial',
  author_expertise TEXT DEFAULT 'AI coaching marketplace research team',
  reviewed_by TEXT,
  last_reviewed_at TIMESTAMPTZ DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (topic_id, slug)
);

ALTER TABLE public.knowledge_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published questions"
  ON public.knowledge_questions FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage questions"
  ON public.knowledge_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_knowledge_questions_topic ON public.knowledge_questions(topic_id);
CREATE INDEX idx_knowledge_questions_published ON public.knowledge_questions(is_published) WHERE is_published = true;

CREATE TRIGGER update_knowledge_questions_updated_at
  BEFORE UPDATE ON public.knowledge_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_knowledge_question_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN RETURN NEW; END IF;
  IF NEW.question IS NULL OR NEW.question = '' THEN RETURN NEW; END IF;
  base_slug := lower(regexp_replace(regexp_replace(NEW.question, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 80);
  new_slug := base_slug;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.knowledge_questions
      WHERE slug = new_slug AND topic_id = NEW.topic_id AND id != COALESCE(NEW.id, gen_random_uuid())
    ) THEN EXIT; END IF;
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_question_slug_trigger
  BEFORE INSERT OR UPDATE OF question ON public.knowledge_questions
  FOR EACH ROW EXECUTE FUNCTION public.generate_knowledge_question_slug();

CREATE OR REPLACE FUNCTION public.seo_auto_detect_knowledge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_page_url TEXT;
  v_topic_slug TEXT;
BEGIN
  IF TG_TABLE_NAME = 'knowledge_topics' AND NEW.is_published = true THEN
    v_page_url := '/knowledge/' || NEW.slug;
    INSERT INTO public.seo_page_metadata (page_url, page_type, meta_title, meta_description, h1_tag, primary_keyword, robots_directive, canonical_url, index_status, is_auto_generated, page_title, sitemap_included)
    VALUES (
      v_page_url, 'knowledge_topic',
      LEFT(COALESCE(NEW.meta_title, NEW.name || ' — AI Coach Portal Knowledge Hub'), 70),
      LEFT(COALESCE(NEW.meta_description, NEW.description, 'Expert answers about ' || NEW.name), 160),
      NEW.name, NEW.primary_keyword, 'index, follow',
      'https://www.aicoachportal.com' || v_page_url,
      'pending', true, NEW.name, true
    )
    ON CONFLICT (page_url) DO UPDATE SET
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      updated_at = now();
  ELSIF TG_TABLE_NAME = 'knowledge_questions' AND NEW.is_published = true THEN
    SELECT slug INTO v_topic_slug FROM public.knowledge_topics WHERE id = NEW.topic_id;
    v_page_url := '/knowledge/' || v_topic_slug || '/' || NEW.slug;
    INSERT INTO public.seo_page_metadata (page_url, page_type, meta_title, meta_description, h1_tag, primary_keyword, robots_directive, canonical_url, index_status, is_auto_generated, page_title, sitemap_included)
    VALUES (
      v_page_url, 'knowledge_question',
      LEFT(COALESCE(NEW.meta_title, NEW.question || ' | AI Coach Portal'), 70),
      LEFT(COALESCE(NEW.meta_description, NEW.ai_summary, NEW.question), 160),
      NEW.question, NEW.focus_keyword, 'index, follow',
      'https://www.aicoachportal.com' || v_page_url,
      'pending', true, NEW.question, true
    )
    ON CONFLICT (page_url) DO UPDATE SET
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seo_knowledge_topic_trigger
  AFTER INSERT OR UPDATE ON public.knowledge_topics
  FOR EACH ROW EXECUTE FUNCTION public.seo_auto_detect_knowledge();

CREATE TRIGGER seo_knowledge_question_trigger
  AFTER INSERT OR UPDATE ON public.knowledge_questions
  FOR EACH ROW EXECUTE FUNCTION public.seo_auto_detect_knowledge();

CREATE OR REPLACE FUNCTION public.trigger_auto_index_knowledge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_url TEXT;
  v_topic_slug TEXT;
  v_endpoint TEXT := 'https://fwtmgvszacuebhxnshct.supabase.co/functions/v1/auto-indexer';
BEGIN
  IF TG_TABLE_NAME = 'knowledge_topics' AND NEW.is_published = true THEN
    v_url := '/knowledge/' || NEW.slug;
  ELSIF TG_TABLE_NAME = 'knowledge_questions' AND NEW.is_published = true THEN
    SELECT slug INTO v_topic_slug FROM public.knowledge_topics WHERE id = NEW.topic_id;
    v_url := '/knowledge/' || v_topic_slug || '/' || NEW.slug;
  END IF;

  IF v_url IS NOT NULL THEN
    PERFORM extensions.net.http_post(
      url := v_endpoint,
      body := jsonb_build_object('url', v_url, 'source', TG_TABLE_NAME, 'action', 'URL_UPDATED'),
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 5000
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_index_knowledge_topic
  AFTER INSERT OR UPDATE ON public.knowledge_topics
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_index_knowledge();

CREATE TRIGGER auto_index_knowledge_question
  AFTER INSERT OR UPDATE ON public.knowledge_questions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_index_knowledge();