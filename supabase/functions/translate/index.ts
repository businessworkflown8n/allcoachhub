import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { strings, targetLanguage, targetCountry } = await req.json();

    if (!strings || !targetLanguage) {
      return new Response(JSON.stringify({ error: "Missing strings or targetLanguage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If target is English, return strings as-is
    if (targetLanguage.toLowerCase() === "english") {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(strings)) {
        result[key] = value as string;
      }
      return new Response(JSON.stringify({ translations: result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Build a JSON object of key:value pairs for translation
    const stringsJson = JSON.stringify(strings);

    const systemPrompt = `You are a professional translator. Translate the following JSON object values from English to ${targetLanguage}${targetCountry ? ` (as used in ${targetCountry})` : ''}. 
Keep the JSON keys exactly the same. Only translate the values. 
Maintain any placeholders like {0}, {1}, {{count}} etc. as-is.
Return ONLY valid JSON with the same keys and translated values. No explanation.`;

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: stringsJson },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Translation service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the translated JSON - handle markdown code blocks
    let translatedJson: Record<string, string>;
    try {
      // Remove potential markdown code block wrapping
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      translatedJson = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse translation response:", content);
      // Fallback: return original strings
      translatedJson = strings;
    }

    return new Response(JSON.stringify({ translations: translatedJson }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
