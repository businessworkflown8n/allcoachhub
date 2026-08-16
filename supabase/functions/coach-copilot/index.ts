// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, context, userPrompt } = await req.json();
    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error("GEMINI_API_KEY missing");

    const systemPrompts: Record<string, string> = {
      pre_session: "You are a coaching copilot. Generate a concise pre-session brief: client status, last session recap, suggested agenda (3 bullets), key questions to ask. Plain text, under 200 words.",
      post_session: "You are a coaching copilot. Generate a post-session summary: key takeaways, action items (numbered), follow-up date suggestion, risk/blocker flags. Plain text, under 200 words.",
      action_plan: "You are a coaching copilot. Create a 7-day action plan with daily tasks, habits, and a reflection prompt. Markdown bullet list.",
      followup_message: "You are a coaching copilot. Write a warm, professional follow-up message to send the client over WhatsApp/email. Under 100 words. Plain text only.",
      content_social: "You are a content marketer. Convert these coaching session notes into 1 LinkedIn post (under 150 words, hook + insight + CTA), no hashtags overload.",
      content_email: "You are an email copywriter. Convert these notes into a short newsletter email: subject line + 3-paragraph body + CTA.",
      content_blog: "You are a blog writer. Convert these notes into a 400-word blog draft with H2 headings in markdown.",
      content_worksheet: "You are an instructional designer. Convert these notes into a client worksheet with 5 reflective prompts and 3 action exercises in markdown.",
    };

    const system = systemPrompts[mode] || "You are a helpful coaching assistant.";
    const user = `${context ? `Context:\n${context}\n\n` : ""}${userPrompt || ""}`.trim();

    const r = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: t }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
