// Inactive User Reminder dispatcher
// Scans users inactive for N days and sends re-engagement emails via Resend.
// Supports manual run (admin button) and test send.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "AI Coach Portal <noreply@notify.www.aicoachportal.com>";
const SITE_URL = "https://www.aicoachportal.com";
const BATCH_LIMIT = 500;

interface Config {
  id: string;
  is_enabled: boolean;
  user_type: "all" | "coach" | "learner";
  inactivity_days: number;
  frequency_type: "once" | "repeat";
  repeat_interval_days: number;
  email_subject: string;
  email_body: string;
  cta_text: string;
  cta_url: string;
  cta_new_tab: boolean;
}

function renderTemplate(
  tpl: string,
  vars: Record<string, string>,
): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function buildHtml(cfg: Config, vars: Record<string, string>): string {
  const subject = renderTemplate(cfg.email_subject, vars);
  const bodyText = renderTemplate(cfg.email_body, vars);
  const ctaUrl = cfg.cta_url.startsWith("http")
    ? cfg.cta_url
    : `${SITE_URL}${cfg.cta_url.startsWith("/") ? "" : "/"}${cfg.cta_url}`;
  const target = cfg.cta_new_tab ? '_blank" rel="noopener noreferrer' : "_self";
  const safeBody = bodyText
    .split("\n")
    .map((l) => l.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!)))
    .join("<br/>");

  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <h1 style="font-size:22px;margin:0 0 16px;">${subject}</h1>
  <div style="font-size:14px;line-height:1.6;color:#444;">${safeBody}</div>
  <div style="margin:28px 0;text-align:center;">
    <a href="${ctaUrl}" target="${target}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">${cfg.cta_text}</a>
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
  <p style="font-size:12px;color:#888;text-align:center;">AI Coach Portal • ${SITE_URL}</p>
</div></body></html>`;
}

async function sendResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Auth: allow either a valid CRON_SECRET header (for scheduled cron) or an admin JWT
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const isCron = !!cronSecret && providedSecret === cronSecret;

  if (!isCron) {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: u } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = u?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty for cron */
  }
  const mode = body.mode || "run"; // "run" | "test"

  try {
    const { data: cfg, error: cfgErr } = await supabase
      .from("inactive_reminder_config")
      .select("*")
      .limit(1)
      .single();
    if (cfgErr || !cfg) throw new Error("Config not found");
    const config = cfg as Config;

    // TEST mode: send to a single email immediately
    if (mode === "test") {
      const testEmail: string = body.email;
      if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const vars = {
        UserName: "Test User",
        LastLoginDate: new Date(Date.now() - config.inactivity_days * 86400000)
          .toISOString()
          .slice(0, 10),
        DaysInactive: String(config.inactivity_days),
        LoginLink: `${SITE_URL}${config.cta_url.startsWith("/") ? "" : "/"}${config.cta_url}`,
      };
      const subject = renderTemplate(config.email_subject, vars);
      const html = buildHtml(config, vars);
      try {
        await sendResend(testEmail, subject, html);
        await supabase.from("inactive_reminder_logs").insert({
          email: testEmail,
          status: "test",
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("inactive_reminder_logs").insert({
          email: testEmail,
          status: "failed",
          error_message: msg,
        });
        return new Response(JSON.stringify({ ok: false, error: msg }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // RUN mode
    if (!config.is_enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user list via auth admin API to access last_sign_in_at
    const cutoff = new Date(Date.now() - config.inactivity_days * 86400000);
    const candidates: Array<{
      id: string;
      email: string;
      last_sign_in_at: string | null;
      role: string;
      full_name: string | null;
    }> = [];

    // Page through auth users
    let page = 1;
    const perPage = 1000;
    while (page < 20) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      if (!data.users.length) break;
      for (const u of data.users) {
        if (!u.email) continue;
        const lsi = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
        if (!lsi || lsi > cutoff) continue;
        candidates.push({
          id: u.id,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at ?? null,
          role: "",
          full_name: (u.user_metadata as any)?.full_name ?? null,
        });
      }
      if (data.users.length < perPage) break;
      page++;
    }

    // Attach role + filter by user_type
    const ids = candidates.map((c) => c.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ ok: true, eligible: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const roleMap = new Map<string, string>();
    (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, is_suspended")
      .in("user_id", ids);
    const profMap = new Map<string, any>();
    (profs || []).forEach((p: any) => profMap.set(p.user_id, p));

    const { data: tracking } = await supabase
      .from("inactive_user_tracking")
      .select("*")
      .in("user_id", ids);
    const trackMap = new Map<string, any>();
    (tracking || []).forEach((t: any) => trackMap.set(t.user_id, t));

    const eligible = candidates.filter((c) => {
      const role = roleMap.get(c.id) || "";
      if (config.user_type === "coach" && role !== "coach") return false;
      if (config.user_type === "learner" && role !== "learner") return false;
      const prof = profMap.get(c.id);
      if (prof?.is_suspended) return false;
      const t = trackMap.get(c.id);
      if (t) {
        // 24h dedupe
        if (t.last_email_sent_date) {
          const since = Date.now() - new Date(t.last_email_sent_date).getTime();
          if (since < 24 * 3600 * 1000) return false;
        }
        if (config.frequency_type === "once" && t.email_sent_flag) return false;
        if (config.frequency_type === "repeat" && t.last_email_sent_date) {
          const sinceDays =
            (Date.now() - new Date(t.last_email_sent_date).getTime()) / 86400000;
          if (sinceDays < config.repeat_interval_days) return false;
        }
      }
      return true;
    });

    let sent = 0;
    let failed = 0;
    const slice = eligible.slice(0, BATCH_LIMIT);

    for (const u of slice) {
      const lastLogin = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
      const daysInactive = lastLogin
        ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000)
        : config.inactivity_days;
      const vars = {
        UserName:
          profMap.get(u.id)?.full_name || u.full_name || u.email.split("@")[0],
        LastLoginDate: lastLogin ? lastLogin.toISOString().slice(0, 10) : "N/A",
        DaysInactive: String(daysInactive),
        LoginLink: `${SITE_URL}${config.cta_url.startsWith("/") ? "" : "/"}${config.cta_url}`,
      };
      const subject = renderTemplate(config.email_subject, vars);
      const html = buildHtml(config, vars);

      try {
        await sendResend(u.email, subject, html);
        sent++;
        const existing = trackMap.get(u.id);
        const cycle = (existing?.reminder_cycle_count || 0) + 1;
        await supabase.from("inactive_user_tracking").upsert(
          {
            user_id: u.id,
            last_login_date: u.last_sign_in_at,
            last_email_sent_date: new Date().toISOString(),
            email_sent_flag: true,
            reminder_cycle_count: cycle,
          },
          { onConflict: "user_id" },
        );
        await supabase.from("inactive_reminder_logs").insert({
          user_id: u.id,
          email: u.email,
          status: "sent",
          cycle_count: cycle,
        });
        // light rate-limit
        await new Promise((r) => setTimeout(r, 120));
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("inactive_reminder_logs").insert({
          user_id: u.id,
          email: u.email,
          status: "failed",
          error_message: msg,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        eligible: eligible.length,
        processed: slice.length,
        sent,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
