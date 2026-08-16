import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEP_PROMPTS: Record<string, { system: string; tool: any }> = {
  niche: {
    system: "You are an elite coaching business strategist. Generate sharp, specific niche statements for a coach. Provide 3 variations, a positioning score 0-100 with rationale, and a market demand indicator (Low/Moderate/High/Very High).",
    tool: {
      name: "niche_output",
      description: "Niche clarity output",
      parameters: {
        type: "object",
        properties: {
          variations: { type: "array", items: { type: "object", properties: { statement: { type: "string" }, angle: { type: "string" } }, required: ["statement", "angle"] } },
          positioning_score: { type: "number" },
          score_rationale: { type: "string" },
          market_demand: { type: "string", enum: ["Low", "Moderate", "High", "Very High"] },
          improvement_tips: { type: "array", items: { type: "string" } },
        },
        required: ["variations", "positioning_score", "score_rationale", "market_demand", "improvement_tips"],
      },
    },
  },
  avatar: {
    system: "You are a buyer-persona expert. Build an Ideal Client Avatar with story-format persona, pain intensity score, buying capacity prediction, top objections, and buying triggers.",
    tool: {
      name: "avatar_output",
      description: "Ideal client avatar",
      parameters: {
        type: "object",
        properties: {
          persona_name: { type: "string" },
          persona_story: { type: "string" },
          demographics: { type: "object", properties: { age: { type: "string" }, income: { type: "string" }, profession: { type: "string" } }, required: ["age", "income", "profession"] },
          pain_intensity: { type: "number" },
          buying_capacity: { type: "string", enum: ["Low", "Medium", "High", "Premium"] },
          objections: { type: "array", items: { type: "object", properties: { objection: { type: "string" }, counter: { type: "string" } }, required: ["objection", "counter"] } },
          buying_triggers: { type: "array", items: { type: "string" } },
          preferred_platforms: { type: "array", items: { type: "string" } },
        },
        required: ["persona_name", "persona_story", "demographics", "pain_intensity", "buying_capacity", "objections", "buying_triggers", "preferred_platforms"],
      },
    },
  },
  problems: {
    system: "Generate the top 8 problems this avatar faces in this niche, ranked by severity, with revenue impact and emotional trigger.",
    tool: {
      name: "problems_output",
      description: "Problem stack",
      parameters: {
        type: "object",
        properties: {
          problems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                problem: { type: "string" },
                severity: { type: "string", enum: ["Critical", "Moderate", "Low"] },
                revenue_impact: { type: "string" },
                emotional_trigger: { type: "string" },
              },
              required: ["problem", "severity", "revenue_impact", "emotional_trigger"],
            },
          },
        },
        required: ["problems"],
      },
    },
  },
  offer: {
    system: "Design a high-converting coaching offer: program names, structure, transformation promise, delivery format, guarantee, bonuses. Score the offer 0-100.",
    tool: {
      name: "offer_output",
      description: "Offer creation",
      parameters: {
        type: "object",
        properties: {
          program_names: { type: "array", items: { type: "string" } },
          chosen_name: { type: "string" },
          structure: { type: "string" },
          transformation_promise: { type: "string" },
          delivery_format: { type: "string", enum: ["Live", "Recorded", "Hybrid"] },
          guarantee: { type: "string" },
          bonuses: { type: "array", items: { type: "string" } },
          offer_score: { type: "number" },
        },
        required: ["program_names", "chosen_name", "structure", "transformation_promise", "delivery_format", "guarantee", "bonuses", "offer_score"],
      },
    },
  },
  pricing: {
    system: "Build pricing strategy with tiers, revenue simulation at 10/50/100 users, conversion benchmarks, CAC estimate, break-even users. Score 0-100.",
    tool: {
      name: "pricing_output",
      description: "Pricing & revenue",
      parameters: {
        type: "object",
        properties: {
          ideal_price_inr: { type: "number" },
          ideal_price_usd: { type: "number" },
          tiers: { type: "array", items: { type: "object", properties: { name: { type: "string" }, price_inr: { type: "number" }, includes: { type: "string" } }, required: ["name", "price_inr", "includes"] } },
          revenue_simulation: { type: "object", properties: { at_10: { type: "number" }, at_50: { type: "number" }, at_100: { type: "number" } }, required: ["at_10", "at_50", "at_100"] },
          conversion_benchmark_pct: { type: "number" },
          cac_estimate_inr: { type: "number" },
          break_even_users: { type: "number" },
          pricing_score: { type: "number" },
          rationale: { type: "string" },
        },
        required: ["ideal_price_inr", "ideal_price_usd", "tiers", "revenue_simulation", "conversion_benchmark_pct", "cac_estimate_inr", "break_even_users", "pricing_score", "rationale"],
      },
    },
  },
  curriculum: {
    system: "Build a complete coaching curriculum based on the offer. Choose ideal duration (7-day / 30-day / 8-week). For each module include lessons with objective, action task, expected outcome.",
    tool: {
      name: "curriculum_output",
      description: "Course curriculum",
      parameters: {
        type: "object",
        properties: {
          duration: { type: "string", enum: ["7-day", "30-day", "8-week"] },
          modules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                lessons: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      objective: { type: "string" },
                      action_task: { type: "string" },
                      expected_outcome: { type: "string" },
                    },
                    required: ["title", "objective", "action_task", "expected_outcome"],
                  },
                },
              },
              required: ["title", "lessons"],
            },
          },
        },
        required: ["duration", "modules"],
      },
    },
  },
  funnel: {
    system: "Design a marketing funnel & growth engine: funnel type, lead-gen strategy, content plan, ad copy, landing page framework, platform recommendations.",
    tool: {
      name: "funnel_output",
      description: "Marketing blueprint",
      parameters: {
        type: "object",
        properties: {
          funnel_type: { type: "string", enum: ["Webinar", "VSL", "DM", "Ads", "Hybrid"] },
          lead_gen_strategy: { type: "string" },
          content_plan: { type: "array", items: { type: "string" } },
          ad_copy: { type: "array", items: { type: "object", properties: { headline: { type: "string" }, body: { type: "string" } }, required: ["headline", "body"] } },
          landing_page_framework: { type: "string" },
          platforms: { type: "array", items: { type: "string" } },
        },
        required: ["funnel_type", "lead_gen_strategy", "content_plan", "ad_copy", "landing_page_framework", "platforms"],
      },
    },
  },
  roadmap: {
    system: "Generate an actionable 30/60/90-day execution roadmap with weekly action plan, daily tasks, and KPIs.",
    tool: {
      name: "roadmap_output",
      description: "Execution roadmap",
      parameters: {
        type: "object",
        properties: {
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", enum: ["30-day", "60-day", "90-day"] },
                goal: { type: "string" },
                weeks: { type: "array", items: { type: "object", properties: { week: { type: "number" }, focus: { type: "string" }, tasks: { type: "array", items: { type: "string" } }, kpi: { type: "string" } }, required: ["week", "focus", "tasks", "kpi"] } },
              },
              required: ["name", "goal", "weeks"],
            },
          },
        },
        required: ["phases"],
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { step, blueprint } = await req.json();
    const promptCfg = STEP_PROMPTS[step];
    if (!promptCfg) return new Response(JSON.stringify({ error: "Invalid step" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error("GEMINI_API_KEY missing");

    const userMsg = `Coach blueprint context (use prior steps to adapt this output):\n${JSON.stringify(blueprint, null, 2)}\n\nGenerate the ${step} output now.`;

    const aiRes = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [
          { role: "system", content: promptCfg.system },
          { role: "user", content: userMsg },
        ],
        tools: [{ type: "function", function: promptCfg.tool }],
        tool_choice: { type: "function", function: { name: promptCfg.tool.name } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return new Response(JSON.stringify({ error: "No structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const parsed = JSON.parse(args);

    return new Response(JSON.stringify({ output: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
