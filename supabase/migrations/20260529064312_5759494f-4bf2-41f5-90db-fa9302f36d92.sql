
-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coach_profile_image_url text,
  ADD COLUMN IF NOT EXISTS profile_image_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS profile_image_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_image_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_image_approved_by uuid,
  ADD COLUMN IF NOT EXISTS profile_image_reject_reason text;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_profile_image_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.profile_image_status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid profile_image_status: %', NEW.profile_image_status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_profile_image_status ON public.profiles;
CREATE TRIGGER trg_validate_profile_image_status
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_image_status();

-- 2. Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('coach-profile-images','coach-profile-images', true, 5242880,
        ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp'];

-- 3. Storage RLS policies
DROP POLICY IF EXISTS "coach_profile_images_public_read" ON storage.objects;
CREATE POLICY "coach_profile_images_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'coach-profile-images');

DROP POLICY IF EXISTS "coach_profile_images_owner_insert" ON storage.objects;
CREATE POLICY "coach_profile_images_owner_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-profile-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "coach_profile_images_owner_update" ON storage.objects;
CREATE POLICY "coach_profile_images_owner_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-profile-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "coach_profile_images_admin_delete" ON storage.objects;
CREATE POLICY "coach_profile_images_admin_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-profile-images'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- 4. RPC for approve/reject (admin only)
CREATE OR REPLACE FUNCTION public.review_coach_profile_image(
  _coach_id uuid,
  _action text,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  prof public.profiles%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT * INTO prof FROM public.profiles WHERE user_id = _coach_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF _action = 'approve' THEN
    UPDATE public.profiles SET
      avatar_url = COALESCE(coach_profile_image_url, avatar_url),
      profile_image_status = 'approved',
      profile_image_approved_at = now(),
      profile_image_approved_by = auth.uid(),
      profile_image_reject_reason = NULL
    WHERE user_id = _coach_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.profiles SET
      profile_image_status = 'rejected',
      profile_image_reject_reason = _reason,
      profile_image_approved_by = auth.uid(),
      profile_image_approved_at = now()
    WHERE user_id = _coach_id;
  ELSIF _action = 'request_reupload' THEN
    UPDATE public.profiles SET
      profile_image_status = 'rejected',
      profile_image_reject_reason = COALESCE(_reason, 'Please re-upload a higher quality image'),
      profile_image_approved_by = auth.uid(),
      profile_image_approved_at = now()
    WHERE user_id = _coach_id;
  ELSIF _action = 'delete' THEN
    UPDATE public.profiles SET
      avatar_url = NULL,
      coach_profile_image_url = NULL,
      profile_image_status = 'approved',
      profile_image_uploaded_at = NULL,
      profile_image_approved_at = now(),
      profile_image_approved_by = auth.uid(),
      profile_image_reject_reason = NULL
    WHERE user_id = _coach_id;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', _action;
  END IF;

  -- In-app notification
  INSERT INTO public.learner_notifications (learner_id, title, message, coach_id)
  VALUES (
    _coach_id,
    CASE _action
      WHEN 'approve' THEN 'Profile picture approved'
      WHEN 'reject' THEN 'Profile picture rejected'
      WHEN 'request_reupload' THEN 'Please re-upload your profile picture'
      WHEN 'delete' THEN 'Profile picture removed by admin'
    END,
    COALESCE(_reason, 'Your coach profile picture status was updated by the admin team.'),
    _coach_id
  );

  RETURN jsonb_build_object('success', true, 'action', _action);
END $$;

GRANT EXECUTE ON FUNCTION public.review_coach_profile_image(uuid, text, text) TO authenticated;
