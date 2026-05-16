import { corsHeaders, adminClient, getCoachFromAuth, getValidAccessToken, driveFetch } from "../_shared/driveAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = await getValidAccessToken(coachId);
    const r = await driveFetch(token, "/about?fields=storageQuota,user");
    const j = await r.json();
    const quotaTotal = Number(j?.storageQuota?.limit ?? 0);
    const quotaUsed = Number(j?.storageQuota?.usage ?? 0);

    const supa = adminClient();
    await supa.from("drive_connections").update({
      quota_total: quotaTotal, quota_used: quotaUsed, last_sync_at: new Date().toISOString(),
    }).eq("coach_id", coachId);

    return new Response(JSON.stringify({
      quota_total: quotaTotal,
      quota_used: quotaUsed,
      quota_free: quotaTotal ? quotaTotal - quotaUsed : null,
      email: j?.user?.emailAddress,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
