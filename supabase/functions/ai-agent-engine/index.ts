// AI Agent Engine — admin-controlled, modular pipeline.
// Pipeline: validate features → detect intent → custom instructions → KB
//   → skill logic → language → memory → fallback → response format.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Msg = { role: "user" | "assistant" | "system"; content: string };

interface FeatureControl {
  enable_sales_skill?: boolean;
  enable_support_skill?: boolean;
  enable_knowledge_base?: boolean;
  enable_custom_instructions?: boolean;
  enable_memory?: boolean;
  enable_language_switch?: boolean;
  max_instructions?: number;
}

interface AgentConfig {
  language?: string;
  skills?: string[];
  custom_instructions?: string[];
  tone?: string;
}

interface AgentRequest {
  user_query: string;
  agent_config?: AgentConfig;
  knowledge_context?: string[];
  conversation_history?: Msg[];
  feature_control?: FeatureControl;
  session_id?: string;
  coach_id?: string;
  mode?: "live" | "test";
}

const DEFAULT_FC: Required<FeatureControl> = {
  enable_sales_skill: true,
  enable_support_skill: true,
  enable_knowledge_base: true,
  enable_custom_instructions: true,
  enable_memory: true,
  enable_language_switch: true,
  max_instructions: 20,
};

// STEP 2: Intent detection (fast heuristic — no extra LLM call)
function detectIntent(q: string): "sales" | "support" | "learning" | "general" {
  const s = q.toLowerCase();
  if (/\b(buy|price|pricing|enroll|join|sign ?up|cost|fee|discount|purchase|subscribe|plan)\b/.test(s)) return "sales";
  if (/\b(issue|problem|error|bug|not working|help|support|broken|stuck|failed|refund|cancel)\b/.test(s)) return "support";
  if (/\b(learn|how to|what is|explain|tutorial|guide|course about)\b/.test(s)) return "learning";
  return "general";
}

function salesPrompt() {
  return `SALES SKILL ACTIVE:
- Identify the user's underlying goal, not just the literal ask.
- Highlight outcomes & transformations, not raw features.
- Acknowledge objections briefly and reframe with value.
- ALWAYS end with a soft CTA, e.g. "Would you like the enrollment link?" or "I can help you get started."`;
}

function supportPrompt() {
  return `SUPPORT SKILL ACTIVE:
- Provide a clear, numbered, step-by-step solution.
- If unsure, say "Let me check this for you" rather than guessing.
- If unresolved or out of scope, suggest contacting human support on WhatsApp +91 9852411280.`;
}

function kbBlock(kb: string[]) {
  if (!kb?.length) return "";
  return `KNOWLEDGE BASE (use ONLY this for facts; do not invent missing info):\n${kb.map((k, i) => `[${i + 1}] ${k}`).join("\n")}`;
}

