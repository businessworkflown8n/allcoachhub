const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, email, mobile, companyName, expertise, city, country } = await req.json();

    if (!fullName || !email) {
      return new Response(JSON.stringify({ error: "fullName and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const registrationTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "medium",
    });

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;margin-top:32px;margin-bottom:32px;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;text-align:center;">
      <h1 style="margin:0;font-size:24px;color:#ffffff;">🎓 New Coach Registration</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">A new coach just signed up on AI Coach Portal</p>
    </div>

    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:160px;">👤 Full Name</td>
          <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;color:#1f2937;">${fullName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">📧 Email</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#1f2937;"><a href="mailto:${email}" style="color:#6366f1;text-decoration:none;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">📱 Phone</td>
          <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;color:#1f2937;">${mobile || "Not provided"}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">🏢 Company</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#1f2937;">${companyName || "Not provided"}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">🎯 Category</td>
          <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;color:#1f2937;">${expertise || "Not specified"}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">🌍 Location</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#1f2937;">${[city, country].filter(Boolean).join(", ") || "Not provided"}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#f9fafb;font-weight:600;color:#374151;">🕐 Registered At</td>
          <td style="padding:12px 16px;background:#f9fafb;color:#1f2937;">${registrationTime}</td>
        </tr>
      </table>

      <div style="text-align:center;margin-top:28px;">
        <a href="https://www.aicoachportal.com/admin"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
          View Admin Dashboard →
        </a>
      </div>

      <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center;">
        This is an automated notification from AI Coach Portal.
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send with retry logic
    let resendResponse;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AI Coach Portal <notifications@support.aicoachportal.com>",
          to: ["aicoachportal@gmail.com"],
          subject: `🎓 New Coach Registration – ${fullName}`,
          html: emailHtml,
          tags: [
            { name: "category", value: "coach-registration-notification" },
          ],
        }),
      });

      if (resendResponse.ok) break;

      const errorData = await resendResponse.json();
      console.error(`Attempt ${attempts} failed:`, errorData);

      if (attempts < maxAttempts && resendResponse.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * attempts));
        continue;
      }

      return new Response(JSON.stringify({ error: "Failed to send notification", details: errorData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendResponse!.json();
    console.log(`Coach registration notification sent for ${email} (attempt ${attempts})`, resendData);

    return new Response(JSON.stringify({ success: true, messageId: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
