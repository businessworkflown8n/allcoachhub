import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const now = new Date();
    const horizon = new Date(now.getTime() + 26 * 3600 * 1000).toISOString();

    const { data: sessions } = await supabase
      .from("coach_sessions")
      .select("id, title, agenda, scheduled_at, meeting_url, course_id, coach_id, status, reminder_24h_sent, reminder_1h_sent, reminder_10m_sent")
      .not("course_id", "is", null)
      .eq("status", "scheduled")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", horizon);

    if (!sessions?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalNotified = 0;

    for (const s of sessions) {
      const start = new Date(s.scheduled_at).getTime();
      const diffMin = (start - now.getTime()) / 60000;

      let kind: "24h" | "1h" | "10m" | null = null;
      let col: "reminder_24h_sent" | "reminder_1h_sent" | "reminder_10m_sent" | null = null;

      if (diffMin <= 1440 && diffMin > 90 && !s.reminder_24h_sent) { kind = "24h"; col = "reminder_24h_sent"; }
      else if (diffMin <= 90 && diffMin > 15 && !s.reminder_1h_sent) { kind = "1h"; col = "reminder_1h_sent"; }
      else if (diffMin <= 15 && diffMin > 0 && !s.reminder_10m_sent) { kind = "10m"; col = "reminder_10m_sent"; }
      if (!kind || !col) continue;

      const [{ data: course }, { data: coach }, { data: enrolls }] = await Promise.all([
        supabase.from("courses").select("title").eq("id", s.course_id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", s.coach_id).maybeSingle(),
        supabase.from("enrollments").select("learner_id, email, full_name").eq("course_id", s.course_id),
      ]);

      if (!enrolls?.length) {
        await supabase.from("coach_sessions").update({ [col]: true }).eq("id", s.id);
        continue;
      }

      // In-app notifications
      const inApp = enrolls.map((e: any) => ({
        learner_id: e.learner_id,
        coach_id: s.coach_id,
        title: kind === "10m" ? `Starting soon: ${s.title}` : kind === "1h" ? `In 1 hour: ${s.title}` : `Tomorrow: ${s.title}`,
        message: `${course?.title || "Your course"} · ${new Date(s.scheduled_at).toUTCString()}`,
        cta_link: "/learner/courses",
      }));
      await supabase.from("learner_notifications").insert(inApp);

      // Emails
      if (resendKey) {
        const when = new Date(s.scheduled_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        await Promise.all(enrolls.map((e: any) => {
          if (!e.email) return null;
          const html = `
            <h2>Reminder — ${s.title}</h2>
            <p>Hi ${e.full_name || "Learner"},</p>
            <p>Your coach ${coach?.full_name || ""} has a live session ${kind === "10m" ? "starting in ~10 minutes" : kind === "1h" ? "in about 1 hour" : "tomorrow"}.</p>
            <p><strong>Course:</strong> ${course?.title || ""}<br/>
               <strong>Session:</strong> ${s.title}<br/>
               <strong>When:</strong> ${when}</p>
            ${s.agenda ? `<p>${s.agenda}</p>` : ""}
            ${s.meeting_url ? `<p><a href="${s.meeting_url}">Join session</a></p>` : ""}
            <p>— AI Coach Portal</p>`;
          return fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "AI Coach Portal <noreply@aicoachportal.com>",
              to: [e.email],
              subject: kind === "10m" ? `Starting soon: ${s.title}` : kind === "1h" ? `In 1 hour: ${s.title}` : `Tomorrow: ${s.title}`,
              html,
            }),
          }).catch((err) => console.error("email fail", err));
        }));
      }

      await supabase.from("coach_sessions").update({ [col]: true }).eq("id", s.id);
      totalNotified += enrolls.length;
    }

    return new Response(JSON.stringify({ ok: true, processed: sessions.length, notified: totalNotified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
