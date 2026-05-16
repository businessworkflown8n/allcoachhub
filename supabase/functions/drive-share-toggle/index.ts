import { corsHeaders, adminClient, getCoachFromAuth, getValidAccessToken, driveFetch } from "../_shared/driveAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { file_id, visibility } = await req.json();
    if (!file_id || !visibility) throw new Error("Missing file_id/visibility");
    const allowed = ["private", "students", "stream_only", "public", "restricted"];
    if (!allowed.includes(visibility)) throw new Error("Invalid visibility");

    const supa = adminClient();
    const { data: f } = await supa.from("drive_files").select("*").eq("id", file_id).eq("coach_id", coachId).maybeSingle();
    if (!f) throw new Error("File not found");

    const token = await getValidAccessToken(coachId);

    // Remove existing anyone permission, then add if needed
    const permsResp = await driveFetch(token, `/files/${f.drive_file_id}/permissions?fields=permissions(id,type)`);
    const perms = (await permsResp.json())?.permissions ?? [];
    for (const p of perms) {
      if (p.type === "anyone") await driveFetch(token, `/files/${f.drive_file_id}/permissions/${p.id}`, { method: "DELETE" });
    }
    if (visibility === "public") {
      await driveFetch(token, `/files/${f.drive_file_id}/permissions`, {
        method: "POST",
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      });
    }

    await supa.from("drive_files").update({ visibility }).eq("id", file_id);
    await supa.from("drive_activity_log").insert({ coach_id: coachId, drive_file_id: f.drive_file_id, action: "share", metadata: { visibility } });

    return new Response(JSON.stringify({ success: true, visibility }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
