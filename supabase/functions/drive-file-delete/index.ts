import { corsHeaders, adminClient, getCoachFromAuth, getValidAccessToken, driveFetch } from "../_shared/driveAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { file_id } = await req.json();
    if (!file_id) throw new Error("Missing file_id");

    const supa = adminClient();
    const { data: f } = await supa.from("drive_files").select("*").eq("id", file_id).eq("coach_id", coachId).maybeSingle();
    if (!f) throw new Error("File not found");

    const token = await getValidAccessToken(coachId);
    await driveFetch(token, `/files/${f.drive_file_id}`, { method: "DELETE" });

    await supa.from("drive_files").delete().eq("id", file_id);
    await supa.from("drive_activity_log").insert({ coach_id: coachId, drive_file_id: f.drive_file_id, action: "delete", metadata: { name: f.name } });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
