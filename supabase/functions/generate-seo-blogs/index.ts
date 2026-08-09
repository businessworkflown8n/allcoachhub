const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAiApiKey, AI_CHAT_URL, mapAiModel, aiAuthHeaders, aiChatCompletions, generateImageDataUrl } from "../_shared/ai.ts";

const AI_URL = AI_CHAT_URL;

const SEO_ARTICLES = [
  {
    slug: 'how-to-learn-ai-in-2026-complete-beginner-guide',
    meta_title: 'How to Learn AI in 2026: Complete Beginner Guide | AI Coach Portal',
    meta_description: 'Learn artificial intelligence from scratch in 2026. Complete roadmap covering AI skills, best tools, career opportunities, and expert-led courses.',
    prompt: `Write a comprehensive 2200-word SEO blog article titled "How to Learn AI in 2026 (Complete Beginner Guide)".

Target keywords: learn AI, AI for beginners, how to learn artificial intelligence, learn AI online

Structure with these H2 sections:
## What is Artificial Intelligence?
## Why Learn AI in 2026?
## AI Skills Roadmap for Beginners
## Best AI Tools to Learn First
## Top AI Career Opportunities
## How to Choose the Right AI Course
## Step-by-Step Plan to Learn AI
## Frequently Asked Questions

Requirements:
- Use bullet lists extensively
- Include internal links as markdown: [Explore AI Courses](/courses), [Join as AI Coach](/auth?mode=signup), [Browse AI Blogs](/ai-blogs)
- Each H2 section should have 200-300 words
- FAQ section with 5 questions and answers
- End with a strong CTA paragraph linking to /courses
- Mention AICoachPortal.com as the platform
- Use natural keyword placement, not stuffing
- Write in an authoritative yet accessible tone`,
    category: 'AI Trends',
    image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop',
  },
  {
    slug: 'best-ai-tools-everyone-should-learn-2026',
    meta_title: 'Best AI Tools Everyone Should Learn in 2026 | AI Coach Portal',
    meta_description: 'Discover the top AI tools for 2026 including ChatGPT, Gemini, Claude, Midjourney, and more. Learn how to use them through expert AI coaches.',
    prompt: `Write a comprehensive 2200-word SEO blog article titled "Best AI Tools Everyone Should Learn in 2026".

Target keywords: best AI tools, AI tools list, AI productivity tools, top AI tools 2026

Structure with these H2 sections:
## Why AI Tools Matter in 2026
## Best AI Chatbots and Assistants
Cover: ChatGPT, Claude, Gemini, Perplexity
## Best AI Image and Video Tools
Cover: Midjourney, Runway, DALL-E, Sora
## Best AI Coding Tools
Cover: GitHub Copilot, Cursor, Replit
## Best AI Productivity Tools
## Best AI Writing Tools
## How to Learn These AI Tools
## Frequently Asked Questions

Requirements:
- Use bullet lists for each tool with brief descriptions
- Include internal links: [Learn from AI Coaches](/courses), [Start Learning AI](/auth?mode=signup), [Read More AI Articles](/ai-blogs)
- FAQ section with 5 questions
- End with CTA to learn these tools through expert coaches on AICoachPortal
- Mention specific use cases for each tool`,
    category: 'AI Tools',
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
  },
  {
    slug: 'how-to-become-ai-coach-earn-money-online',
    meta_title: 'How to Become an AI Coach and Earn Money Online in 2026 | AI Coach Portal',
    meta_description: 'Learn how to become an AI coach, create AI courses, and earn money teaching artificial intelligence online. Step-by-step guide for aspiring AI educators.',
    prompt: `Write a comprehensive 2200-word SEO blog article titled "How to Become an AI Coach and Earn Money Online".

Target keywords: AI coach, teach AI online, earn money teaching AI, sell AI courses, become AI instructor

Structure with these H2 sections:
## The Growing Demand for AI Coaches
## What Does an AI Coach Do?
## Skills You Need to Become an AI Coach
## How to Create Your First AI Course
## Platforms to Sell AI Training
## How Much Can AI Coaches Earn?
## Marketing Your AI Coaching Business
## Step-by-Step Guide to Getting Started
## Frequently Asked Questions

Requirements:
- Emphasize earning potential with realistic figures
- Include internal links: [Become a Coach on AICoachPortal](/auth?mode=signup), [See Our Coaches](/), [Upload Your AI Course](/coach/courses)
- FAQ section with 5 questions
- Strong CTA to join as AI Coach on AICoachPortal
- Mention AICoachPortal as the recommended platform`,
    category: 'AI Trends',
    image_url: 'https://images.unsplash.com/photo-1531746790095-e5981e8e4993?w=1200&h=630&fit=crop',
  },
  {
    slug: 'top-ai-skills-in-demand-2026',
    meta_title: 'Top AI Skills That Will Be in Demand in 2026 | AI Coach Portal',
    meta_description: 'Discover the most in-demand AI skills for 2026: prompt engineering, AI automation, machine learning, generative AI, and more. Start learning today.',
    prompt: `Write a comprehensive 2200-word SEO blog article titled "Top AI Skills That Will Be in Demand in 2026".

Target keywords: AI skills, AI jobs, AI career, in-demand AI skills 2026, AI skills to learn

Structure with these H2 sections:
## Why AI Skills Are the Future of Work
## Prompt Engineering
## AI Automation and Workflow Design
## Machine Learning Basics
## Generative AI and Creative AI
## Natural Language Processing (NLP)
## Computer Vision
## AI Ethics and Governance
## Data Science for AI
## How to Start Learning These Skills
## Frequently Asked Questions

Requirements:
- For each skill, explain what it is, why it matters, salary range
- Use bullet lists for key points
- Include internal links: [Start Learning AI Skills](/courses), [Find AI Coaches](/), [Explore AI Tools](/ai-blogs)
- FAQ section with 5 questions
- CTA linking to /courses`,
    category: 'AI Careers',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=630&fit=crop',
  },
  {
    slug: 'best-ai-courses-learn-artificial-intelligence-online',
    meta_title: 'Best AI Courses to Learn Artificial Intelligence Online in 2026 | AI Coach Portal',
    meta_description: 'Find the best AI courses online for beginners, intermediate, and advanced learners. Compare top AI training programs and start your AI career today.',
    prompt: `Write a comprehensive 2200-word SEO blog article titled "Best AI Courses to Learn Artificial Intelligence Online".

Target keywords: AI courses, best AI course online, artificial intelligence course, learn AI online, AI training

Structure with these H2 sections:
## Why Take an AI Course in 2026?
## Best AI Courses for Beginners
## Best Intermediate AI Training Programs
## Advanced AI Specialization Courses
## How to Choose the Right AI Course
## What to Look for in an AI Instructor
## Free vs Paid AI Courses
## How AICoachPortal Helps You Learn AI
## Frequently Asked Questions

Requirements:
- Compare different learning approaches
- Include internal links: [Browse All AI Courses](/courses), [Join as a Learner](/auth?mode=signup), [Meet Our AI Coaches](/)
- FAQ section with 5 questions
- Promote AICoachPortal as a top platform for personalized AI learning
- Strong CTA to explore courses`,
    category: 'AI in Education',
    image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=630&fit=crop',
  },
  {
    slug: 'how-ai-is-changing-jobs-and-careers',
    meta_title: 'How AI Is Changing Jobs and Careers in 2026 | AI Coach Portal',
    meta_description: 'Explore how artificial intelligence is transforming jobs, creating new career paths, and why learning AI is essential to future-proof your career in 2026.',
    prompt: `Write a comprehensive 2200-word SEO blog article titled "How AI Is Changing Jobs and Careers".

Target keywords: AI future jobs, AI impact on jobs, AI career growth, AI replacing jobs, future of work AI

Structure with these H2 sections:
## The AI Revolution in the Workplace
## Jobs Most Affected by AI
## New Careers Created by AI
## Industries Transformed by AI
## How to Future-Proof Your Career
## AI Skills Every Professional Needs
## The Rise of AI Coaches and Trainers
## How to Start Your AI Career Transition
## Frequently Asked Questions

Requirements:
- Include statistics and projections about AI job market
- Use bullet lists for job categories
- Include internal links: [Start Learning AI Today](/courses), [Become an AI Coach](/auth?mode=signup), [Read More AI Insights](/ai-blogs)
- FAQ section with 5 questions
- CTA: Future-proof your career by learning AI on AICoachPortal`,
    category: 'AI Careers',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
  },
];