function instructionsBlock(items: string[], max: number) {
  const trimmed = (items || []).slice(0, max).map((s) => s.trim()).filter(Boolean);
  if (!trimmed.length) return "";
  return `CUSTOM INSTRUCTIONS (strictly follow, override defaults):\n${trimmed.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
}

function buildSystemPrompt(req: AgentRequest, fc: Required<FeatureControl>, intent: string) {
  const cfg = req.agent_config || {};
  const tone = cfg.tone || "professional";
  const language = fc.enable_language_switch && cfg.language ? cfg.language : "English";

  const parts: string[] = [];
  parts.push(`You are a controlled AI coaching assistant. Tone: ${tone} + conversational. Respond in ${language}. Be clear, concise, action-oriented. No fluff.`);
  parts.push(`GLOBAL RULES:
- Never make false promises. Never hallucinate. Never give unethical/illegal guidance.
- Never disparage competitors.
- Never act outside the features explicitly enabled below.`);

  if (fc.enable_custom_instructions) {
    const block = instructionsBlock(cfg.custom_instructions || [], fc.max_instructions);
    if (block) parts.push(block);
  }

  if (fc.enable_knowledge_base) {
    const kb = kbBlock(req.knowledge_context || []);
    if (kb) parts.push(kb);
  }

  const skills = new Set((cfg.skills || []).map((s) => s.toLowerCase()));
  const applySales = fc.enable_sales_skill && skills.has("sales") && intent === "sales";
  const applySupport = fc.enable_support_skill && skills.has("support") && intent === "support";
  if (applySales) parts.push(salesPrompt());
  if (applySupport) parts.push(supportPrompt());

  parts.push(`FALLBACK: If you lack a confident, grounded answer, reply exactly:
"I don't have exact information on this yet, but I can help you explore relevant options."
Then suggest: relevant courses, the community, or contacting support.`);

  parts.push(`RESPONSE FORMAT:
1) Direct Answer (1-3 sentences).
2) Helpful Expansion (only if it adds real value).
3) CTA — include ONLY if sales context is active.`);

  return parts.join("\n\n");
}

function scoreSignals(query: string, intent: string) {
  const s = query.toLowerCase();
  let conv = 0;
  if (intent === "sales") conv += 0.4;
  if (/\b(buy|enroll|join|pay|checkout)\b/.test(s)) conv += 0.4;
  if (/\b(price|cost|discount|coupon)\b/.test(s)) conv += 0.2;
  conv = Math.min(1, conv);
  const escalation = intent === "support" && /\b(refund|angry|complaint|legal|escalate|manager|urgent)\b/.test(s);
  return { conversion_probability: Number(conv.toFixed(2)), escalation_flag: escalation };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as AgentRequest;
    if (!body?.user_query || typeof body.user_query !== "string") {
      return new Response(JSON.stringify({ error: "user_query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // STEP 1 — feature gates with safe defaults
    const fc: Required<FeatureControl> = { ...DEFAULT_FC, ...(body.feature_control || {}) };
    if (!Number.isFinite(fc.max_instructions) || fc.max_instructions < 0) fc.max_instructions = 0;
    fc.max_instructions = Math.min(fc.max_instructions, 20);

    // STEP 2
    const intent = detectIntent(body.user_query);

    // STEP 7 — memory only if enabled
    const history: Msg[] = fc.enable_memory ? (body.conversation_history || []).slice(-12) : [];

    const systemPrompt = buildSystemPrompt(body, fc, intent);
    const messages: Msg[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: body.user_query },
    ];

    const aiRes = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemini-3.7-flash", messages }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please retry shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const finalText: string = data?.choices?.[0]?.message?.content ?? "";
    const signals = scoreSignals(body.user_query, intent);

    // Test mode: never persist. Live mode: best-effort log.
    const mode: "live" | "test" = body.mode === "test" ? "test" : "live";
    if (mode === "live" && body.session_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, serviceKey);
        const auth = req.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        let userId: string | null = null;
        if (token) {
          const { data: u } = await sb.auth.getUser(token);
          userId = u?.user?.id ?? null;
        }
        await sb.from("ai_agent_conversations").insert([
          { user_id: userId, coach_id: body.coach_id ?? null, session_id: body.session_id, role: "user", content: body.user_query, intent_type: intent, conversion_probability: signals.conversion_probability, escalation_flag: signals.escalation_flag, mode },
          { user_id: userId, coach_id: body.coach_id ?? null, session_id: body.session_id, role: "assistant", content: finalText, intent_type: intent, conversion_probability: signals.conversion_probability, escalation_flag: signals.escalation_flag, mode },
        ]);
      } catch (e) {
        console.warn("conversation log skipped:", (e as Error).message);
      }
    }

    return new Response(
      JSON.stringify({
        response: finalText,
        intent_type: intent,
        conversion_probability: signals.conversion_probability,
        escalation_flag: signals.escalation_flag,
        applied: {
          sales_skill: fc.enable_sales_skill && (body.agent_config?.skills || []).includes("sales") && intent === "sales",
          support_skill: fc.enable_support_skill && (body.agent_config?.skills || []).includes("support") && intent === "support",
          knowledge_base: fc.enable_knowledge_base && (body.knowledge_context?.length || 0) > 0,
          custom_instructions: fc.enable_custom_instructions && (body.agent_config?.custom_instructions?.length || 0) > 0,
          memory: fc.enable_memory && history.length > 0,
          language_switch: fc.enable_language_switch && !!body.agent_config?.language,
        },
        mode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-agent-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
