import { corsHeaders, GOOGLE_CLIENT_ID, DRIVE_SCOPES, getCoachFromAuth } from "../_shared/driveAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { redirect_origin } = await req.json().catch(() => ({}));
    const origin = redirect_origin || "https://www.aicoachportal.com";
    const redirectUri = `${origin}/oauth/google-drive/callback`;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: DRIVE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: coachId,
      include_granted_scopes: "true",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    return new Response(JSON.stringify({ url, redirect_uri: redirectUri }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