// Auto-generation topic pool for weekly cron
const AUTO_TOPIC_CATEGORIES = [
  { category: 'AI Trends', keywords: ['AI trends', 'artificial intelligence trends', 'AI innovations'] },
  { category: 'AI Tools', keywords: ['AI tools', 'AI software', 'AI applications'] },
  { category: 'AI Careers', keywords: ['AI jobs', 'AI career', 'AI salary'] },
  { category: 'AI in Education', keywords: ['AI learning', 'AI courses', 'AI training'] },
  { category: 'Prompt Engineering', keywords: ['prompt engineering', 'AI prompts', 'ChatGPT prompts'] },
  { category: 'AI Automation', keywords: ['AI automation', 'AI workflow', 'AI productivity'] },
];

const UNSPLASH_IMAGES = [
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop',
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=630&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=630&fit=crop',
  'https://images.unsplash.com/photo-1531746790095-e5981e8e4993?w=1200&h=630&fit=crop',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop',
  'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=1200&h=630&fit=crop',
];

async function generateAutoTopics(supabase: any, apiKey: string, count: number): Promise<number> {
  // Get existing blog titles to avoid duplicates
  const { data: existingBlogs } = await supabase
    .from('ai_blogs')
    .select('title, slug')
    .order('created_at', { ascending: false })
    .limit(50);

  const existingTitles = (existingBlogs || []).map((b: any) => b.title).join('\n- ');

  const topicResponse = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO strategist for an AI education platform called AICoachPortal. Generate unique blog topic ideas that target high-intent search keywords. Respond ONLY with a JSON array.',
        },
        {
          role: 'user',
          content: `Generate exactly ${count} unique SEO blog article topics about AI, AI learning, AI tools, AI careers, prompt engineering, or AI automation.

These titles already exist, DO NOT repeat them:
- ${existingTitles}

For each topic, return a JSON array with objects containing:
- "title": SEO-optimized title (include year 2026 where relevant)
- "meta_title": Title with "| AI Coach Portal" suffix, under 60 chars
- "meta_description": Under 160 chars, compelling description with target keyword
- "category": One of: "AI Trends", "AI Tools", "AI Careers", "AI in Education", "Prompt Engineering", "AI Automation"
- "target_keywords": comma-separated list of 3-5 target keywords

Return ONLY the JSON array, no other text.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    }),
  });

  if (!topicResponse.ok) {
    console.error('Failed to generate topics:', await topicResponse.text());
    return 0;
  }

  const topicData = await topicResponse.json();
  let topicsRaw = topicData.choices?.[0]?.message?.content || '';
  topicsRaw = topicsRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  let topics: any[];
  try {
    topics = JSON.parse(topicsRaw);
  } catch {
    console.error('Failed to parse topics JSON:', topicsRaw);
    return 0;
  }

  let generated = 0;

  for (const topic of topics) {
    try {
      console.log(`Auto-generating: ${topic.title}`);

      const articleResponse = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO content writer for AICoachPortal.com, an AI education platform. Write directly in markdown. Minimum 2000 words. Do NOT wrap in JSON.',
            },
            {
              role: 'user',
              content: `Write a comprehensive 2200-word SEO blog article titled "${topic.title}".

Target keywords: ${topic.target_keywords}

Requirements:
- Start with an H1 title
- Use H2 and H3 headings for clear structure (at least 6 H2 sections)
- Use bullet lists extensively
- Include a FAQ section with 5 questions and detailed answers
- Include internal links as markdown throughout:
  - [Explore AI Courses](/courses)
  - [Join as AI Coach](/auth?mode=signup)
  - [Browse AI Blogs](/ai-blogs)
  - [Start Learning AI](/courses)
  - [Meet Our Coaches](/)
- End with a strong CTA paragraph encouraging readers to learn AI on AICoachPortal
- Mention AICoachPortal.com naturally 2-3 times
- Write in an authoritative yet accessible tone
- Include statistics and data points where relevant
- Each H2 section should have 200-300 words`,
            },
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      if (!articleResponse.ok) {
        console.error(`AI error for ${topic.title}: ${await articleResponse.text()}`);
        continue;
      }

      const articleData = await articleResponse.json();
      let content = articleData.choices?.[0]?.message?.content || '';
      content = content.replace(/^```markdown\n?/g, '').replace(/```$/g, '').trim();

      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : topic.title;
      const wordCount = content.split(/\s+/).length;
      const readTime = `${Math.ceil(wordCount / 200)} min read`;
      const imageUrl = UNSPLASH_IMAGES[Math.floor(Math.random() * UNSPLASH_IMAGES.length)];

      const { error: insertError } = await supabase.from('ai_blogs').insert({
        title,
        excerpt: topic.meta_description,
        content,
        category: topic.category,
        read_time: readTime,
        image_url: imageUrl,
        is_published: true,
        published_at: new Date().toISOString(),
        blog_type: 'article',
        meta_title: topic.meta_title,
        meta_description: topic.meta_description,
        author: 'AI Coach Portal',
      });

      if (insertError) {
        console.error(`DB error for ${topic.title}: ${insertError.message}`);
      } else {
        generated++;
        console.log(`Auto-generated: ${title} (${wordCount} words)`);
      }
    } catch (err) {
      console.error(`Error generating ${topic.title}:`, err);
    }
  }

  return generated;
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


    let body: any = {};
    try { body = await req.json(); } catch {}
    
    const mode = body.mode ?? 'seed'; // 'seed' for predefined articles, 'auto' for AI-generated topics
    const count = body.count ?? 3; // number of articles for auto mode

    if (mode === 'auto') {
      const generated = await generateAutoTopics(supabase, AI_API_KEY, count);
      return new Response(JSON.stringify({ success: true, mode: 'auto', generated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Seed mode - generate predefined articles
    const articleIndex = body.index ?? -1;
    const articles = articleIndex >= 0 ? [SEO_ARTICLES[articleIndex]] : SEO_ARTICLES;
    
    let generated = 0;

    for (const article of articles) {
      if (!article) continue;

      const { data: existing } = await supabase
        .from('ai_blogs')
        .select('id')
        .eq('slug', article.slug)
        .maybeSingle();

      if (existing) {
        console.log(`Skipping ${article.slug} - already exists`);
        continue;
      }

      console.log(`Generating: ${article.slug}`);

      const response = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert SEO content writer. Write the article directly in markdown format. Do NOT wrap in JSON. Write naturally and comprehensively. Minimum 2000 words.' },
            { role: 'user', content: article.prompt },
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`AI error for ${article.slug}: ${err}`);
        continue;
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      content = content.replace(/^```markdown\n?/g, '').replace(/```$/g, '').trim();

      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : article.meta_title.split('|')[0].trim();
      const wordCount = content.split(/\s+/).length;
      const readTime = `${Math.ceil(wordCount / 200)} min read`;

      const { error: insertError } = await supabase.from('ai_blogs').insert({
        title,
        excerpt: article.meta_description,
        content,
        category: article.category,
        read_time: readTime,
        image_url: article.image_url,
        is_published: true,
        published_at: new Date().toISOString(),
        blog_type: 'article',
        slug: article.slug,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        author: 'AI Coach Portal',
      });

      if (insertError) {
        console.error(`DB error for ${article.slug}: ${insertError.message}`);
      } else {
        generated++;
        console.log(`Generated ${article.slug} (${wordCount} words)`);
      }
    }

    return new Response(JSON.stringify({ success: true, mode: 'seed', generated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
