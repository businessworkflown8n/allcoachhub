import { corsHeaders, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, adminClient, getCoachFromAuth, driveFetch } from "../_shared/driveAuth.ts";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SUBFOLDERS = ["Courses", "Live Class Recordings", "PDFs & Resources", "Assignments", "Student Uploads", "Archived Content"];

async function createFolderStructure(token: string) {
  // root
  const rootResp = await driveFetch(token, "/files", {
    method: "POST",
    body: JSON.stringify({ name: "AI Coach Portal", mimeType: FOLDER_MIME }),
  });
  const root = await rootResp.json();
  const subs: Record<string, string> = {};
  for (const name of SUBFOLDERS) {
    const r = await driveFetch(token, "/files", {
      method: "POST",
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [root.id] }),
    });
    const f = await r.json();
    subs[name] = f.id;
  }
  return { rootId: root.id, subs };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) throw new Error("Missing code or redirect_uri");

    const tokResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri, grant_type: "authorization_code",
      }),
    });
    if (!tokResp.ok) throw new Error(`Token exchange failed: ${await tokResp.text()}`);
    const tok = await tokResp.json();
    const accessToken = tok.access_token;
    const refreshToken = tok.refresh_token;
    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();

    // Get user email + quota
    const aboutResp = await driveFetch(accessToken, "/about?fields=user,storageQuota");
    const about = await aboutResp.json();
    const email = about?.user?.emailAddress;
    const quotaTotal = Number(about?.storageQuota?.limit ?? 0);
    const quotaUsed = Number(about?.storageQuota?.usage ?? 0);

    // Create folders
    const { rootId, subs } = await createFolderStructure(accessToken);

    const supa = adminClient();
    await supa.from("drive_connections").upsert({
      coach_id: coachId,
      google_account_email: email,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope: tok.scope,
      root_folder_id: rootId,
      subfolder_ids: subs,
      status: "connected",
      connected_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      quota_total: quotaTotal,
      quota_used: quotaUsed,
    }, { onConflict: "coach_id" });

    return new Response(JSON.stringify({ success: true, email, root_folder_id: rootId, subfolders: subs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
