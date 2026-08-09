
-- Enable pg_net for async HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============= seo_alerts =============
CREATE TABLE IF NOT EXISTS public.seo_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- '404', 'broken_link', 'duplicate_content', 'crawl_error', 'missing_meta', 'low_score'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low','medium','high','critical'
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  coach_id UUID,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_alerts_coach ON public.seo_alerts(coach_id);
CREATE INDEX IF NOT EXISTS idx_seo_alerts_resolved ON public.seo_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_seo_alerts_severity ON public.seo_alerts(severity);

ALTER TABLE public.seo_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all seo_alerts"
ON public.seo_alerts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches view own seo_alerts"
ON public.seo_alerts FOR SELECT TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches update own seo_alerts"
ON public.seo_alerts FOR UPDATE TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE TRIGGER seo_alerts_updated_at
BEFORE UPDATE ON public.seo_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= gsc_connections =============
CREATE TABLE IF NOT EXISTS public.gsc_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  site_url TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active','expired','revoked'
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own GSC connection"
ON public.gsc_connections FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all GSC connections"
ON public.gsc_connections FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER gsc_connections_updated_at
BEFORE UPDATE ON public.gsc_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= seo_ping_log =============
CREATE TABLE IF NOT EXISTS public.seo_ping_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_engine TEXT NOT NULL, -- 'google','bing'
  sitemap_url TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success','failed'
  http_status INTEGER,
  response_body TEXT,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_ping_log_engine ON public.seo_ping_log(search_engine);

ALTER TABLE public.seo_ping_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ping log"
ON public.seo_ping_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============= Auto-index trigger function =============
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

-- Attach to content tables (drop first to keep idempotent)
DROP TRIGGER IF EXISTS auto_index_courses ON public.courses;
CREATE TRIGGER auto_index_courses
AFTER INSERT OR UPDATE OF is_published, approval_status, title, description, slug
ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_index();

DROP TRIGGER IF EXISTS auto_index_ai_blogs ON public.ai_blogs;
CREATE TRIGGER auto_index_ai_blogs
AFTER INSERT OR UPDATE OF is_published, title, excerpt, slug, meta_title, meta_description
ON public.ai_blogs
FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_index();

DROP TRIGGER IF EXISTS auto_index_landing_pages ON public.landing_pages;
CREATE TRIGGER auto_index_landing_pages
AFTER INSERT OR UPDATE OF status, is_published, headline, title, slug, meta_title, meta_description
ON public.landing_pages
FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_index();

DROP TRIGGER IF EXISTS auto_index_coach_websites ON public.coach_websites;
CREATE TRIGGER auto_index_coach_websites
AFTER INSERT OR UPDATE OF is_live, status, institute_name, tagline, slug, meta_title, meta_description
ON public.coach_websites
FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_index();
