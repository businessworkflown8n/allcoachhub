import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

/**
 * Buckets:
 *  - avatars (public)         profile pictures, path: {user_id}/<file>
 *  - webinar-assets (public)  banners/recordings, path: {user_id}/<file>
 *  - student-uploads (private) assignment submissions, path: {user_id}/<file>
 *  - logos, materials, course-content, certificates (existing, untouched)
 */
export type BucketId =
  | "avatars"
  | "webinar-assets"
  | "student-uploads"
  | "logos"
  | "materials"
  | "course-content"
  | "certificates";

export async function uploadOwnedFile(bucket: BucketId, userId: string, file: File, filename?: string) {
  const path = `${userId}/${Date.now()}-${filename || file.name}`;
  const res = await safeQuery(
    async () => await supabase.storage.from(bucket).upload(path, file, { upsert: true }),
    `storage.upload:${bucket}`
  );
  if (res.error) return { data: null, path: null, error: res.error };
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { data: pub.publicUrl, path, error: null };
}

export async function createSignedUrl(bucket: BucketId, path: string, expiresInSeconds = 3600) {
  return safeQuery(
    async () => await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds),
    `storage.signed:${bucket}`
  );
}

export async function removeFile(bucket: BucketId, path: string) {
  return safeQuery(
    async () => await supabase.storage.from(bucket).remove([path]),
    `storage.remove:${bucket}`
  );
}
