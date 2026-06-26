
-- Add coach branding fields to certificate signatures
ALTER TABLE public.coach_certificate_signatures
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS accent_color text;

-- Storage RLS policies for certificate-templates (admin only writes; coaches read)
CREATE POLICY "Admins manage certificate-templates objects"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'certificate-templates' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'certificate-templates' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read certificate-templates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certificate-templates');

-- Storage RLS policies for coach-logos (each coach manages own folder; everyone authed can read)
CREATE POLICY "Coach manages own logo"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'coach-logos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (bucket_id = 'coach-logos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Authenticated read coach-logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'coach-logos');
