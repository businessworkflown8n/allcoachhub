import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { videoUrl, description } = await req.json();
    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const prompt = `You are an expert video content reviewer for online coaching content.
Analyze this coaching video and provide structured feedback.

Video URL: ${videoUrl || "Not provided"}
Content Description: ${description || "Not provided"}

Return a JSON object with exactly these fields:
- audioScore: number 1-100 (rate audio clarity, pacing, tone)
- videoScore: number 1-100 (rate visual quality, framing, lighting)
- engagementScore: number 1-100 (rate how engaging and compelling the content is)
- suggestions: array of 3-5 actionable improvement suggestions

Respond ONLY with valid JSON, no markdown.`;

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an AI video content analyst. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("content-review error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
