-- Retarget auto-indexer HTTP triggers from Lovable Cloud to external Supabase.
-- Replaces function bodies only (same logic as prior migrations).

CREATE OR REPLACE FUNCTION public.trigger_auto_index()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT;
  v_should_index BOOLEAN := false;
  v_endpoint TEXT := 'https://fwtmgvszacuebhxnshct.supabase.co/functions/v1/auto-indexer';
BEGIN
  -- Determine URL and whether this row is publishable
  IF TG_TABLE_NAME = 'courses' THEN
    IF NEW.is_published = true AND NEW.approval_status = 'approved' THEN
      v_url := '/course/' || COALESCE(NEW.slug, NEW.id::text);
      v_should_index := true;
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_blogs' THEN
    IF NEW.is_published = true THEN
      v_url := '/ai-blogs/' || COALESCE(NEW.slug, NEW.id::text);
      v_should_index := true;
    END IF;
  ELSIF TG_TABLE_NAME = 'landing_pages' THEN
    IF NEW.status = 'published' OR NEW.is_published = true THEN
      v_url := '/lp/' || NEW.slug;
      v_should_index := true;
    END IF;
  ELSIF TG_TABLE_NAME = 'coach_websites' THEN
    IF NEW.is_live = true AND NEW.status = 'approved' THEN
      v_url := '/coach-website/' || NEW.slug;
      v_should_index := true;
    END IF;
  END IF;

  IF v_should_index AND v_url IS NOT NULL THEN
    -- Fire-and-forget HTTP POST to auto-indexer edge function
    PERFORM extensions.net.http_post(
      url := v_endpoint,
      body := jsonb_build_object('url', v_url, 'source', TG_TABLE_NAME, 'action', 'URL_UPDATED'),
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block writes due to indexing failures
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_auto_index_knowledge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
