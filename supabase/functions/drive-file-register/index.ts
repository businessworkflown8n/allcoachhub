// Called after browser-side upload completes. Registers the file in DB and
// kicks off (synchronously, for simplicity) lightweight AI tagging.
import { corsHeaders, adminClient, getCoachFromAuth, getValidAccessToken, driveFetch } from "../_shared/driveAuth.ts";

async function aiTag(name: string, mimeType: string): Promise<string[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return [];
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Return 3-6 short, lowercase, single-word tags for the file. JSON array only." },
          { role: "user", content: `Filename: ${name}\nMIME: ${mimeType}` },
        ],
      }),
    });
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content ?? "[]";
    const m = txt.match(/\[[\s\S]*\]/);
    if (!m) return [];
    return JSON.parse(m[0]).slice(0, 6).map((s: string) => String(s).toLowerCase());
  } catch { return []; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { drive_file_id, category, course_id, lesson_id } = await req.json();
    if (!drive_file_id) throw new Error("Missing drive_file_id");

    const token = await getValidAccessToken(coachId);
    const r = await driveFetch(token, `/files/${drive_file_id}?fields=id,name,mimeType,size,parents,webViewLink,webContentLink,thumbnailLink,iconLink`);
    if (!r.ok) throw new Error(`Drive fetch failed: ${await r.text()}`);
    const f = await r.json();

    const ai_tags = await aiTag(f.name, f.mimeType);

    const supa = adminClient();
    const { data, error } = await supa.from("drive_files").upsert({
      coach_id: coachId,
      drive_file_id: f.id,
      name: f.name,
      mime_type: f.mimeType,
      size_bytes: Number(f.size ?? 0),
      parent_folder_id: f.parents?.[0],
      web_view_link: f.webViewLink,
      web_content_link: f.webContentLink,
      thumbnail_link: f.thumbnailLink ?? f.iconLink,
      category: category ?? "pdf",
      course_id: course_id ?? null,
      lesson_id: lesson_id ?? null,
      ai_tags,
      ai_processed_at: ai_tags.length ? new Date().toISOString() : null,
      uploaded_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "coach_id,drive_file_id" }).select().single();
    if (error) throw error;

    await supa.from("drive_activity_log").insert({
      coach_id: coachId, file_id: data.id, drive_file_id: f.id, action: "upload",
      metadata: { name: f.name, size: f.size },
    });

    return new Response(JSON.stringify({ file: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
