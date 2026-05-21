import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { useCurrency } from "@/hooks/useCurrency";
import { trackEvent } from "@/lib/analytics";
import { PREDEFINED_CATEGORIES } from "@/lib/categories";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CategoryHero from "@/components/category/CategoryHero";
import CategoryFilters from "@/components/category/CategoryFilters";
import CategoryCourseGrid from "@/components/category/CategoryCourseGrid";
import CategorySEOSection from "@/components/category/CategorySEOSection";
import CategoryRelated from "@/components/category/CategoryRelated";

export const categoryMap: Record<string, { name: string; emoji: string; slug: string; description: string; seoText: string }> = {
  "prompt-engineering": {
    name: "Prompt Engineering", emoji: "✨", slug: "prompt-engineering",
    description: "Master the art of crafting effective prompts for ChatGPT, Claude, and other AI models.",
    seoText: "Prompt Engineering is one of the most in-demand AI skills today. Our expert-led Prompt Engineering courses teach you how to craft precise, effective prompts for large language models like ChatGPT, Claude, and Gemini. Whether you're a beginner looking to understand the fundamentals or an advanced practitioner seeking to master complex prompt patterns, chain-of-thought reasoning, and few-shot learning techniques, our courses cover it all. Learn prompt engineering online with real-world projects, hands-on exercises, and certification.",
  },
  "ai-agents": {
    name: "AI Agents", emoji: "🤖", slug: "ai-agents",
    description: "Build autonomous AI agents that can reason, plan, and execute complex tasks.",
    seoText: "AI Agents represent the next frontier of artificial intelligence — autonomous systems that can reason, plan, and execute multi-step tasks independently. Our AI Agents courses guide you through building intelligent agents using frameworks like LangChain, AutoGPT, and CrewAI.",
  },
  "llms-fine-tuning": {
    name: "LLMs & Fine-tuning", emoji: "🧠", slug: "llms-fine-tuning",
    description: "Understand and fine-tune large language models for custom use cases.",
    seoText: "Large Language Models (LLMs) are the foundation of modern AI applications. Our LLM and Fine-tuning courses teach you how these models work under the hood — from transformer architectures and attention mechanisms to tokenization and training pipelines.",
  },
  "ai-automation": {
    name: "AI Automation", emoji: "⚡", slug: "ai-automation",
    description: "Automate workflows and processes using AI tools and platforms.",
    seoText: "AI Automation is transforming how businesses operate by eliminating repetitive tasks and streamlining complex workflows. Our AI Automation courses teach you to build intelligent automation systems using tools like Zapier, Make, n8n, and custom AI pipelines.",
  },
  "no-code-ai": {
    name: "No-Code AI", emoji: "🔧", slug: "no-code-ai",
    description: "Build AI-powered applications without writing a single line of code.",
    seoText: "No-Code AI tools are democratizing artificial intelligence, enabling anyone to build powerful AI applications without programming knowledge. Our No-Code AI courses teach you to create chatbots, image generators, data analyzers, and custom AI workflows using visual platforms.",
  },
  "ai-marketing": {
    name: "AI for Marketing", emoji: "📈", slug: "ai-marketing",
    description: "Leverage AI for content creation, SEO, advertising, and marketing automation.",
    seoText: "AI is revolutionizing digital marketing, offering unprecedented capabilities in content creation, SEO optimization, advertising, and customer engagement. Our AI for Marketing courses teach you to leverage cutting-edge AI tools for copywriting, social media management, and analytics.",
  },
  "generative-ai-for-developers": {
    name: "Gen AI for Devs", emoji: "💻", slug: "generative-ai-for-developers",
    description: "Integrate generative AI into software applications with OpenAI, LangChain, and more.",
    seoText: "Generative AI is reshaping software development, and developers who master these technologies are in high demand. Our Gen AI for Developers courses teach you to build AI-powered applications using OpenAI APIs, LangChain, vector databases, and modern AI frameworks.",
  },
  "ai-business": {
    name: "AI for Business", emoji: "🏢", slug: "ai-business",
    description: "Implement AI strategy and transformation in your organization.",
    seoText: "AI adoption is no longer optional for businesses that want to remain competitive. Our AI for Business courses provide executives, managers, and business leaders with the knowledge to drive AI transformation in their organizations.",
  },
  "others": {
    name: "Others", emoji: "📦", slug: "others",
    description: "Explore unique AI courses that don't fit traditional categories — from niche specializations to emerging fields.",
    seoText: "Discover courses in emerging and niche AI fields created by expert coaches. These specialized courses cover topics like AI in healthcare, AI ethics, computer vision, robotics, and more. Explore unique learning paths tailored to specific industries and use cases.",
  },
};

