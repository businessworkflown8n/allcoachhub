// Shared helpers for Google Drive edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT, PATCH",
};

export const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
export const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getCoachFromAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const supa = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

// Refresh access token if expired. Returns valid access token or throws.
export async function getValidAccessToken(coachId: string): Promise<string> {
  const supa = adminClient();
  const { data: conn, error } = await supa
    .from("drive_connections")
    .select("*")
    .eq("coach_id", coachId)
    .maybeSingle();
  if (error || !conn) throw new Error("No Drive connection");

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  if (conn.access_token && expiresAt > Date.now() + 60_000) return conn.access_token;

  if (!conn.refresh_token) {
    await supa.from("drive_connections").update({ status: "expired" }).eq("coach_id", coachId);
    throw new Error("No refresh token, reconnect required");
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });
  if (!resp.ok) {
    await supa.from("drive_connections").update({ status: "expired" }).eq("coach_id", coachId);
    throw new Error(`Refresh failed: ${await resp.text()}`);
  }
  const j = await resp.json();
  const newExpires = new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString();
  await supa
    .from("drive_connections")
    .update({ access_token: j.access_token, expires_at: newExpires, status: "connected" })
    .eq("coach_id", coachId);
  return j.access_token;
}

export async function driveFetch(token: string, path: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `https://www.googleapis.com/drive/v3${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}
