
-- certificate-signatures: read = any authenticated; write = own folder or admin
CREATE POLICY "Read certificate signatures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificate-signatures');

CREATE POLICY "Coach uploads own signature"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificate-signatures'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Coach updates own signature"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificate-signatures'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Coach deletes own signature"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificate-signatures'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

-- certificate-pdfs: read by any authenticated (learner needs to download; URL contains uuid)
CREATE POLICY "Read certificate PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificate-pdfs');

CREATE POLICY "Coach writes own certificate PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificate-pdfs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Coach updates own certificate PDFs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificate-pdfs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );
