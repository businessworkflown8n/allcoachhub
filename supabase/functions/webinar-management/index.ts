// Webinar Management API for coaches (and admin retry).
//
// Every write goes through service-role-only SQL functions (wm_save_draft,
// wm_publish_config, ...) that re-check ownership, permissions, approval status,
// validation and concurrency inside the database transaction. The coach id passed
// to them is always the verified JWT subject, never a value from the request body.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fail = (error: string, code: string, status: number) => json({ success: false, error, code }, status);

const HINT_STATUS: Record<string, number> = {
  WM_UNAUTHENTICATED: 401,
  WM_FORBIDDEN: 403,
  WM_NOT_APPROVED: 403,
  WM_NOT_FOUND: 404,
  WM_CONFLICT: 409,
  WM_STALE_DRAFT: 409,
  WM_MANAGED: 409,
  WM_INVALID: 422,
  WM_NO_CHANGES: 422,
};

const PERMISSION_COLUMNS = [
  "webinar_mgmt_access",
  "webinar_mgmt_edit_schedule",
  "webinar_mgmt_edit_join_url",
  "webinar_mgmt_edit_whatsapp_url",
  "webinar_mgmt_edit_registration_url",
  "webinar_mgmt_publish",
  "webinar_mgmt_view_sync",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
function rpcFailure(error: any) {
  const hint = typeof error?.hint === "string" ? error.hint : "";
  const status = HINT_STATUS[hint];
  if (status) return fail(error.message, hint, status);
  console.error("[webinar-management] unexpected database error", error);
  return fail("Something went wrong while saving. Please try again.", "WM_INTERNAL", 500);
}

function kickProcessor(supabaseUrl: string, serviceKey: string, webinarId?: string) {
  const call = fetch(`${supabaseUrl}/functions/v1/webinar-sync-processor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" },
    body: JSON.stringify(webinarId ? { webinar_id: webinarId } : {}),
  }).catch((e) => console.error("[webinar-management] could not start sync processor; cron will pick the jobs up", e));
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(call);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", "METHOD_NOT_ALLOWED", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail("Webinar Management is misconfigured on the server.", "SERVER_MISCONFIGURED", 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return fail("You must be signed in.", "WM_UNAUTHENTICATED", 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.slice(7));
  if (claimsErr || !claims?.claims?.sub) return fail("Your session has expired. Please sign in again.", "WM_UNAUTHENTICATED", 401);
  const userId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);
  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;
  const webinarId = body?.webinar_id as string | undefined;
  if (webinarId !== undefined && !UUID_RE.test(webinarId)) return fail("Invalid webinar id", "WM_INVALID", 422);

  try {
    switch (action) {
      case "list": {
        const { data: flags } = await admin
          .from("coach_feature_flags")
          .select(`status, ${PERMISSION_COLUMNS.join(", ")}`)
          .eq("coach_id", userId)
          .maybeSingle();
        const permissions = {
          access: !!flags?.webinar_mgmt_access,
          edit_schedule: !!(flags?.webinar_mgmt_access && flags?.webinar_mgmt_edit_schedule),
          edit_join_url: !!(flags?.webinar_mgmt_access && flags?.webinar_mgmt_edit_join_url),
          edit_whatsapp_url: !!(flags?.webinar_mgmt_access && flags?.webinar_mgmt_edit_whatsapp_url),
          edit_registration_url: !!(flags?.webinar_mgmt_access && flags?.webinar_mgmt_edit_registration_url),
          publish: !!(flags?.webinar_mgmt_access && flags?.webinar_mgmt_publish),
          view_sync: !!(flags?.webinar_mgmt_access && flags?.webinar_mgmt_view_sync),
        };
        const coachStatus = flags?.status ?? "pending";
        if (!permissions.access) {
          return json({ success: true, permissions, coach_status: coachStatus, webinars: [] });
        }

        const { data: webinars, error: wErr } = await admin
          .from("webinars")
          .select(
            "id, title, description, webinar_date, webinar_time, duration_minutes, timezone, webinar_link, webinar_link_status, whatsapp_group_url, registration_page_url, calendar_details, is_published, config_version, config_published_at, config_updated_by, updated_at",
          )
          .eq("coach_id", userId)
          .order("webinar_date", { ascending: false });
        if (wErr) throw wErr;
        const ids = (webinars ?? []).map((w) => w.id);

        const [drafts, versions, jobs] = await Promise.all([
          ids.length
            ? admin.from("webinar_config_drafts").select("webinar_id, draft, base_version, revision, updated_at").in("webinar_id", ids)
            : Promise.resolve({ data: [] }),
          ids.length
            ? admin
              .from("webinar_config_versions")
              .select("webinar_id, version, changed_fields, change_source, change_summary, published_by, published_at, config, previous_config")
              .in("webinar_id", ids)
              .order("version", { ascending: false })
              .limit(500)
            : Promise.resolve({ data: [] }),
          ids.length && permissions.view_sync
            ? admin
              .from("webinar_sync_jobs")
              .select("webinar_id, config_version, destination, status, attempts, last_error, last_error_code, acknowledged_at, next_attempt_at, updated_at")
              .in("webinar_id", ids)
              .order("config_version", { ascending: false })
              .limit(1000)
            : Promise.resolve({ data: [] }),
        ]);

        // Resolve names for "updated by" without exposing anything beyond the name.
        const actorIds = [...new Set((versions.data ?? []).map((v) => v.published_by).filter(Boolean))] as string[];
        const { data: actors } = actorIds.length
          ? await admin.from("profiles").select("user_id, full_name").in("user_id", actorIds)
          : { data: [] };

        return json({
          success: true,
          permissions,
          coach_status: coachStatus,
          webinars,
          drafts: drafts.data ?? [],
          versions: versions.data ?? [],
          sync_jobs: jobs.data ?? [],
          actors: actors ?? [],
        });
      }

      case "save_draft": {
        if (!webinarId) return fail("webinar_id is required", "WM_INVALID", 422);
        const { data, error } = await admin.rpc("wm_save_draft", {
          _actor: userId,
          _webinar_id: webinarId,
          _draft: body?.draft ?? null,
          _expected_revision: Number.isInteger(body?.expected_revision) ? body.expected_revision : 0,
        });
        if (error) return rpcFailure(error);
        return json({ success: true, draft: data });
      }

      case "discard_draft": {
        if (!webinarId) return fail("webinar_id is required", "WM_INVALID", 422);
        const { error } = await admin.rpc("wm_discard_draft", { _actor: userId, _webinar_id: webinarId });
        if (error) return rpcFailure(error);
        return json({ success: true });
      }

      case "publish": {
        if (!webinarId) return fail("webinar_id is required", "WM_INVALID", 422);
        const { data, error } = await admin.rpc("wm_publish_config", {
          _actor: userId,
          _webinar_id: webinarId,
          _expected_version: Number.isInteger(body?.expected_version) ? body.expected_version : -1,
          _expected_revision: Number.isInteger(body?.expected_revision) ? body.expected_revision : 0,
          _summary: typeof body?.summary === "string" ? body.summary.slice(0, 500) : null,
        });
        if (error) return rpcFailure(error);
        kickProcessor(supabaseUrl, serviceKey, webinarId);
        return json({ success: true, result: data });
      }

      case "retry": {
        // Admin only; wm_retry_sync_job checks has_role(auth.uid(), 'admin') itself.
        const jobId = body?.job_id as string;
        if (!jobId || !UUID_RE.test(jobId)) return fail("Invalid job id", "WM_INVALID", 422);
        const { error } = await userClient.rpc("wm_retry_sync_job", { _job_id: jobId });
        if (error) return rpcFailure(error);
        kickProcessor(supabaseUrl, serviceKey);
        return json({ success: true });
      }

      default:
        return fail("Unknown action", "WM_INVALID", 422);
    }
  } catch (e) {
    console.error("[webinar-management] error", e);
    return fail("Something went wrong. Please try again.", "WM_INTERNAL", 500);
  }
});
