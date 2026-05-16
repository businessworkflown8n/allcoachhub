import { corsHeaders, adminClient, getCoachFromAuth } from "../_shared/driveAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supa = adminClient();
    const { data: conn } = await supa.from("drive_connections").select("access_token").eq("coach_id", coachId).maybeSingle();
    if (conn?.access_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${conn.access_token}`, { method: "POST" }).catch(() => {});
    }
    await supa.from("drive_connections").update({
      status: "revoked", access_token: null, refresh_token: null,
    }).eq("coach_id", coachId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
