import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { useCurrency } from "@/hooks/useCurrency";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, ArrowRight } from "lucide-react";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CoachWithCourses {
  user_id: string;
  full_name: string;
  slug: string | null;
  avatar_url: string | null;
  bio: string | null;
  category_id: string;
  courses: {
    id: string;
    title: string;
    slug: string | null;
    price_usd: number;
    price_inr: number;
    level: string;
    duration_hours: number;
  }[];
}

interface AllCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
}

const CoachCategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { symbol, priceKey } = useCurrency();

  const [category, setCategory] = useState<CategoryData | null>(null);
  const [allCategories, setAllCategories] = useState<AllCategory[]>([]);
  const [coaches, setCoaches] = useState<CoachWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useSEO({
    title: category ? `${category.name} Coaches – AI Coach Portal` : "Category – AI Coach Portal",
    description: category ? `Find expert ${category.name} coaches. Browse profiles, courses, and pricing.` : "Browse coaches by category.",
    canonical: `https://www.aicoachportal.com/categories/${slug}`,
  });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setNotFound(false);

      // Fetch all active categories for filter pills
      const { data: cats } = await supabase
        .from("coach_categories")
        .select("id, name, slug, icon, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      setAllCategories(cats || []);

      // Find current category
      const currentCat = (cats || []).find((c) => c.slug === slug);
      if (!currentCat) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCategory(currentCat);
      setActiveFilter(currentCat.id);

      // Fetch coaches in this category
      await fetchCoachesByCategory(currentCat.id);
      setLoading(false);
    };
    fetchAll();
  }, [slug]);

  const fetchCoachesByCategory = async (categoryId: string | null) => {
    // 1. Collect coach IDs from BOTH the multi-category assignment table
    //    and the legacy profiles.category_id mapping.
    const coachIdSet = new Set<string>();

    if (categoryId) {
      const [{ data: perms }, { data: legacyProfs }] = await Promise.all([
        supabase
          .from("coach_category_permissions")
          .select("coach_id")
          .eq("status", "approved")
          .eq("category_id", categoryId),
        supabase
          .from("profiles")
          .select("user_id")
          .eq("category_id", categoryId),
      ]);
      (perms || []).forEach((p: any) => coachIdSet.add(p.coach_id));
      (legacyProfs || []).forEach((p: any) => coachIdSet.add(p.user_id));
    } else {
      const [{ data: perms }, { data: legacyProfs }] = await Promise.all([
        supabase
          .from("coach_category_permissions")
          .select("coach_id")
          .eq("status", "approved"),
        supabase
          .from("profiles")
          .select("user_id")
          .not("category_id", "is", null),
      ]);
      (perms || []).forEach((p: any) => coachIdSet.add(p.coach_id));
      (legacyProfs || []).forEach((p: any) => coachIdSet.add(p.user_id));
    }

    if (coachIdSet.size === 0) {
      setCoaches([]);
      return;
    }

    const coachIds = Array.from(coachIdSet);

    // 2. Fetch only approved / non-suspended public profiles for those coaches.
    const { data: profilesData } = await supabase
      .from("coach_public_profiles")
      .select("user_id, full_name, slug, avatar_url, bio, category_id")
      .in("user_id", coachIds)
      .eq("is_suspended", false);

    if (!profilesData || profilesData.length === 0) {
      setCoaches([]);
      return;
    }

    const visibleIds = profilesData.map((p: any) => p.user_id);

    // 3. Fetch published+approved courses for these coaches.
    const { data: coursesData } = await supabase
      .from("courses")
      .select("id, title, slug, price_usd, price_inr, level, duration_hours, coach_id")
      .eq("is_published", true)
      .eq("approval_status", "approved")
      .in("coach_id", visibleIds);

    const coursesByCoach: Record<string, any[]> = {};
    (coursesData || []).forEach((c) => {
      if (!coursesByCoach[c.coach_id]) coursesByCoach[c.coach_id] = [];
      coursesByCoach[c.coach_id].push(c);
    });

    setCoaches(
      profilesData.map((p: any) => ({
        ...p,
        category_id: p.category_id || categoryId || "",
        courses: coursesByCoach[p.user_id] || [],
      }))
    );
  };

  const handleFilterClick = async (catId: string | null) => {
    setActiveFilter(catId);
    setLoading(true);
    await fetchCoachesByCategory(catId);
    setLoading(false);
  };

  const otherCategories = useMemo(
    () => allCategories.filter((c) => c.slug !== slug),
    [allCategories, slug]
  );

  if (notFound) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background px-4">
          <h1 className="text-3xl font-bold text-foreground">Category Not Found</h1>
          <p className="text-muted-foreground">This category doesn't exist or is no longer active.</p>
          <Link to="/categories" className="text-primary hover:underline">Browse all categories →</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        {/* Hero */}
        <div className="border-b border-border bg-card/50 py-12">
          <div className="container mx-auto px-4 text-center">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="mx-auto h-12 w-12 rounded-full" />
                <Skeleton className="mx-auto h-8 w-48" />
                <Skeleton className="mx-auto h-5 w-64" />
              </div>
            ) : (
              <>
                <div className="mb-3 text-4xl">{category?.icon || "📂"}</div>
                <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">
                  {category?.name}
                </h1>
                <p className="text-muted-foreground">
                  <Users className="mr-1 inline h-4 w-4" />
                  {coaches.length} {coaches.length === 1 ? "coach" : "coaches"} available
                </p>
              </>
            )}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="border-b border-border bg-background">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
              <button
                onClick={() => handleFilterClick(null)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  activeFilter === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {allCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.slug}`}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    c.slug === slug
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.icon && <span className="mr-1">{c.icon}</span>}
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Coach grid */}
        <div className="container mx-auto px-4 py-10">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : coaches.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-2 text-lg font-semibold text-foreground">No coaches found</p>
              <p className="text-muted-foreground">
                No coaches have registered under this category yet.
              </p>
              <Link to="/categories" className="mt-4 inline-block text-primary hover:underline">
                Browse other categories →
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coaches.map((coach) => {
                const lowestPrice =
                  coach.courses.length > 0
                    ? Math.min(
                        ...coach.courses.map((c) => Number(c[priceKey as keyof typeof c] || c.price_usd))
                      )
                    : null;
                const primaryCourse = coach.courses[0];

                return (
                  <div
                    key={coach.user_id}
                    className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  >
                    {/* Coach header */}
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {coach.avatar_url ? (
                          <img
                            src={coach.avatar_url}
                            alt={coach.full_name || "Coach"}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          (coach.full_name || "C")
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-foreground">
                          {coach.full_name || "Coach"}
                        </h3>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {category?.name}
                        </Badge>
                      </div>
                    </div>

                    {/* Bio */}
                    {coach.bio && (
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {coach.bio}
                      </p>
                    )}

                    {/* Course info */}
                    {primaryCourse && (
                      <div className="mb-4 rounded-lg border border-border bg-background p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          {coach.courses.length} {coach.courses.length === 1 ? "course" : "courses"}
                        </div>
                        <p className="mb-1 truncate text-sm font-medium text-foreground">
                          {primaryCourse.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{primaryCourse.level}</Badge>
                          <span className="text-xs text-muted-foreground">{primaryCourse.duration_hours}h</span>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                      {lowestPrice !== null ? (
                        <span className="text-sm font-semibold text-foreground">
                          {coach.courses.length > 1 ? "From " : ""}
                          {symbol}
                          {lowestPrice}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No courses yet</span>
                      )}
                      <Button asChild size="sm" variant="default" className="gap-1">
                        <Link to={coach.slug ? `/coach-profile/${coach.slug}` : "#"}>
                          View Profile <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Explore other categories */}
        {otherCategories.length > 0 && (
          <section className="border-t border-border bg-card/30 py-12">
            <div className="container mx-auto px-4">
              <h2 className="mb-6 text-xl font-bold text-foreground">Explore Other Categories</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {otherCategories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/categories/${c.slug}`}
                    className="group cursor-pointer rounded-xl border border-border bg-card p-4 text-center transition-all duration-200 hover:scale-[1.03] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <span className="mb-2 block text-2xl">{c.icon || "📂"}</span>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                      {c.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CoachCategoryPage;
