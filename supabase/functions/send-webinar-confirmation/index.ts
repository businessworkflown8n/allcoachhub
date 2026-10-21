import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toGCalUtc, webinarStartUtc } from "../_shared/webinarTime.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webinar_id, learner_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch webinar details
    const { data: webinar } = await supabase
      .from("webinars")
      .select("*")
      .eq("id", webinar_id)
      .single();

    if (!webinar) {
      return new Response(JSON.stringify({ error: "Webinar not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch learner profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", learner_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "Learner email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch coach name
    const { data: coachProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", webinar.coach_id)
      .single();

    const coachName = coachProfile?.full_name || "Your Coach";
    const learnerName = profile.full_name || "Learner";

    // Format date/time
    const dateStr = new Date(webinar.webinar_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = `${webinar.webinar_time.slice(0, 5)} (${webinar.timezone || "Asia/Kolkata"})`;

    // Google Calendar link
    // Start in the webinar's own timezone so calendar entries land at the right time.
    const startDt = webinarStartUtc(webinar);
    const endDt = new Date(startDt.getTime() + webinar.duration_minutes * 60000);
    const toGCalFormat = toGCalUtc;
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${toGCalFormat(startDt)}/${toGCalFormat(endDt)}&details=${encodeURIComponent(webinar.description || "")}&location=${encodeURIComponent(webinar.webinar_link)}`;

    if (resendApiKey) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
          <h1 style="color: #1a1a2e; font-size: 24px;">Webinar Registration Confirmed ✅</h1>
          <p style="color: #333;">Hi ${learnerName},</p>
          <p style="color: #333;">You have successfully registered for the following webinar:</p>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #1a1a2e; margin-top: 0;">${webinar.title}</h2>
            <p style="color: #555; margin: 4px 0;"><strong>Coach:</strong> ${coachName}</p>
            <p style="color: #555; margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="color: #555; margin: 4px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="color: #555; margin: 4px 0;"><strong>Duration:</strong> ${webinar.duration_minutes} minutes</p>
            ${webinar.description ? `<p style="color: #555; margin: 12px 0 4px;"><strong>Description:</strong></p><p style="color: #666;">${webinar.description}</p>` : ""}
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${webinar.webinar_link}" style="background: #c8f542; color: #1a1a2e; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Join Webinar</a>
          </div>
          <div style="text-align: center; margin: 16px 0;">
            <a href="${gcalUrl}" style="color: #4285f4; text-decoration: underline; font-size: 14px;">📅 Add to Google Calendar</a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">You will receive reminder emails 24 hours and 1 hour before the webinar.</p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AllCoachHub <onboarding@resend.dev>",
          to: [profile.email],
          subject: `Webinar Registration Confirmed – ${webinar.title}`,
          html: emailHtml,
        }),
      });
    }

    // Mark email as sent
    await supabase
      .from("webinar_registrations")
      .update({ email_sent: true })
      .eq("webinar_id", webinar_id)
      .eq("learner_id", learner_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
