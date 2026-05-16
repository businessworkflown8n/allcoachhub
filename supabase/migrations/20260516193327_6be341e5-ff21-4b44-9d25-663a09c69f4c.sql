
-- Drive connections (one per coach)
CREATE TABLE public.drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'google_drive',
  google_account_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  root_folder_id TEXT,
  subfolder_ids JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'connected',
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  quota_total BIGINT,
  quota_used BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.drive_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach views own drive connection" ON public.drive_connections FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Coach inserts own drive connection" ON public.drive_connections FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coach updates own drive connection" ON public.drive_connections FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "Coach deletes own drive connection" ON public.drive_connections FOR DELETE USING (auth.uid() = coach_id);
CREATE POLICY "Admin sees all drive connections" ON public.drive_connections FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates all drive connections" ON public.drive_connections FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER drive_connections_updated_at BEFORE UPDATE ON public.drive_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drive files registry
CREATE TABLE public.drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  drive_file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  parent_folder_id TEXT,
  category TEXT DEFAULT 'pdf',
  web_view_link TEXT,
  web_content_link TEXT,
  thumbnail_link TEXT,
  course_id UUID,
  lesson_id UUID,
  visibility TEXT DEFAULT 'private',
  ai_tags TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  transcript TEXT,
  ai_processed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_id, drive_file_id)
);
CREATE INDEX idx_drive_files_coach ON public.drive_files(coach_id);
CREATE INDEX idx_drive_files_course ON public.drive_files(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_drive_files_category ON public.drive_files(category);
CREATE INDEX idx_drive_files_tags ON public.drive_files USING GIN(ai_tags);

ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach owns files" ON public.drive_files FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Admin sees all drive files" ON public.drive_files FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled learners view course drive files"
ON public.drive_files FOR SELECT
USING (
  course_id IS NOT NULL
  AND visibility IN ('students','public','stream_only')
  AND public.learner_enrolled_in_course(auth.uid(), course_id)
);
CREATE POLICY "Public files viewable" ON public.drive_files FOR SELECT USING (visibility = 'public');

CREATE TRIGGER drive_files_updated_at BEFORE UPDATE ON public.drive_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Global admin settings (single row)
CREATE TABLE public.drive_access_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  max_upload_size_mb INTEGER NOT NULL DEFAULT 500,
  allowed_mime_types TEXT[] DEFAULT ARRAY[
    'video/mp4','video/quicktime','video/webm',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel',
    'application/zip','application/x-zip-compressed',
    'image/jpeg','image/png','image/webp','image/gif',
    'audio/mpeg','audio/wav','audio/mp4'
  ],
  require_admin_approval BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.drive_access_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads drive settings" ON public.drive_access_settings FOR SELECT USING (true);
CREATE POLICY "Admin manages drive settings" ON public.drive_access_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.drive_access_settings (is_enabled) VALUES (true);

-- Per-coach overrides
CREATE TABLE public.drive_coach_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL UNIQUE,
  is_suspended BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  max_upload_size_mb INTEGER,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.drive_coach_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach reads own drive override" ON public.drive_coach_overrides FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Admin manages drive overrides" ON public.drive_coach_overrides FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Activity log
CREATE TABLE public.drive_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  learner_id UUID,
  file_id UUID,
  drive_file_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_drive_activity_coach_time ON public.drive_activity_log(coach_id, created_at DESC);
ALTER TABLE public.drive_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach reads own drive activity" ON public.drive_activity_log FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Anyone authenticated logs activity" ON public.drive_activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin reads all drive activity" ON public.drive_activity_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Helper: get effective access for a coach
CREATE OR REPLACE FUNCTION public.drive_get_effective_access(_coach_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.drive_access_settings%ROWTYPE;
  o public.drive_coach_overrides%ROWTYPE;
  is_enabled BOOLEAN;
  max_mb INTEGER;
BEGIN
  SELECT * INTO s FROM public.drive_access_settings LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'no_settings');
  END IF;
  is_enabled := s.is_enabled;
  max_mb := s.max_upload_size_mb;

  SELECT * INTO o FROM public.drive_coach_overrides WHERE coach_id = _coach_id;
  IF FOUND THEN
    IF o.is_suspended THEN is_enabled := false; END IF;
    IF o.max_upload_size_mb IS NOT NULL THEN max_mb := o.max_upload_size_mb; END IF;
  END IF;

  RETURN jsonb_build_object(
    'enabled', is_enabled,
    'max_upload_size_mb', max_mb,
    'allowed_mime_types', s.allowed_mime_types,
    'require_admin_approval', s.require_admin_approval
  );
END;
$$;
