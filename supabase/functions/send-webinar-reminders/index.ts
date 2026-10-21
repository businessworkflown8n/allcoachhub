import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { webinarStartUtc } from "../_shared/webinarTime.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();

    // Fetch upcoming webinars with registrations that need reminders. webinar_date is
    // a local date in the webinar's timezone, so look back one UTC day.
    const { data: webinars } = await supabase
      .from("webinars")
      .select("*")
      .eq("is_published", true)
      .gte("webinar_date", new Date(now.getTime() - 86_400_000).toISOString().split("T")[0]);

    if (!webinars || webinars.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming webinars" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalSent = 0;

    for (const webinar of webinars) {
      // Interpret date/time in the webinar's own timezone (previously read as UTC).
      const webinarStart = webinarStartUtc(webinar);
      const diffMs = webinarStart.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMinutes = diffMs / (1000 * 60);

      // Determine which reminder to send
      let reminderType: string | null = null;
      let reminderColumn: string | null = null;

      if (diffHours <= 24 && diffHours > 2) {
        reminderType = "24h";
        reminderColumn = "reminder_24h_sent";
      } else if (diffHours <= 1.5 && diffMinutes > 15) {
        reminderType = "1h";
        reminderColumn = "reminder_1h_sent";
      } else if (diffMinutes <= 12 && diffMinutes > 0) {
        reminderType = "10m";
        reminderColumn = "reminder_10m_sent";
      }

      if (!reminderType || !reminderColumn) continue;

      // Get registrations that haven't received this reminder
      const { data: registrations } = await supabase
        .from("webinar_registrations")
        .select("id, learner_id, registrant_email, registrant_name")
        .eq("webinar_id", webinar.id)
        .eq(reminderColumn, false);

      if (!registrations || registrations.length === 0) continue;

      // Also fetch from profiles for fallback email
      const learnerIds = registrations.map(r => r.learner_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", learnerIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      for (const reg of registrations) {
        const profile = profileMap.get(reg.learner_id);
        const email = reg.registrant_email || profile?.email;
        const name = reg.registrant_name || profile?.full_name || "Learner";

        if (!email || !resendKey) continue;

        const reminderSubject = reminderType === "24h"
          ? `Reminder: "${webinar.title}" is tomorrow!`
          : reminderType === "1h"
          ? `Starting soon: "${webinar.title}" in 1 hour!`
          : `🔴 "${webinar.title}" starts in 10 minutes!`;

        const reminderBody = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#6C3CE1;">${reminderType === "10m" ? "🔴 Starting Now!" : reminderType === "1h" ? "⏰ Starting Soon!" : "📅 Tomorrow's Webinar"}</h2>
            <p>Hi ${name},</p>
            <p>${reminderType === "24h" ? "This is a friendly reminder that" : reminderType === "1h" ? "Get ready!" : "It's almost time!"} <strong>"${webinar.title}"</strong> ${reminderType === "24h" ? "is happening tomorrow" : reminderType === "1h" ? "starts in about 1 hour" : "starts in just 10 minutes"}.</p>
            <div style="background:#f5f3ff;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>📅 Date:</strong> ${webinar.webinar_date}</p>
              <p style="margin:4px 0;"><strong>🕐 Time:</strong> ${String(webinar.webinar_time).slice(0, 5)} (${webinar.timezone || "Asia/Kolkata"})</p>
              <p style="margin:4px 0;"><strong>⏱ Duration:</strong> ${webinar.duration_minutes} minutes</p>
            </div>
            ${webinar.webinar_link_status === "approved" ? `<a href="${webinar.webinar_link}" style="display:inline-block;background:#6C3CE1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:12px 0;">Join Webinar</a>` : "<p>The join link will be available at start time.</p>"}
            <p style="color:#666;font-size:14px;margin-top:24px;">— AI Coach Portal Team</p>
          </div>
        `;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: "AI Coach Portal <hello@notify.www.aicoachportal.com>",
              to: [email],
              subject: reminderSubject,
              html: reminderBody,
            }),
          });
          totalSent++;
        } catch (e) {
          console.error(`Failed to send reminder to ${email}:`, e);
        }

        // Mark reminder as sent
        await supabase
          .from("webinar_registrations")
          .update({ [reminderColumn]: true } as any)
          .eq("id", reg.id);
      }
    }

    return new Response(JSON.stringify({ success: true, reminders_sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reminder error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
