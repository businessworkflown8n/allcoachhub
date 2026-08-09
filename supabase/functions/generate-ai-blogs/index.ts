const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const AI_URL = AI_CHAT_URL;

// Topic-specific image mapping
const TOPIC_IMAGES: Record<string, string> = {
  quantum: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop',
  gpt: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
  llm: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
  agi: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=400&fit=crop',
  regulat: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop',
  policy: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop',
  governance: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop',
  health: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
  medicine: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
  drug: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
  education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop',
  learning: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop',
  tool: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
  business: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
  agent: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',
  robot: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',
  autonom: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',
  writing: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=400&fit=crop',
  content: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=400&fit=crop',
  ethic: 'https://images.unsplash.com/photo-1589578228447-e1a4e481c6c8?w=600&h=400&fit=crop',
  vision: 'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=600&h=400&fit=crop',
  nlp: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop',
  chip: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
  hardware: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
  cyber: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop',
  security: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop',
  climate: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=600&h=400&fit=crop',
  energy: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=600&h=400&fit=crop',
  open_source: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
  startup: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop',
};

const COMPANY_IMAGES: Record<string, string> = {
  google: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=600&h=400&fit=crop',
  microsoft: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=600&h=400&fit=crop',
  amazon: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=600&h=400&fit=crop',
  meta: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&h=400&fit=crop',
  apple: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop',
  flipkart: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
  razorpay: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop',
  swiggy: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&h=400&fit=crop',
  zomato: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&h=400&fit=crop',
  infosys: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
  tcs: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
  wipro: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1531746790095-e5981e8e4993?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',
];

function getImageForTitle(title: string, company?: string): string {
  const lower = title.toLowerCase();
  // Check company first for jobs
  if (company) {
    const companyLower = company.toLowerCase();
    for (const [key, url] of Object.entries(COMPANY_IMAGES)) {
      if (companyLower.includes(key)) return url;
    }
  }
  // Check topic keywords
  for (const [key, url] of Object.entries(TOPIC_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  // Random default based on title hash
  const hash = lower.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return DEFAULT_IMAGES[hash % DEFAULT_IMAGES.length];
}

function safeJsonParse(raw: string): any {
  let content = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(content); } catch {}
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(content.substring(start, end + 1)); } catch {}
  }
  try {
    const fixed = content.substring(start, end + 1)
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\t/g, ' ');
    return JSON.parse(fixed);
  } catch (e) {
    console.error('JSON parse failed, raw preview:', content.substring(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }
}

async function callAI(apiKey: string, messages: { role: string; content: string }[]): Promise<any> {
  const response = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gemini-2.5-flash', messages, temperature: 0.7 }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI failed [${response.status}]: ${err}`);
  }
  const data = await response.json();
  return safeJsonParse(data.choices?.[0]?.message?.content || '{}');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const AI_API_KEY = getAiApiKey();
    if (!AI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Allow CRON_SECRET (scheduled jobs) or admin JWT
    const cronSecret = Deno.env.get('CRON_SECRET');
    const provided = req.headers.get('x-cron-secret');
    const isCron = !!cronSecret && provided === cronSecret;
    if (!isCron) {
      const authHeader = req.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: u } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      const uid = u?.user?.id;
      if (!uid) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').maybeSingle();
      if (!roleRow) return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const today = new Date().toISOString().split('T')[0];
    let body: any = {};
    try { body = await req.json(); } catch {}
    const type = body.type || 'trends';
    const allInserts: any[] = [];

    if (type === 'trends') {
      const parsed = await callAI(AI_API_KEY, [
        { role: 'system', content: 'Respond ONLY with a JSON object. No other text.' },
        { role: 'user', content: `Date: ${today}. Return 3 trending AI articles as JSON: {"articles":[{"title":"...","excerpt":"...","content":"...","read_time":"5 min read"}]}. Content should be 300+ words markdown. Topics: latest AI news, breakthroughs, industry updates.` },
      ]);
      for (const p of (parsed.articles || [])) {
        allInserts.push({ title: p.title, excerpt: p.excerpt, content: p.content, category: 'AI Trends', read_time: p.read_time || '5 min read', image_url: getImageForTitle(p.title), is_published: true, published_at: new Date().toISOString(), blog_type: 'article' });
      }
    }

    if (type === 'jobs') {
      const parsed = await callAI(AI_API_KEY, [
        { role: 'system', content: 'You output ONLY valid JSON. No extra text. Keep descriptions under 80 words. Do not use special unicode characters.' },
        { role: 'user', content: `Date: ${today}. Generate 6 AI job listings as JSON:
{"jobs":[{"title":"ML Engineer","company":"Google","location":"Bangalore","salary":"25-40 LPA INR","source":"Naukri.com","job_type":"Full-time","exp":"3-5 years","skills":["Python","PyTorch"],"desc":"Short job description"}]}

Rules: 2 from Naukri.com (Indian cos, INR), 2 from Google Jobs (USD), 2 from LinkedIn. Use real companies.` },
      ]);
      for (const j of (parsed.jobs || [])) {
        allInserts.push({
          title: `${j.title} at ${j.company}`, excerpt: `${j.location} · ${j.salary} · ${j.exp} exp · ${j.source}`,
          content: j.desc, category: 'AI Careers', read_time: '2 min read',
          image_url: getImageForTitle(j.title, j.company),
          is_published: true, published_at: new Date().toISOString(), blog_type: 'job',
          job_data: { company: j.company, location: j.location, salary_range: j.salary, source: j.source, job_type: j.job_type, experience: j.exp, skills: j.skills, apply_url: j.source === 'Naukri.com' ? 'https://www.naukri.com' : j.source === 'LinkedIn' ? 'https://www.linkedin.com/jobs' : 'https://www.google.com/search?q=jobs' },
        });
      }
    }

    if (type === 'other') {
      const parsed = await callAI(AI_API_KEY, [
        { role: 'system', content: 'Respond ONLY with JSON. No extra text.' },
        { role: 'user', content: `Date: ${today}. Generate 3 articles as JSON: {"articles":[{"title":"...","excerpt":"...","content":"300 word markdown","category":"AI Tools","read_time":"5 min read"}]}. Categories: one "AI Tools", one "AI in Education", one "AI Research".` },
      ]);
      for (const p of (parsed.articles || [])) {
        allInserts.push({ title: p.title, excerpt: p.excerpt, content: p.content, category: p.category, read_time: p.read_time || '5 min read', image_url: getImageForTitle(p.title), is_published: true, published_at: new Date().toISOString(), blog_type: 'article' });
      }
    }

    if (allInserts.length > 0) {
      const { error } = await supabase.from('ai_blogs').insert(allInserts);
      if (error) throw new Error(`DB insert: ${error.message}`);
    }
    console.log(`Generated ${allInserts.length} (${type})`);
    return new Response(JSON.stringify({ success: true, count: allInserts.length, type }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
