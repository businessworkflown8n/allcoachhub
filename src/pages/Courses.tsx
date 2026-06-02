import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Search, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCurrency } from "@/hooks/useCurrency";
import { useSEO } from "@/hooks/useSEO";
import CourseThumbnail from "@/components/shared/CourseThumbnail";

const categories = [
  "All",
  "Prompt Engineering",
  "AI Agents",
  "LLMs & Fine-tuning",
  "AI Automation",
  "No-Code AI",
  "AI for Marketing",
  "Gen AI for Devs",
  "AI for Business",
];

const levels = ["All", "Beginner", "Intermediate", "Advanced"];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "AI Courses",
  description:
    "Browse all AI courses on AI Coach Portal — prompt engineering, AI agents, automation & more.",
  url: "https://www.aicoachportal.com/courses",
};

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
];

const Courses = () => {
  useSEO({
    title: "AI Courses | AI Coach Portal",
    description: "Browse expert-led AI courses in prompt engineering, AI agents, automation, and more. Find the right course to level up your AI skills.",
    canonical: "https://www.aicoachportal.com/courses",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "All";
  const activeLevel = searchParams.get("level") || "All";
  const searchQuery = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "newest";

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { symbol, priceKey, originalPriceKey } = useCurrency();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      let query = supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      if (activeCategory !== "All") query = query.eq("category", activeCategory);
      if (activeLevel !== "All") query = query.eq("level", activeLevel);

      const { data } = await query;
      setCourses(data || []);
      setLoading(false);
    };
    fetchCourses();
  }, [activeCategory, activeLevel]);

  const filtered = useMemo(() => {
    let list = searchQuery
      ? courses.filter(
          (c) =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : courses;
    if (sort === "price_asc") {
      list = [...list].sort(
        (a, b) => Number(a[priceKey] || 0) - Number(b[priceKey] || 0),
      );
    } else if (sort === "price_desc") {
      list = [...list].sort(
        (a, b) => Number(b[priceKey] || 0) - Number(a[priceKey] || 0),
      );
    }
    return list;
  }, [courses, searchQuery, sort, priceKey]);

  // Category counts from full (unfiltered by category) set — recompute against current level
  const [allCounts, setAllCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchCounts = async () => {
      let q = supabase
        .from("courses")
        .select("category", { count: "exact" })
        .eq("is_published", true)
        .eq("approval_status", "approved");
      if (activeLevel !== "All") q = q.eq("level", activeLevel);
      const { data } = await q;
      const counts: Record<string, number> = { All: data?.length || 0 };
      (data || []).forEach((r: any) => {
        counts[r.category] = (counts[r.category] || 0) + 1;
      });
      setAllCounts(counts);
    };
    fetchCounts();
  }, [activeLevel]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "All" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="pt-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12 lg:flex-row lg:px-12">
          {/* Sidebar Filter Rail */}
          <aside className="w-full flex-shrink-0 lg:w-64">
            <div className="sticky top-24 space-y-10">
              <div>
                <h3 className="mb-6 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                  Categories
                </h3>
                <ul className="space-y-4">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat;
                    const count = allCounts[cat] ?? 0;
                    return (
                      <li key={cat}>
                        <button
                          onClick={() => updateParam("category", cat)}
                          className={`group flex w-full items-center justify-between text-left transition-colors ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className={isActive ? "font-medium" : ""}>{cat}</span>
                          {count > 0 && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                isActive
                                  ? "bg-primary/15 text-primary"
                                  : "bg-secondary/60 text-muted-foreground"
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="mb-6 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                  Level
                </h3>
                <div className="space-y-3">
                  {levels.map((lvl) => {
                    const isActive = activeLevel === lvl;
                    return (
                      <label
                        key={lvl}
                        onClick={() => updateParam("level", lvl)}
                        className={`group flex cursor-pointer items-center gap-3 transition-colors ${
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                            isActive
                              ? "border-primary"
                              : "border-border group-hover:border-primary/60"
                          }`}
                        >
                          {isActive && (
                            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                          )}
                        </span>
                        <span className="text-sm">
                          {lvl === "All" ? "All Levels" : lvl}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                  Search
                </h3>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search courses…"
                    value={searchQuery}
                    onChange={(e) => updateParam("q", e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section className="flex-1">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <nav className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Link to="/" className="hover:text-foreground">
                    Home
                  </Link>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>Catalog</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-primary">AI Courses</span>
                </nav>
                <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
                  Master AI Development
                </h1>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                  Expert-led courses in prompt engineering, AI agents, automation & more.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </span>
                <div className="h-4 w-px bg-border" />
                <select
                  value={sort}
                  onChange={(e) => updateParam("sort", e.target.value)}
                  className="cursor-pointer border-none bg-transparent text-sm text-foreground outline-none focus:ring-0"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id} className="bg-background">
                      Sort by: {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card/40 py-24 text-center">
                <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No courses found. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((course) => {
                  const price = Number(course[priceKey] || course.price_usd);
                  const originalPrice = Number(
                    course[originalPriceKey] || course.original_price_usd || 0,
                  );
                  const discount = Number(course.discount_percent || 0);

                  return (
                    <Link
                      to={`/course/${course.slug || course.id}`}
                      key={course.id}
                      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 transition-all duration-300 hover:border-primary/50 hover:-translate-y-0.5"
                    >
                      <CourseThumbnail
                        src={course.thumbnail_url}
                        alt={course.title}
                        priority={index < 3}
                        imgClassName="group-hover:scale-105"
                      />

                      <div className="flex h-full flex-col p-6">
                        <div className="mb-6 flex items-start justify-between">
                          <div className="flex flex-col gap-2">
                            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-primary">
                              {course.category || "AI Course"}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {course.level && (
                                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  {course.level}
                                </span>
                              )}
                              {discount > 0 && (
                                <span className="rounded-md bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-500">
                                  {discount}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <h3 className="mb-4 line-clamp-2 font-display text-xl font-bold leading-snug text-foreground">
                          {course.title}
                        </h3>

                        <div className="mt-auto">
                          <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
                            {Number(course.duration_hours) > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {Number(course.duration_hours)} hours
                              </span>
                            )}
                            {course.language && <span>{course.language}</span>}
                          </div>

                          <div className="flex items-center justify-between border-t border-border/70 pt-6">
                            <div>
                              {originalPrice > price && (
                                <span className="block text-xs text-muted-foreground line-through">
                                  {symbol}
                                  {originalPrice}
                                </span>
                              )}
                              <span className="text-xl font-bold text-foreground">
                                {symbol}
                                {price}
                              </span>
                            </div>
                            <span className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/10 transition-colors group-hover:brightness-110">
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

export default Courses;
