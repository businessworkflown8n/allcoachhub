// Sends a congratulations email when a learner completes a course.
// Triggered from the client when progress hits 100%.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "AI Coach Portal <noreply@notify.www.aicoachportal.com>";
const SITE_URL = "https://www.aicoachportal.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { course_id } = await req.json();
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    // Idempotency: only send once per (user, course)
    const { data: existing } = await admin
      .from("learner_notifications")
      .select("id")
      .eq("learner_id", user.id)
      .eq("title", "Course Completed 🎉")
      .ilike("cta_link", `%${course_id}%`)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: course }, { data: profile }, { data: enrollment }] = await Promise.all([
      admin.from("courses").select("title, slug, coach_id").eq("id", course_id).maybeSingle(),
      admin.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle(),
      admin.from("enrollments").select("certificate_url").eq("course_id", course_id).eq("learner_id", user.id).maybeSingle(),
    ]);

    if (!course || !profile?.email) {
      return new Response(JSON.stringify({ error: "missing data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // In-app notification (always)
    await admin.from("learner_notifications").insert({
      learner_id: user.id,
      coach_id: course.coach_id,
      title: "Course Completed 🎉",
      message: `Congratulations! You completed "${course.title}".`,
      cta_link: `/learner/certificates?course=${course_id}`,
    });

    // Email via Resend (best-effort)
    if (RESEND_API_KEY) {
      const certUrl = enrollment?.certificate_url || `${SITE_URL}/learner/certificates`;
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#10b981,#059669);padding:40px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;">🎓 Course Completed!</h1>
          </div>
          <div style="padding:32px;color:#1f2937;">
            <p style="font-size:17px;margin:0 0 12px;">Hi <strong>${profile.full_name || "Learner"}</strong>,</p>
            <p style="font-size:15px;line-height:1.7;">Huge congratulations on completing <strong>${course.title}</strong>! Your certificate is ready to download and share.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${certUrl}" style="background:#10b981;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">View Certificate</a>
            </div>
            <p style="font-size:14px;color:#6b7280;">Keep the momentum — explore more courses on <a href="${SITE_URL}" style="color:#10b981;">AI Coach Portal</a>.</p>
          </div>
        </div></body></html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [profile.email],
          subject: `🎉 Congrats on completing ${course.title}!`,
          html,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
