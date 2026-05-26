
-- Phase 4: New storage buckets (additive)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('webinar-assets','webinar-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-uploads','student-uploads', false) ON CONFLICT (id) DO NOTHING;

-- avatars policies (public read, owner write under {user_id}/...)
DO $$ BEGIN
  CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Avatars owner insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Avatars owner update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Avatars owner delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- webinar-assets policies (public read, coach/admin write)
DO $$ BEGIN
  CREATE POLICY "Webinar assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'webinar-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Webinar assets coach insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'webinar-assets' AND (public.has_role(auth.uid(),'coach') OR public.has_role(auth.uid(),'admin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Webinar assets owner update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'webinar-assets' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Webinar assets owner delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'webinar-assets' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- student-uploads policies (private, owner-only + admin read)
DO $$ BEGIN
  CREATE POLICY "Student uploads owner read" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'student-uploads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Student uploads owner insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'student-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Student uploads owner update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'student-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Student uploads owner delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'student-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Phase 6: Observability tables
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_entity_idx ON public.activity_logs(entity_type, entity_id);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users insert own activity" ON public.activity_logs FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users read own activity" ON public.activity_logs FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  message text,
  payload jsonb DEFAULT '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automation_logs_source_idx ON public.automation_logs(source, created_at DESC);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins read automation logs" ON public.automation_logs FOR SELECT
    USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- No INSERT policy => only service_role can write
