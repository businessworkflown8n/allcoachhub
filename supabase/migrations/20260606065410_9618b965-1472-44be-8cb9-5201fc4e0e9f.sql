-- Add course_type and AI Kids Pro fields to courses table
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS course_type text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS target_class text,
  ADD COLUMN IF NOT EXISTS parent_involvement text,
  ADD COLUMN IF NOT EXISTS kids_friendly_badge boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS live_sessions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_compliance boolean DEFAULT false;

-- Validate course_type values via trigger (CHECK constraints conflict with existing data updates)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_course_type_check') THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_course_type_check
      CHECK (course_type IN ('regular','demo','ai_kids_pro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_course_type ON public.courses(course_type);

-- Add per-coach kids course permission
ALTER TABLE public.coach_feature_flags
  ADD COLUMN IF NOT EXISTS kids_courses_access boolean NOT NULL DEFAULT false;

-- Seed global platform settings (idempotent)
INSERT INTO public.platform_settings (key, value)
VALUES ('kids_courses_enabled', 'true'),
       ('kids_courses_global_coach_permission', 'true')
ON CONFLICT (key) DO NOTHING;