const CategoryPage = () => {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const slug = paramSlug || location.pathname.replace("/", "");
  const cat = categoryMap[slug || ""];
  const { symbol, priceKey, originalPriceKey } = useCurrency();

  const [courses, setCourses] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<Record<string, any>>({});
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [levelFilter, setLevelFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState("All");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  useSEO({
    title: cat ? `${cat.name} Courses | AI Coach Portal` : "Category – AI Coach Portal",
    description: cat ? `Explore ${cat.name} courses created by expert coaches. Learn and master skills with real-world applications.` : "Browse AI courses by category.",
    canonical: `https://www.aicoachportal.com/courses/${slug}`,
    ogTitle: cat ? `${cat.name} Courses | AI Coach Portal` : undefined,
    ogDescription: cat ? `Explore ${cat.name} courses created by expert coaches.` : undefined,
  });

  useEffect(() => {
    if (!cat) { setLoading(false); return; }
    trackEvent("category_page_view", { category: cat.name });

    const fetchData = async () => {
      setLoading(true);

      let list: any[] = [];

      if (slug === "others") {
        // Fetch courses NOT in any predefined category
        const predefinedNames = PREDEFINED_CATEGORIES.filter((c) => c.name !== "Others").map((c) => c.name);
        const { data } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false });
        list = (data || []).filter((c) => !predefinedNames.includes(c.category));
      } else {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .eq("approval_status", "approved")
          .eq("category", cat.name)
          .order("created_at", { ascending: false });
        list = data || [];
      }

      setCourses(list);

      const coachIds = [...new Set(list.map((c) => c.coach_id))];
      if (coachIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, slug, avatar_url")
          .in("user_id", coachIds);
        const map: Record<string, any> = {};
        (profiles || []).forEach((p) => { map[p.user_id] = p; });
        setCoaches(map);
      }

      if (list.length > 0) {
        const counts: Record<string, number> = {};
        for (const course of list.slice(0, 30)) {
          const { count } = await supabase
            .from("enrollments")
            .select("id", { count: "exact", head: true })
            .eq("course_id", course.id);
          counts[course.id] = count || 0;
        }
        setEnrollCounts(counts);
      }

      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const availableLanguages = useMemo(() => {
    const langs = new Set(courses.map((c) => c.language));
    return ["All", ...Array.from(langs)];
  }, [courses]);

  const displayCourses = useMemo(() => {
    let filtered = [...courses];
    if (levelFilter !== "All") filtered = filtered.filter((c) => c.level === levelFilter);
    if (priceFilter === "Free") filtered = filtered.filter((c) => Number(c[priceKey] || c.price_usd) === 0);
    if (priceFilter === "Paid") filtered = filtered.filter((c) => Number(c[priceKey] || c.price_usd) > 0);
    if (languageFilter !== "All") filtered = filtered.filter((c) => c.language === languageFilter);
    if (sortBy === "newest") filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === "popularity") filtered.sort((a, b) => (enrollCounts[b.id] || 0) - (enrollCounts[a.id] || 0));
    if (sortBy === "price-low") filtered.sort((a, b) => Number(a[priceKey] || a.price_usd) - Number(b[priceKey] || b.price_usd));
    if (sortBy === "price-high") filtered.sort((a, b) => Number(b[priceKey] || b.price_usd) - Number(a[priceKey] || a.price_usd));
    return filtered;
  }, [courses, levelFilter, priceFilter, languageFilter, sortBy, enrollCounts, priceKey]);

  const trendingCourses = useMemo(() => {
    return [...courses].sort((a, b) => (enrollCounts[b.id] || 0) - (enrollCounts[a.id] || 0)).slice(0, 4);
  }, [courses, enrollCounts]);

  if (!cat) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background px-4">
          <h1 className="text-3xl font-bold text-foreground">Category Not Found</h1>
          <p className="text-muted-foreground">This category doesn't exist.</p>
          <Link to="/courses" className="text-primary hover:underline">Browse all courses →</Link>
        </div>
        <Footer />
      </>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cat.name} Courses`,
    description: cat.description,
    url: `https://www.aicoachportal.com/courses/${slug}`,
    itemListElement: displayCourses.slice(0, 10).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: c.title,
        url: `https://www.aicoachportal.com/course/${c.slug}`,
        provider: { "@type": "Person", name: coaches[c.coach_id]?.full_name || "Expert Coach" },
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.aicoachportal.com/" },
      { "@type": "ListItem", position: 2, name: "Courses", item: "https://www.aicoachportal.com/courses" },
      { "@type": "ListItem", position: 3, name: cat.name, item: `https://www.aicoachportal.com/courses/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Navbar />
      <main className="pt-16">
        <CategoryHero cat={cat} slug={slug || ""} totalCourses={courses.length} loading={loading} />
        <CategoryFilters
          levelFilter={levelFilter} setLevelFilter={setLevelFilter}
          priceFilter={priceFilter} setPriceFilter={setPriceFilter}
          languageFilter={languageFilter} setLanguageFilter={setLanguageFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          availableLanguages={availableLanguages} resultCount={displayCourses.length}
        />
        <CategoryCourseGrid
          courses={displayCourses} coaches={coaches} enrollCounts={enrollCounts}
          loading={loading} symbol={symbol} priceKey={priceKey} originalPriceKey={originalPriceKey}
          categoryName={cat.name} trendingCourses={trendingCourses} isOthers={slug === "others"}
        />
        <CategoryRelated currentSlug={slug || ""} />
        <CategorySEOSection cat={cat} />
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
