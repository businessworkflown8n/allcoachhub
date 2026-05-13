
ALTER TABLE public.coach_websites
  ADD COLUMN IF NOT EXISTS source_mode TEXT NOT NULL DEFAULT 'builder',
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_html TEXT,
  ADD COLUMN IF NOT EXISTS github_repo_url TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_websites_source_mode_check'
  ) THEN
    ALTER TABLE public.coach_websites
      ADD CONSTRAINT coach_websites_source_mode_check
      CHECK (source_mode IN ('builder','external_url','html_file','github'));
  END IF;
END $$;
