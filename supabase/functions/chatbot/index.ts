import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory cache (per-isolate) to avoid re-fetching on every message.
// Website content refreshes every ~10 minutes automatically.
let KB_CACHE: { text: string; contact: { whatsapp: string; call: string; message: string }; at: number } | null = null;
const KB_TTL_MS = 10 * 60 * 1000;

async function buildKnowledgeBase(supabase: any) {
  if (KB_CACHE && Date.now() - KB_CACHE.at < KB_TTL_MS) return KB_CACHE;

  const [
    coursesRes, coachesRes, blogsRes, webinarsRes, workshopsRes,
    coachCatsRes, courseCatsRes, knowledgeRes, landingRes, plansRes,
    commRes,
  ] = await Promise.all([
    supabase.from("courses").select("title, slug, category, description, level, language, price_inr, price_usd, duration_hours, has_certificate").eq("is_published", true).eq("approval_status", "approved").limit(100),
    supabase.from("coach_profiles_public").select("full_name, slug, category, bio, experience, country, certifications").limit(100),
    supabase.from("ai_blogs").select("title, slug, excerpt, category, published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(40),
    supabase.from("webinars").select("title, slug, description, webinar_date, webinar_time, duration_minutes, price_inr, price_usd").eq("is_published", true).limit(30),
    supabase.from("workshops").select("title, description, workshop_date, price_inr, price_usd").limit(30),
    supabase.from("coach_categories").select("name, slug, description").limit(50),
    supabase.from("course_categories").select("name, slug, description").limit(50),
    supabase.from("knowledge_topics").select("title, slug, description").limit(50),
    supabase.from("landing_pages").select("title, slug, description").eq("is_published", true).limit(30),
    supabase.from("subscription_plans").select("name, description, price_inr_monthly, price_usd_monthly, features").eq("is_active", true).limit(20),
    supabase.from("communication_settings").select("key, value"),
  ]);

  const commMap: Record<string, string> = {};
  (commRes.data || []).forEach((r: any) => { commMap[r.key] = r.value; });
  const contact = {
    whatsapp: commMap.whatsapp_number || "919852411280",
    call: commMap.call_number || "+919852411280",
    message: commMap.whatsapp_message || "Hi, I would like to know more about AI Coach Portal",
  };

  const text = `
## AI Coach Portal — Live Website Knowledge Base
Source of truth: https://www.aicoachportal.com/ (data below is pulled directly from the live website database).

### Courses (${coursesRes.data?.length || 0})
${coursesRes.data?.map((c: any) => `- ${c.title} [/course/${c.slug}] — ${c.category || "AI"}, ${c.level || "all levels"}, ${c.language || "English"}, ${c.duration_hours || "?"}h${c.has_certificate ? ", certificate" : ""} — ₹${c.price_inr ?? "-"} / $${c.price_usd ?? "-"} — ${(c.description || "").slice(0, 140)}`).join("\n") || "No courses."}

### Course Categories
${courseCatsRes.data?.map((c: any) => `- ${c.name} [/courses/${c.slug}] — ${(c.description || "").slice(0, 100)}`).join("\n") || "-"}

### Coaches (${coachesRes.data?.length || 0})
${coachesRes.data?.map((c: any) => `- ${c.full_name} [/coach-profile/${c.slug}] — ${c.category || "AI"}, ${c.country || "India"}${c.experience ? `, ${c.experience}` : ""} — ${(c.bio || "").slice(0, 100)}`).join("\n") || "No coaches."}

### Coach Categories
${coachCatsRes.data?.map((c: any) => `- ${c.name} [/categories/${c.slug}] — ${(c.description || "").slice(0, 100)}`).join("\n") || "-"}

### Webinars (${webinarsRes.data?.length || 0})
${webinarsRes.data?.map((w: any) => `- ${w.title} on ${w.webinar_date} ${w.webinar_time || ""} (${w.duration_minutes || "?"}min) — ₹${w.price_inr ?? "free"} / $${w.price_usd ?? "free"} — ${(w.description || "").slice(0, 100)}`).join("\n") || "No upcoming webinars."}

### Workshops (${workshopsRes.data?.length || 0})
${workshopsRes.data?.map((w: any) => `- ${w.title} on ${w.workshop_date || "TBA"} — ₹${w.price_inr ?? "-"} / $${w.price_usd ?? "-"} — ${(w.description || "").slice(0, 100)}`).join("\n") || "No workshops."}

### Membership / Subscription Plans
${plansRes.data?.map((p: any) => `- ${p.name} — ₹${p.price_inr_monthly ?? "-"}/mo, $${p.price_usd_monthly ?? "-"}/mo — ${(p.description || "").slice(0, 120)}`).join("\n") || "-"}

### Knowledge Hub Topics
${knowledgeRes.data?.map((k: any) => `- ${k.title} [/knowledge/${k.slug}] — ${(k.description || "").slice(0, 100)}`).join("\n") || "-"}

### Blog Articles / AI Jobs & News (latest ${blogsRes.data?.length || 0})
${blogsRes.data?.map((b: any) => `- ${b.title} [/ai-blogs/${b.slug}] (${b.category}) — ${(b.excerpt || "").slice(0, 100)}`).join("\n") || "-"}

### Landing Pages
${landingRes.data?.map((l: any) => `- ${l.title} [/lp/${l.slug}] — ${(l.description || "").slice(0, 100)}`).join("\n") || "-"}

### Key Site Navigation
- Home: /
- Courses: /courses    - Categories: /categories    - Coaches: /browse-coaches
- Webinars: /webinars    - Blog / AI Jobs & News: /ai-blogs    - Knowledge Hub: /knowledge
- Become a Coach: /signup/coach    - Learner Signup: /signup/learner    - Login: /login/learner or /login/coach
- Pricing / Membership: shown on /coach dashboard subscription page after signup
- Privacy: /privacy-policy   Terms: /terms   Refund: /refund-policy   Cancellation: /cancellation-policy
- Contact / Support: WhatsApp ${contact.call}
`;
  KB_CACHE = { text, contact, at: Date.now() };
  return KB_CACHE;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userName } = await req.json();
    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { text: knowledgeBase, contact } = await buildKnowledgeBase(supabase);

    const nameInstruction = userName
      ? `- The user's name is "${userName}". Address them naturally once or twice.`
      : "";

    const systemPrompt = `You are the AI Coach Portal assistant on https://www.aicoachportal.com/.

${knowledgeBase}

## Knowledge Priority (highest → lowest)
1. The AI Coach Portal website content above (always most trusted, always current).
2. Admin-configured FAQs and internal docs (embedded above when present).
3. General knowledge — only for defining common terms, never for portal-specific facts.

If the website data above conflicts with anything else, the website data wins.

## Answering Rules
- Answer ONLY using the knowledge base above for portal-specific facts (courses, coaches, pricing, policies, contact, features, workshops, webinars, blogs, categories, jobs).
- NEVER invent courses, coaches, prices, certificates, policies, phone numbers, emails, or URLs. If it isn't in the knowledge above, say so.
- When something is not found, reply exactly along the lines of: "I couldn't find that information on AI Coach Portal. Please contact our support team." and share WhatsApp ${contact.call}.
- Always use CURRENT pricing from the knowledge base. Show both ₹ INR and $ USD when available.
- When recommending, only recommend items listed above. Prefer newest / featured. Include the slug path (e.g. /course/<slug>) so the user can navigate.
- If multiple results match (e.g. "AI Marketing"), group them: Top Courses, Top Coaches, Latest Blogs, Related Workshops.
${nameInstruction}

## Intent Detection & Spelling
- Match by intent, not exact keywords. Handle typos and short forms:
  - coch / coache / coah → coach ; corse / cours / coures → course ; lernning → learning ; automtion / automaton → automation ; certficate → certificate ; paymnt → payment ; refnd → refund ; logn → login ; webnar → webinar ; wrkshop → workshop.
- Intents: "need AI course/classes/training" → courses ; "want coach/mentor/trainer/expert" → coaches ; "workshop" → workshops ; "certification" → courses with has_certificate ; "become a coach" → /signup/coach ; "enroll / how to join" → course page + /signup/learner ; "pricing / membership / plan" → Membership plans ; "AI Jobs / news" → Blog section ; "help / support / contact" → contact info below.

## Multi-language
- Understand English, Hinglish, and simple Hindi-in-English (e.g. "AI ka best course", "coach kaise bane", "pricing kitni hai", "certificate milega?"). Reply in the same style/language the user used, defaulting to English.

## Escalation → Human Support
Escalate (and share the contact) for: payment issues, refund requests, account/login recovery, technical bugs, legal questions, or anything not in the knowledge base.
Configured contact:
- WhatsApp: ${contact.call} (message: "${contact.message}")
- Say: "I'll connect you with our support team." + share WhatsApp.

## Response Style
- Friendly, professional, concise. Use short paragraphs and bullets. Under ~150 words unless the user asks for detail.
- Remember context within this conversation (interests, chosen course/coach, goals) and use it for follow-ups.
- Never expose internal IDs, SQL, or that you queried a database. Refer to the site as "AI Coach Portal".`;

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
