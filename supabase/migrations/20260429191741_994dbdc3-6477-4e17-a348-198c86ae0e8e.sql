CREATE TABLE IF NOT EXISTS public.seo_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seo settings"
ON public.seo_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert seo settings"
ON public.seo_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update seo settings"
ON public.seo_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER seo_settings_updated_at
BEFORE UPDATE ON public.seo_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seo_settings (key, value)
VALUES ('auto_indexing_mode', '"auto"'::jsonb)
ON CONFLICT (key) DO NOTHING;