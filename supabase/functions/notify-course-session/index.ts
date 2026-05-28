import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fire-and-forget: emails enrolled learners about a newly scheduled / updated / cancelled session.
// In-app notifications are handled by DB trigger; this function handles email only.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, kind = "scheduled" } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const { data: s } = await supabase
      .from("coach_sessions")
      .select("id, title, agenda, scheduled_at, meeting_url, duration_minutes, course_id, coach_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!s || !s.course_id) {
      return new Response(JSON.stringify({ ok: false, reason: "no_course" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: course }, { data: coach }, { data: enrolls }] = await Promise.all([
      supabase.from("courses").select("title").eq("id", s.course_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("user_id", s.coach_id).maybeSingle(),
      supabase.from("enrollments").select("email, full_name").eq("course_id", s.course_id),
    ]);

    if (!resendKey || !enrolls?.length) {
      return new Response(JSON.stringify({ ok: true, emailed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const when = new Date(s.scheduled_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    const subject =
      kind === "cancelled" ? `Session cancelled: ${s.title}` :
      kind === "updated" ? `Session updated: ${s.title}` :
      `New live session — ${course?.title || s.title}`;

    await Promise.all(enrolls.map((e: any) => {
      if (!e.email) return null;
      const html = `
        <h2>${subject}</h2>
        <p>Hi ${e.full_name || "Learner"},</p>
        <p>Coach ${coach?.full_name || ""} has ${kind === "cancelled" ? "cancelled" : kind === "updated" ? "updated" : "scheduled"} a session for your enrolled course.</p>
        <p><strong>Course:</strong> ${course?.title || ""}<br/>
           <strong>Session:</strong> ${s.title}<br/>
           <strong>When:</strong> ${when}<br/>
           <strong>Duration:</strong> ${s.duration_minutes} min</p>
        ${s.agenda ? `<p>${s.agenda}</p>` : ""}
        ${s.meeting_url && kind !== "cancelled" ? `<p><a href="${s.meeting_url}">Join session</a></p>` : ""}
        <p>— AI Coach Portal</p>`;
      return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AI Coach Portal <noreply@aicoachportal.com>",
          to: [e.email],
          subject,
          html,
        }),
      }).catch((err) => console.error("email fail", err));
    }));

    if (kind === "scheduled") {
      await supabase.from("coach_sessions").update({ notified_on_create: true }).eq("id", sessionId);
    }

    return new Response(JSON.stringify({ ok: true, emailed: enrolls.length }), {
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
