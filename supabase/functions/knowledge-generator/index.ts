// Knowledge Hub AI generator - produces AEO/GEO optimized content using Lovable AI Gateway.
// Generates: ai_summary (40-60 words), detailed_explanation (markdown),
// key_takeaways, faqs, meta_title, meta_description, focus_keyword, secondary_keywords.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, topic, focus_keyword } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `You are a senior SEO + AEO + GEO content strategist for AI Coach Portal (https://www.aicoachportal.com), an AI coaching marketplace.
Your goal: produce an answer page optimized to be (a) ranked on Google, (b) extracted as a Featured Snippet, and (c) cited verbatim by ChatGPT, Perplexity, Claude, and Gemini.
Write factually, neutrally, with concrete numbers. No fluff, no marketing speak. Use plain English. Markdown allowed in detailed_explanation.`;

    const userPrompt = `Create a Knowledge Hub answer page.

Topic: ${topic || "AI coaching"}
Question: ${question}
${focus_keyword ? `Focus keyword: ${focus_keyword}` : ""}

Generate:
1. ai_summary — EXACTLY 40 to 60 words. Direct answer to the question, suitable for an LLM to quote verbatim. No preamble. No "In this article". Start with the answer.
2. detailed_explanation — 400-700 words of markdown. Use ## subheadings. Cover: definition, how it works, who it's for, when to use it, common mistakes. Bold key terms.
3. key_takeaways — 4 to 6 short bullet strings (max 18 words each).
4. faqs — 4 to 6 follow-up question/answer pairs. Each answer 30-50 words.
5. meta_title — max 60 chars, include the focus keyword.
6. meta_description — max 160 chars, include the focus keyword and a CTA.
7. focus_keyword — short phrase (2-4 words).
8. secondary_keywords — 4-6 related keyword phrases.`;

    const aiResp = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "publish_knowledge_answer",
            description: "Return the structured answer page content.",
            parameters: {
              type: "object",
              properties: {
                ai_summary: { type: "string" },
                detailed_explanation: { type: "string" },
                key_takeaways: { type: "array", items: { type: "string" } },
                faqs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["question", "answer"],
                    additionalProperties: false,
                  },
                },
                meta_title: { type: "string" },
                meta_description: { type: "string" },
                focus_keyword: { type: "string" },
                secondary_keywords: { type: "array", items: { type: "string" } },
              },
              required: [
                "ai_summary", "detailed_explanation", "key_takeaways",
                "faqs", "meta_title", "meta_description",
                "focus_keyword", "secondary_keywords",
              ],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "publish_knowledge_answer" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit, please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Top up Lovable AI workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ok: true, content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("knowledge-generator error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
