// Returns a resumable upload session URL so the browser can stream the file
// directly to Google Drive (no server bandwidth).
import { corsHeaders, adminClient, getCoachFromAuth, getValidAccessToken } from "../_shared/driveAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { name, mime_type, size_bytes, category } = await req.json();
    if (!name || !mime_type) throw new Error("Missing name/mime_type");

    const supa = adminClient();
    const { data: access } = await supa.rpc("drive_get_effective_access", { _coach_id: coachId });
    if (!access?.enabled) throw new Error("Drive integration is disabled for this account");
    if (size_bytes && access.max_upload_size_mb && size_bytes > access.max_upload_size_mb * 1024 * 1024) {
      throw new Error(`File exceeds max upload size (${access.max_upload_size_mb}MB)`);
    }
    if (access.allowed_mime_types?.length && !access.allowed_mime_types.includes(mime_type)) {
      throw new Error(`File type not allowed: ${mime_type}`);
    }

    const { data: conn } = await supa.from("drive_connections").select("subfolder_ids,root_folder_id").eq("coach_id", coachId).maybeSingle();
    if (!conn) throw new Error("No Drive connection");
    const subs = (conn.subfolder_ids ?? {}) as Record<string, string>;
    const categoryMap: Record<string, string> = {
      course: "Courses", recording: "Live Class Recordings", pdf: "PDFs & Resources",
      assignment: "Assignments", student_upload: "Student Uploads", archived: "Archived Content",
    };
    const folderName = categoryMap[category] ?? "PDFs & Resources";
    const parentId = subs[folderName] ?? conn.root_folder_id;

    const token = await getValidAccessToken(coachId);
    const initResp = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mime_type,
        ...(size_bytes ? { "X-Upload-Content-Length": String(size_bytes) } : {}),
      },
      body: JSON.stringify({ name, mimeType: mime_type, parents: [parentId] }),
    });
    if (!initResp.ok) throw new Error(`Resumable init failed: ${await initResp.text()}`);
    const uploadUrl = initResp.headers.get("Location");
    if (!uploadUrl) throw new Error("No upload URL returned");

    return new Response(JSON.stringify({ upload_url: uploadUrl, parent_folder_id: parentId, access_token: token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
