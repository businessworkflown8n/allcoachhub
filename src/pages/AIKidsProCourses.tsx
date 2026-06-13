import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Search, BookOpen, Sparkles, Award, Users, Rocket } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import PriceDisplay from "@/components/shared/PriceDisplay";

const TARGET_CLASSES = ["All", "Class 5-6", "Class 7-8", "Class 9-10", "Class 11-12"];
const LEVELS = ["All", "AI Explorer", "AI Creator", "AI Innovator", "AI Future Leader"];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "AI Kids Pro Courses",
  description: "AI Kids Pro — Future Skills Program for Class 5–12 students. Live classes, projects, and certificates.",
  url: "https://www.aicoachportal.com/courses/ai-kids-pro",
};

const AIKidsProCourses = () => {
  useSEO({
    title: "AI Kids Pro — Future Skills for Class 5–12 | AI Coach Portal",
    description: "Browse AI Kids Pro courses for students Class 5–12. Live classes, hands-on projects, certificates, and parent-friendly safety standards.",
    canonical: "https://www.aicoachportal.com/courses/ai-kids-pro",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const targetClass = searchParams.get("class") || "All";
  const level = searchParams.get("level") || "All";
  const q = searchParams.get("q") || "";

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const filters: Record<string, any> = {
        is_published: true,
        approval_status: "approved",
        course_type: "ai_kids_pro",
      };
      if (targetClass !== "All") filters.target_class = targetClass;
      if (level !== "All") filters.level = level;
      const { data } = await (supabase.from("courses") as any)
        .select("*")
        .match(filters)
        .order("created_at", { ascending: false });
      setCourses((data as any[]) || []);
      setLoading(false);
    };
    run();
  }, [targetClass, level]);

  const filtered = useMemo(() => {
    if (!q) return courses;
    return courses.filter((c) =>
      c.title?.toLowerCase().includes(q.toLowerCase()) ||
      c.description?.toLowerCase().includes(q.toLowerCase())
    );
  }, [courses, q]);

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (!value || value === "All") p.delete(key);
    else p.set(key, value);
    setSearchParams(p);
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Future Skills Academy · Class 5–12
              </div>
              <h1 className="mb-3 bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text font-display text-4xl font-bold leading-tight text-transparent md:text-5xl">
                🚀 AI Kids Pro
              </h1>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                Learn AI. Build Projects. Create the Future. Hands-on, parent-friendly courses
                designed for students from Class 5 through Class 12.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {["Kids Friendly", "Project Based", "Live Classes", "Certificate Included"].map((b) => (
                  <span key={b} className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-foreground">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12 lg:flex-row lg:px-12">
          {/* Sidebar Filters */}
          <aside className="w-full flex-shrink-0 lg:w-64">
            <div className="sticky top-24 space-y-8">
              <div>
                <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Target Class</h3>
                <ul className="space-y-2">
                  {TARGET_CLASSES.map((c) => {
                    const active = targetClass === c;
                    return (
                      <li key={c}>
                        <button
                          onClick={() => updateParam("class", c)}
                          className={`flex w-full items-center justify-between text-left text-sm transition-colors ${active ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {c}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Level</h3>
                <ul className="space-y-2">
                  {LEVELS.map((l) => {
                    const active = level === l;
                    return (
                      <li key={l}>
                        <button
                          onClick={() => updateParam("level", l)}
                          className={`flex w-full items-center justify-between text-left text-sm transition-colors ${active ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {l}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Search</h3>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search Kids courses…"
                    value={q}
                    onChange={(e) => updateParam("q", e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <Link to="/ai-kids/enrollment" className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:brightness-110">
                  Enroll Your Child
                </Link>
              </div>
            </div>
          </aside>

          {/* Main grid */}
          <section className="flex-1">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <nav className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Link to="/" className="hover:text-foreground">Home</Link>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <Link to="/courses" className="hover:text-foreground">Courses</Link>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-primary">AI Kids Pro</span>
                </nav>
                <h2 className="font-display text-3xl font-bold text-foreground">AI Kids Pro Courses</h2>
                <p className="mt-2 text-sm text-muted-foreground">{filtered.length} course{filtered.length !== 1 ? "s" : ""} available</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card/40 py-24 text-center">
                <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">No AI Kids Pro courses available yet. Check back soon!</p>
                <Link to="/ai-kids/enrollment" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110">
                  Enroll Your Child
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((course, index) => {
                  const c: any = course;
                  return (
                    <Link
                      to={`/course/${c.slug || c.id}`}
                      key={c.id}
                      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50"
                    >
                      <CourseThumbnail src={c.thumbnail_url} alt={c.title} title={c.title} priority={index < 3} imgClassName="group-hover:scale-105" />
                      <div className="flex h-full flex-col p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">AI Kids Pro</span>
                          {c.target_class && (
                            <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-400">{c.target_class}</span>
                          )}
                          {c.kids_friendly_badge && (
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Kids Friendly</span>
                          )}
                          {c.certificate_included && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                              <Award className="h-3 w-3" /> Certificate
                            </span>
                          )}
                        </div>
                        <h3 className="mb-3 line-clamp-2 font-display text-lg font-bold leading-snug text-foreground">{c.title}</h3>
                        <div className="mt-auto">
                          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {Number(c.duration_hours) > 0 && (
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Number(c.duration_hours)} hours</span>
                            )}
                            {Number(c.live_sessions) > 0 && (
                              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {Number(c.live_sessions)} live</span>
                            )}
                            {Number(c.project_count) > 0 && (
                              <span className="flex items-center gap-1"><Rocket className="h-3.5 w-3.5" /> {Number(c.project_count)} projects</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between border-t border-border/70 pt-4">
                            <PriceDisplay
                              priceInr={c.price_inr}
                              priceUsd={c.price_usd}
                              originalPriceInr={c.original_price_inr}
                              originalPriceUsd={c.original_price_usd}
                              size="md"
                            />
                            <span className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors group-hover:brightness-110">
                              View Course
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIKidsProCourses;
