// Generates a personalized LinkedIn post celebrating a certificate.
// Uses Lovable AI Gateway. Strictly positive, professional, unique per learner.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI service not configured" }, 500);

    const user = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user: u } } = await user.auth.getUser();
    if (!u) return json({ error: "Unauthorized" }, 401);

    const { certificate_id } = await req.json().catch(() => ({}));
    if (!certificate_id) return json({ error: "certificate_id required" }, 400);

    // Admin global toggle
    const { data: cfg } = await admin
      .from("certificate_settings")
      .select("ai_post_generation_enabled, linkedin_sharing_enabled")
      .limit(1).maybeSingle();
    if (cfg && (cfg.ai_post_generation_enabled === false || cfg.linkedin_sharing_enabled === false)) {
      return json({ error: "AI post generation is disabled" }, 403);
    }

    const { data: cert, error } = await admin
      .from("issued_certificates")
      .select("*")
      .eq("id", certificate_id)
      .maybeSingle();
    if (error || !cert) return json({ error: "Certificate not found" }, 404);
    if (cert.user_id !== u.id) return json({ error: "Forbidden" }, 403);

    // Optional context from webinar
    let webinarDescription = "";
    let learningOutcomes = "";
    let skillsCovered = "";
    if (cert.source_type === "webinar" && cert.webinar_id) {
      const { data: w } = await admin.from("webinars")
        .select("description, learning_outcomes, skills_covered, cert_description")
        .eq("id", cert.webinar_id).maybeSingle();
      webinarDescription = w?.cert_description || w?.description || "";
      learningOutcomes = w?.learning_outcomes || "";
      skillsCovered = w?.skills_covered || "";
    }

    const firstName = (cert.learner_name || "").split(" ")[0] || "Learner";
    const verifyUrl = `https://www.aicoachportal.com/verify-certificate/${cert.verification_token}`;

    const systemPrompt = `You write a LinkedIn celebration post on behalf of a learner who just earned a professional certificate.

STRICT RULES:
- Tone: positive, professional, sincere, first-person.
- ONLY highlight learning, achievement, and gratitude toward the coach.
- NEVER make comparisons to other people, courses, or platforms.
- NEVER include negative, controversial, political, or misleading statements.
- NEVER fabricate facts, statistics, or credentials beyond what is provided.
- 150-220 words, 4-6 short paragraphs.
- Open with a celebration line including an appropriate emoji (🎓 / 🚀 / ✨).
- Mention the webinar/course title and the coach by name.
- Include a bulleted "Key learnings" list of 3-5 items using ✅.
- End with: Certificate ID line then 5-7 professional hashtags including #AICoachPortal.
- Output PLAIN TEXT only (no markdown, no code fences).`;

    const userPrompt = `Generate a unique LinkedIn post for this certificate.

Learner first name: ${firstName}
Certificate type: ${cert.source_type}
Title: ${cert.course_name}
Coach: ${cert.coach_name}${cert.coach_designation ? ` (${cert.coach_designation})` : ""}
${webinarDescription ? `Description: ${webinarDescription}` : ""}
${learningOutcomes ? `Learning outcomes: ${learningOutcomes}` : ""}
${skillsCovered ? `Skills covered: ${skillsCovered}` : ""}
Certificate ID: ${cert.certificate_number}
Verification URL: ${verifyUrl}
Uniqueness seed: ${Date.now()}-${cert.id.slice(0, 8)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit reached. Please try again in a minute." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Please contact admin." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "AI generation failed" }, 500);
    }
    const aiJson = await aiRes.json();
    const post = aiJson.choices?.[0]?.message?.content?.trim() || "";

    return json({ post, verify_url: verifyUrl, certificate_number: cert.certificate_number });
  } catch (e: any) {
    console.error("generate-linkedin-post error:", e);
    return json({ error: e.message || "Failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
