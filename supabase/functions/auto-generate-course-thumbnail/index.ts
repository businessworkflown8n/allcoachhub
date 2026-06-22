import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Category → visual style cues
const CATEGORY_STYLES: Record<string, string> = {
  "AI & Automation": "futuristic technology, neural networks, circuit patterns, neon cyan and purple glow",
  "Digital Marketing": "growth charts, social media icons, vibrant orange and pink gradients, analytics dashboard",
  "Business": "corporate skyline, sleek navy and gold, strategy chess pieces, professional",
  "Finance": "financial charts, candlestick graphs, emerald green and gold, money symbols",
  "Health": "wellness, soft teal and mint, medical cross, healthy lifestyle imagery",
  "Coaching": "mentor silhouette, sunrise, transformation, warm amber gradients, success vibes",
  "Education": "books, graduation cap, classroom, friendly blue and yellow, academic",
};

function styleFor(category: string): string {
  for (const k of Object.keys(CATEGORY_STYLES)) {
    if (category?.toLowerCase().includes(k.toLowerCase())) return CATEGORY_STYLES[k];
  }
  return "modern professional online course design, clean geometric shapes, vibrant gradient";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { courseId } = await req.json();
    if (!courseId) {
      return new Response(JSON.stringify({ error: "courseId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Global toggle check
    const { data: setting } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "auto_thumbnail_enabled")
      .maybeSingle();
    if (setting?.value === "false") {
      return new Response(JSON.stringify({ skipped: "globally disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch course
    const { data: course, error: cErr } = await admin
      .from("courses")
      .select("id, coach_id, title, description, category, thumbnail_url")
      .eq("id", courseId)
      .maybeSingle();
    if (cErr || !course) throw new Error("Course not found");
    if (course.thumbnail_url) {
      return new Response(JSON.stringify({ skipped: "already has thumbnail" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch coach name
    const { data: coach } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", course.coach_id)
      .maybeSingle();

    const coachName = coach?.full_name || "AI Coach Portal";
    const style = styleFor(course.category || "");
    const desc = (course.description || "").slice(0, 200);

    const prompt = `Professional 16:9 course thumbnail (1280x720) for an online learning marketplace.
Course title: "${course.title}"
Category: ${course.category}
Style: ${style}
Description hint: ${desc}
Instructor: ${coachName}
Requirements: Bold, large readable course title text overlay; high-contrast modern LMS design; cinematic background; visually rich but clean; no watermark; no random letters; no spelling mistakes; emphasize the title.`;

    // Generate image
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errTxt);
      return new Response(JSON.stringify({ error: "ai_failed", status: aiRes.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const imageUrl: string | undefined =
      aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl?.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "no_image_returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert data URL to bytes
    const base64 = imageUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `course-thumbnails/${course.coach_id}/${course.id}-auto.png`;

    const { error: upErr } = await admin.storage.from("logos").upload(path, bytes, {
      upsert: true,
      contentType: "image/png",
    });
    if (upErr) throw upErr;

    const { data: urlData } = admin.storage.from("logos").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    await admin
      .from("courses")
      .update({ thumbnail_url: publicUrl, thumbnail_status: "pending" })
      .eq("id", course.id);

    return new Response(JSON.stringify({ thumbnail_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-generate-course-thumbnail error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
