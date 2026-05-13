
-- Add section_order column to templates so layout is saved with template
ALTER TABLE public.coach_website_templates
  ADD COLUMN IF NOT EXISTS section_order JSONB DEFAULT '[]'::jsonb;

-- Replace public read policy to also include user's own private templates
DROP POLICY IF EXISTS "Public read published templates" ON public.coach_website_templates;

CREATE POLICY "Read published or own templates"
ON public.coach_website_templates
FOR SELECT
USING (
  is_published = true
  OR has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
);

-- Allow coaches to create their own private templates
CREATE POLICY "Coaches insert own templates"
ON public.coach_website_templates
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND is_published = false
  AND has_role(auth.uid(), 'coach'::app_role)
);

-- Allow coaches to update their own private templates
CREATE POLICY "Coaches update own templates"
ON public.coach_website_templates
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND is_published = false)
WITH CHECK (created_by = auth.uid() AND is_published = false);

-- Allow coaches to delete their own private templates
CREATE POLICY "Coaches delete own templates"
ON public.coach_website_templates
FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND is_published = false);
