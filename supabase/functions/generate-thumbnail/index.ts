import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getAiApiKey, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt, count = 3 } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    getAiApiKey(); // ensure configured

    const numImages = Math.min(Math.max(count, 1), 4);
    const images: string[] = [];

    for (let i = 0; i < numImages; i++) {
      const variation = i === 0
        ? prompt
        : `${prompt}, variation ${i + 1}, slightly different color scheme and layout`;

      const imageUrl = await generateImageDataUrl(variation);
      if (imageUrl) images.push(imageUrl);

      if (i < numImages - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    if (images.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate any images" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-thumbnail error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
