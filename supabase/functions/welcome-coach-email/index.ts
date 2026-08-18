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

    const { fullName, email } = await req.json();

    if (!fullName || !email) {
      return new Response(JSON.stringify({ error: "fullName and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Welcome to AI Coach Portal</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;margin-top:32px;margin-bottom:32px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center;">
      <h1 style="margin:0;font-size:28px;color:#ffffff;font-weight:700;letter-spacing:-0.5px;">🎉 Welcome to AI Coach Portal!</h1>
      <p style="margin:12px 0 0;color:rgba(255,255,255,0.92);font-size:15px;line-height:1.5;">You're now part of India's fastest-growing AI coaching platform</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;">
      <p style="font-size:17px;color:#1f2937;margin:0 0 8px;">Hi <strong>${fullName}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
        Thank you for registering as a <strong>Coach</strong> on AI Coach Portal! 🙌 We're thrilled to have you onboard. Our platform connects you with thousands of motivated learners looking to master AI skills — and we're here to help you grow.
      </p>

      <!-- Onboarding Steps -->
      <div style="background:#f9fafb;border-radius:10px;padding:24px;margin-bottom:28px;border:1px solid #e5e7eb;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#1f2937;font-weight:700;">📋 Get Started in 4 Simple Steps</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;width:36px;">
              <div style="background:#6366f1;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700;font-size:14px;">1</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
              <strong>Verify Your Email</strong><br/>Click the verification link we sent to activate your account.
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <div style="background:#6366f1;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700;font-size:14px;">2</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
              <strong>Complete Your Profile</strong><br/>Add your photo, bio, expertise, certifications &amp; optimize your bio to build trust.
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <div style="background:#6366f1;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700;font-size:14px;">3</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
              <strong>Create Your First Course</strong><br/>List your course with pricing, curriculum, and a compelling description.
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;vertical-align:top;">
              <div style="background:#6366f1;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700;font-size:14px;">4</div>
            </td>
            <td style="padding:10px 12px;font-size:14px;color:#374151;">
              <strong>Set Pricing &amp; Go Live</strong><br/>Publish your course and start getting enrolled students immediately.
            </td>
          </tr>
        </table>
      </div>

      <!-- PRIMARY CTA - Get Students Now -->
      <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:12px;padding:32px;text-align:center;margin-bottom:28px;">
        <h2 style="margin:0 0 8px;font-size:22px;color:#ffffff;font-weight:700;">🚀 Want More Students Faster?</h2>
        <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.92);line-height:1.6;">
          Connect with us directly and we'll help you optimize your profile, promote your courses, and get your first batch of students quickly!
        </p>
        <div>
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://wa.me/919852411280?text=Hi%2C%20I%20just%20registered%20as%20a%20coach%20on%20AI%20Coach%20Portal.%20I%20want%20to%20get%20more%20students." style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#ffffff" fillcolor="#ffffff">
          <w:anchorlock/>
          <center style="color:#059669;font-family:sans-serif;font-size:15px;font-weight:bold;">💬 Get Students Now</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="https://wa.me/919852411280?text=Hi%2C%20I%20just%20registered%20as%20a%20coach%20on%20AI%20Coach%20Portal.%20I%20want%20to%20get%20more%20students."
             style="display:inline-block;background:#ffffff;color:#059669;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;margin-right:12px;margin-bottom:8px;">
            💬 Get Students Now
          </a>
          <!--<![endif]-->
          <a href="tel:+919852411280"
             style="display:inline-block;background:rgba(255,255,255,0.2);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;border:2px solid rgba(255,255,255,0.5);margin-bottom:8px;">
            📞 Call 9852411280
          </a>
        </div>
      </div>

      <!-- Why Join -->
      <div style="margin-bottom:28px;">
        <h3 style="font-size:16px;color:#1f2937;margin:0 0 14px;font-weight:700;">Why Coaches Love AI Coach Portal</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
          <tr><td style="padding:8px 0;">✅ Zero upfront cost to list courses</td></tr>
          <tr><td style="padding:8px 0;">✅ Built-in marketing &amp; student discovery</td></tr>
          <tr><td style="padding:8px 0;">✅ Automated payments &amp; enrollment management</td></tr>
          <tr><td style="padding:8px 0;">✅ AI-powered tools to grow your brand</td></tr>
          <tr><td style="padding:8px 0;">✅ Dedicated support to help you succeed</td></tr>
        </table>
      </div>

      <!-- Dashboard CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://www.aicoachportal.com/coach"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;">
          Open Your Coach Dashboard →
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.6;">
        Need help? Reach us anytime at 
        <a href="mailto:aicoachportal@gmail.com" style="color:#6366f1;text-decoration:none;">aicoachportal@gmail.com</a>
        or WhatsApp 
        <a href="https://wa.me/919852411280" style="color:#6366f1;text-decoration:none;">9852411280</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:18px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} AI Coach Portal. All rights reserved.</p>
      <p style="margin:6px 0 0;font-size:11px;color:#c0c0c0;">
        You received this email because you registered as a coach on AI Coach Portal.
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
          to: [email],
          subject: `Welcome to AI Coach Portal, ${fullName}! 🚀 Start Getting Students Today`,
          html: emailHtml,
          tags: [
            { name: "category", value: "welcome-coach" },
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

      return new Response(JSON.stringify({ error: "Failed to send welcome email", details: errorData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendResponse!.json();
    console.log(`Welcome email sent to coach: ${email} (attempt ${attempts})`, resendData);

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
