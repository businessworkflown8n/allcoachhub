import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Star, Users, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
}

interface Coach {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  category: string | null;
  category_id: string | null;
  slug: string | null;
  bio: string | null;
  courseCount: number;
  avgRating: number;
  reviewCount: number;
}

const INITIAL_PER_CATEGORY = 6;

const getInitials = (name: string | null) =>
  (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const CoachCard = ({ coach }: { coach: Coach }) => (
  <div className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
    <div className="flex items-start gap-3">
      <Avatar className="h-14 w-14 border border-border">
        <AvatarImage src={coach.avatar_url || undefined} alt={coach.full_name || "Coach"} loading="lazy" />
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
          {getInitials(coach.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
          {coach.full_name || "Coach"}
        </h4>
        <p className="truncate text-xs text-muted-foreground">
          {coach.job_title || coach.category || "AI Coach"}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="font-medium text-foreground">{coach.avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground">({coach.reviewCount})</span>
        </div>
      </div>
    </div>

    {coach.bio && (
      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{coach.bio}</p>
    )}

    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" />
        <span>{coach.courseCount} {coach.courseCount === 1 ? "course" : "courses"}</span>
      </div>
      <Link
        to={`/coach-profile/${coach.slug || coach.user_id}`}
        className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        View Profile
      </Link>
    </div>
  </div>
);

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [coachesByCat, setCoachesByCat] = useState<Record<string, Coach[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useSEO({
    title: "All Coaching Categories – AI Coach Portal",
    description: "Explore AI coaching categories and meet verified expert coaches. Browse profiles, ratings, courses & more.",
    canonical: "https://www.aicoachportal.com/categories",
  });

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: cats }, { data: profs }, { data: courses }, { data: reviews }, { data: perms }] = await Promise.all([
        supabase
          .from("coach_categories")
          .select("id, name, slug, icon, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("coach_public_profiles")
          .select("user_id, full_name, avatar_url, job_title, category, category_id, slug, bio")
          .eq("is_suspended", false),
        supabase
          .from("courses")
          .select("coach_id")
          .eq("is_published", true)
          .eq("approval_status", "approved"),
        supabase
          .from("reviews")
          .select("coach_id, rating")
          .eq("status", "approved"),
        supabase
          .from("coach_category_permissions")
          .select("coach_id, category_id")
          .eq("status", "approved"),
      ]);

      const courseCounts: Record<string, number> = {};
      (courses || []).forEach((c: any) => {
        courseCounts[c.coach_id] = (courseCounts[c.coach_id] || 0) + 1;
      });

      const ratingAgg: Record<string, { sum: number; count: number }> = {};
      (reviews || []).forEach((r: any) => {
        if (!r.coach_id) return;
        if (!ratingAgg[r.coach_id]) ratingAgg[r.coach_id] = { sum: 0, count: 0 };
        ratingAgg[r.coach_id].sum += Number(r.rating) || 0;
        ratingAgg[r.coach_id].count += 1;
      });

      const enriched: Coach[] = (profs || []).map((p: any) => {
        const agg = ratingAgg[p.user_id];
        return {
          ...p,
          courseCount: courseCounts[p.user_id] || 0,
          avgRating: agg && agg.count > 0 ? agg.sum / agg.count : 5,
          reviewCount: agg?.count || 0,
        };
      });

      const profileById: Record<string, Coach> = {};
      enriched.forEach((c) => { profileById[c.user_id] = c; });

      // Build category -> coaches using BOTH the multi-cat assignment table
      // and the legacy profiles.category_id / category name. De-dupe per category.
      const grouped: Record<string, Coach[]> = {};
      (cats || []).forEach((c: any) => {
        const seen = new Set<string>();
        const list: Coach[] = [];
        const push = (coach?: Coach) => {
          if (!coach || seen.has(coach.user_id)) return;
          seen.add(coach.user_id);
          list.push(coach);
        };
        (perms || [])
          .filter((p: any) => p.category_id === c.id)
          .forEach((p: any) => push(profileById[p.coach_id]));
        enriched
          .filter(
            (e) =>
              e.category_id === c.id ||
              (e.category && e.category.toLowerCase() === c.name.toLowerCase())
          )
          .forEach(push);
        grouped[c.id] = list.sort(
          (a, b) => b.reviewCount - a.reviewCount || b.courseCount - a.courseCount
        );
      });

      setCategories((cats as Category[]) || []);
      setCoachesByCat(grouped);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const totalCoaches = useMemo(() => {
    const set = new Set<string>();
    Object.values(coachesByCat).forEach((list) => list.forEach((c) => set.add(c.user_id)));
    return set.size;
  }, [coachesByCat]);

  const visibleCategories = useMemo(
    () => (activeCat === "all" ? categories : categories.filter((c) => c.id === activeCat)),
    [categories, activeCat]
  );

  const filterCoaches = (list: Coach[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.job_title?.toLowerCase().includes(q) ||
        c.bio?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
              Explore All Coaching Categories
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Browse verified AI coaches by category. Find the right expert to help you level up.
            </p>

            {/* Stats */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">
                  {loading ? "…" : totalCoaches}
                </span>
                <span className="text-muted-foreground">registered coaches</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">
                  {loading ? "…" : categories.length}
                </span>
                <span className="text-muted-foreground">categories</span>
              </div>
            </div>
          </div>

          {/* Search + Category Filter */}
          <div className="sticky top-16 z-30 -mx-4 mb-8 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search coaches by name, expertise, or keyword…"
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:pb-0">
                <button
                  onClick={() => setActiveCat("all")}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCat === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeCat === c.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categories with coaches */}
          {loading ? (
            <div className="space-y-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="mb-4 h-7 w-64" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Skeleton key={j} className="h-40 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              {visibleCategories.map((cat) => {
                const coaches = filterCoaches(coachesByCat[cat.id] || []);
                const isExpanded = !!expanded[cat.id];
                const shown = isExpanded ? coaches : coaches.slice(0, INITIAL_PER_CATEGORY);

                return (
                  <section key={cat.id} id={cat.slug}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{cat.icon || "📂"}</span>
                        <div>
                          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                            {cat.name}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {coaches.length} {coaches.length === 1 ? "coach" : "coaches"}
                            {search && (coachesByCat[cat.id] || []).length !== coaches.length && (
                              <> (of {(coachesByCat[cat.id] || []).length})</>
                            )}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-1">
                          {(coachesByCat[cat.id] || []).length} total
                        </Badge>
                      </div>
                      <Link
                        to={`/categories/${cat.slug}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        View category →
                      </Link>
                    </div>

                    {coaches.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center text-sm text-muted-foreground">
                        {search ? "No coaches match your search in this category." : "No coaches yet in this category."}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {shown.map((coach) => (
                            <CoachCard key={coach.user_id} coach={coach} />
                          ))}
                        </div>

                        {coaches.length > INITIAL_PER_CATEGORY && (
                          <div className="mt-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExpanded((p) => ({ ...p, [cat.id]: !isExpanded }))
                              }
                            >
                              {isExpanded ? (
                                <>Show less <ChevronUp className="ml-1 h-4 w-4" /></>
                              ) : (
                                <>Show all {coaches.length} coaches <ChevronDown className="ml-1 h-4 w-4" /></>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
