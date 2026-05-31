import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const isValidEmail = (s: string) =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;

async function sendWithRetry(payload: unknown, apiKey: string, attempts = 3): Promise<{ ok: boolean; status: number; body: string }> {
  let lastStatus = 0;
  let lastBody = "";
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
      });
      lastStatus = res.status;
      lastBody = await res.text();
      if (res.ok) return { ok: true, status: res.status, body: lastBody };
    } catch (e) {
      lastBody = String(e);
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return { ok: false, status: lastStatus, body: lastBody };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const coachId = userData.user.id;

    const { courseId, learnerEmail, expiresAt } = await req.json();
    if (!courseId || !isValidEmail(learnerEmail)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch course + coach profile
    const { data: course } = await admin
      .from("courses")
      .select("id, title, thumbnail_url, coach_id")
      .eq("id", courseId)
      .maybeSingle();
    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: coachProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", course.coach_id || coachId)
      .maybeSingle();
    const coachName = coachProfile?.full_name || "Your Coach";

    // Look up learner by email (may not exist yet)
    const { data: learnerProfile } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .ilike("email", learnerEmail)
      .maybeSingle();
    const learnerName = learnerProfile?.full_name || learnerEmail.split("@")[0];

    // Create in-app notification if learner exists
    if (learnerProfile?.user_id) {
      await admin.from("learner_notifications").insert({
        learner_id: learnerProfile.user_id,
        coach_id: course.coach_id || coachId,
        title: `🎉 New course access: ${course.title}`,
        message: `You've been granted access to "${course.title}" by ${coachName}. Start learning now!`,
        cta_link: "/learner/courses",
      });
    }

    // Build email
    const safeCourse = escapeHtml(course.title);
    const safeCoach = escapeHtml(coachName);
    const safeLearner = escapeHtml(learnerName);
    const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString() : "No expiry";
    const thumb = course.thumbnail_url && /^https?:\/\//.test(course.thumbnail_url) ? course.thumbnail_url : "";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#84cc16,#65a30d);padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;">🎉 Congratulations!</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.95);font-size:14px;">You've been enrolled in a new course</p>
    </div>
    ${thumb ? `<img src="${thumb}" alt="${safeCourse}" style="width:100%;max-height:280px;object-fit:cover;display:block;"/>` : ""}
    <div style="padding:32px;">
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi <strong>${safeLearner}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        You have been granted access to the following course on <strong>AI Coach Portal</strong>:
      </p>
      <table style="width:100%;background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;margin-bottom:24px;">
        <tr><td style="padding:6px 8px;color:#6b7280;font-size:13px;">Course Name</td><td style="padding:6px 8px;color:#111;font-weight:600;font-size:14px;">${safeCourse}</td></tr>
        <tr><td style="padding:6px 8px;color:#6b7280;font-size:13px;">Coach Name</td><td style="padding:6px 8px;color:#111;font-weight:600;font-size:14px;">${safeCoach}</td></tr>
        <tr><td style="padding:6px 8px;color:#6b7280;font-size:13px;">Access Valid Until</td><td style="padding:6px 8px;color:#111;font-weight:600;font-size:14px;">${escapeHtml(expiry)}</td></tr>
        <tr><td style="padding:6px 8px;color:#6b7280;font-size:13px;">Platform</td><td style="padding:6px 8px;color:#111;font-weight:600;font-size:14px;">AI Coach Portal</td></tr>
      </table>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
        You can now start learning and access all available course materials, modules, sessions, and resources provided by your coach.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://www.aicoachportal.com/login" style="display:inline-block;background:#84cc16;color:#000;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Login & Start Learning →</a>
      </div>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">We wish you success in your learning journey.<br/><br/>Best Regards,<br/><strong>AI Coach Portal Team</strong></p>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">© AI Coach Portal · <a href="https://www.aicoachportal.com" style="color:#65a30d;text-decoration:none;">aicoachportal.com</a></div>
  </div>
</body></html>`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await sendWithRetry({
      from: "AI Coach Portal <hello@notify.www.aicoachportal.com>",
      to: [learnerEmail],
      subject: `🎉 Congratulations! You Have Been Enrolled in ${course.title}`,
      html,
    }, RESEND_API_KEY, 3);

    // Best-effort log to learner_notifications even if no learner profile (audit trail)
    if (!result.ok) {
      console.error("course-access email failed", result.status, result.body);
    }

    return new Response(
      JSON.stringify({ success: result.ok, status: result.status, error: result.ok ? null : result.body }),
      { status: result.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
