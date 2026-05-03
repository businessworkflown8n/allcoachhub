import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { useCurrency } from "@/hooks/useCurrency";
import { useCoachCategories } from "@/hooks/useCoachCategories";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Star, Filter, X, SlidersHorizontal, ChevronDown, ChevronUp,
  MapPin, Briefcase, ArrowUpDown, Sparkles, Users
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface CoachProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  category: string | null;
  category_id: string | null;
  experience: string | null;
  experience_level: string | null;
  job_title: string | null;
  country: string | null;
  city: string | null;
  tags: string[] | null;
  slug: string | null;
  certifications: string[] | null;
  is_suspended: boolean;
}

interface CoachWithMeta extends CoachProfile {
  courseCount: number;
  minPrice: number | null;
  minPriceInr: number | null;
  avgRating: number;
  isFeatured: boolean;
}

const ITEMS_PER_PAGE = 12;

const BrowseCoaches = () => {
  useSEO({
    title: "Browse Coaches – Find Your Perfect AI Coach | AI Coach Portal",
    description: "Discover top AI coaches filtered by category, skills, price & rating. Book sessions with verified experts in prompt engineering, AI automation, and more.",
    canonical: "https://www.aicoachportal.com/browse-coaches",
  });

  const { symbol, currency } = useCurrency();
  const { categories } = useCoachCategories();

  const [coaches, setCoaches] = useState<CoachWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Active filter tags
  const activeFilters = useMemo(() => {
    const tags: { key: string; label: string }[] = [];
    categoryFilter.forEach(c => tags.push({ key: `cat-${c}`, label: c }));
    experienceFilter.forEach(e => tags.push({ key: `exp-${e}`, label: e }));
    if (ratingFilter !== "all") tags.push({ key: "rating", label: `${ratingFilter}★+` });
    if (priceRange[0] > 0 || priceRange[1] < 10000)
      tags.push({ key: "price", label: `${symbol}${priceRange[0]} – ${symbol}${priceRange[1]}` });
    return tags;
  }, [categoryFilter, experienceFilter, ratingFilter, priceRange, symbol]);

  const removeFilter = (key: string) => {
    if (key.startsWith("cat-")) setCategoryFilter(prev => prev.filter(c => c !== key.replace("cat-", "")));
    else if (key.startsWith("exp-")) setExperienceFilter(prev => prev.filter(e => e !== key.replace("exp-", "")));
    else if (key === "rating") setRatingFilter("all");
    else if (key === "price") setPriceRange([0, 10000]);
  };

  const clearAllFilters = () => {
    setSearch("");
    setCategoryFilter([]);
    setPriceRange([0, 10000]);
    setRatingFilter("all");
    setExperienceFilter([]);
    setSortBy("recommended");
  };

  // Fetch coaches data
  useEffect(() => {
    const fetchCoaches = async () => {
      setLoading(true);

      // Use the public view that exposes all non-suspended coach profiles to everyone
      // (the base profiles table is locked down by RLS to the owner/admins).
      const { data: profiles } = await supabase
        .from("coach_public_profiles")
        .select("id, user_id, full_name, avatar_url, bio, category, category_id, experience, experience_level, job_title, country, city, tags, slug, certifications, is_suspended")
        .eq("is_suspended", false);

      if (!profiles?.length) { setCoaches([]); setLoading(false); return; }

      // Fetch courses for pricing
      const { data: courses } = await supabase
        .from("courses")
        .select("coach_id, price_usd, price_inr")
        .in("coach_id", profiles.map(p => p.user_id))
        .eq("is_published", true)
        .eq("approval_status", "approved");

      // Build coach metadata
      const courseMap = new Map<string, { count: number; minUsd: number; minInr: number }>();
      courses?.forEach(c => {
        const existing = courseMap.get(c.coach_id);
        if (existing) {
          existing.count++;
          existing.minUsd = Math.min(existing.minUsd, c.price_usd);
          existing.minInr = Math.min(existing.minInr, c.price_inr);
        } else {
          courseMap.set(c.coach_id, { count: 1, minUsd: c.price_usd, minInr: c.price_inr });
        }
      });

      const enriched: CoachWithMeta[] = profiles.map(p => {
        const meta = courseMap.get(p.user_id);
        const completeness = [p.full_name, p.bio, p.avatar_url, p.category, p.experience, p.job_title]
          .filter(Boolean).length;
        return {
          ...p,
          courseCount: meta?.count || 0,
          minPrice: meta?.minUsd ?? null,
          minPriceInr: meta?.minInr ?? null,
          avgRating: 4.5 + (completeness * 0.08),
          isFeatured: completeness >= 5 && (meta?.count || 0) >= 1,
        };
      });

      setCoaches(enriched);
      setLoading(false);
      trackEvent("browse_coaches_loaded", { count: enriched.length });
    };

    fetchCoaches();
  }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setVisibleCount(prev => prev + ITEMS_PER_PAGE); },
      { rootMargin: "200px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter & sort
  const filtered = useMemo(() => {
    let result = [...coaches];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.full_name?.toLowerCase().includes(q)) ||
        (c.category?.toLowerCase().includes(q)) ||
        (c.bio?.toLowerCase().includes(q)) ||
        (c.tags?.some(t => t.toLowerCase().includes(q))) ||
        (c.job_title?.toLowerCase().includes(q))
      );
    }
    if (categoryFilter.length > 0) {
      result = result.filter(c => c.category && categoryFilter.some(f => c.category!.toLowerCase().includes(f.toLowerCase())));
    }
    if (experienceFilter.length > 0) {
      result = result.filter(c => {
        const exp = c.experience_level?.toLowerCase() || c.experience?.toLowerCase() || "";
        return experienceFilter.some(f => exp.includes(f.toLowerCase()));
      });
    }
    if (ratingFilter !== "all") {
      const min = parseFloat(ratingFilter);
      result = result.filter(c => c.avgRating >= min);
    }
    const priceKey = currency === "INR" ? "minPriceInr" : "minPrice";
    if (priceRange[0] > 0 || priceRange[1] < 10000) {
      result = result.filter(c => {
        const p = c[priceKey];
        if (p === null) return true;
        return p >= priceRange[0] && p <= priceRange[1];
      });
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => (a[priceKey] ?? 9999) - (b[priceKey] ?? 9999));
        break;
      case "price-high":
        result.sort((a, b) => (b[priceKey] ?? 0) - (a[priceKey] ?? 0));
        break;
      case "rating":
        result.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case "experience":
        result.sort((a, b) => (b.experience?.length || 0) - (a.experience?.length || 0));
        break;
      default: // recommended: featured first, then completeness
        result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.avgRating - a.avgRating);
    }
    return result;
  }, [coaches, search, categoryFilter, experienceFilter, ratingFilter, priceRange, sortBy, currency]);

  const featuredCoaches = useMemo(() => coaches.filter(c => c.isFeatured).slice(0, 10), [coaches]);
  const visibleCoaches = filtered.slice(0, visibleCount);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const experienceOptions = ["0-2 years", "3-5 years", "5+ years"];

  const CoachCard = ({ coach, featured = false }: { coach: CoachWithMeta; featured?: boolean }) => {
    const price = currency === "INR" ? coach.minPriceInr : coach.minPrice;
    return (
      <div className={`group relative rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg ${featured ? "ring-1 ring-primary/20" : ""}`}>
        {coach.isFeatured && (
          <div className="absolute -top-2.5 right-4">
            <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
              <Sparkles className="h-3 w-3" /> Featured
            </Badge>
          </div>
        )}

        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarImage src={coach.avatar_url || undefined} alt={coach.full_name || "Coach"} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(coach.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground">{coach.full_name || "Coach"}</h3>
            <p className="truncate text-sm text-muted-foreground">{coach.job_title || coach.category || "AI Coach"}</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span className="text-xs font-medium text-foreground">{coach.avgRating.toFixed(1)}</span>
              </div>
              {coach.experience && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Briefcase className="h-3 w-3" /> {coach.experience}
                </span>
              )}
            </div>
          </div>
        </div>

        {coach.tags && coach.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {coach.tags.slice(0, 3).map(tag => (
              <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>
            ))}
            {coach.tags.length > 3 && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] text-muted-foreground">+{coach.tags.length - 3}</span>
            )}
          </div>
        )}

        {coach.bio && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{coach.bio}</p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div>
            {price !== null ? (
              <span className="text-sm font-semibold text-foreground">From {symbol}{price.toLocaleString()}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Contact for pricing</span>
            )}
            {coach.courseCount > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">· {coach.courseCount} course{coach.courseCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
            <Link
              to={`/coach-profile/${coach.slug || coach.user_id}`}
              onClick={() => trackEvent("browse_coaches_view_profile", { coachId: coach.user_id })}
            >
              View Profile
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1 text-xs">
            <Link
              to={`/coach-profile/${coach.slug || coach.user_id}`}
              onClick={() => trackEvent("browse_coaches_book_session", { coachId: coach.user_id })}
            >
              Book Session
            </Link>
          </Button>
        </div>
      </div>
    );
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Category</h4>
        <div className="space-y-2">
          {categories.map(cat => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Checkbox
                checked={categoryFilter.includes(cat.name)}
                onCheckedChange={(checked) => {
                  setCategoryFilter(prev => checked ? [...prev, cat.name] : prev.filter(c => c !== cat.name));
                }}
              />
              {cat.name}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Price Range ({symbol})</h4>
        <Slider
          value={priceRange}
          min={0}
          max={currency === "INR" ? 10000 : 200}
          step={currency === "INR" ? 500 : 10}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{symbol}{priceRange[0]}</span>
          <span>{symbol}{priceRange[1]}</span>
        </div>
      </div>

      {/* Experience */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Experience</h4>
        <div className="space-y-2">
          {experienceOptions.map(opt => (
            <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Checkbox
                checked={experienceFilter.includes(opt)}
                onCheckedChange={(checked) => {
                  setExperienceFilter(prev => checked ? [...prev, opt] : prev.filter(e => e !== opt));
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Rating</h4>
        <div className="space-y-2">
          {["4.5", "4.0", "3.5"].map(r => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Checkbox
                checked={ratingFilter === r}
                onCheckedChange={(checked) => setRatingFilter(checked ? r : "all")}
              />
              <Star className="h-3 w-3 fill-primary text-primary" /> {r}+ & above
            </label>
          ))}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="w-full text-xs text-destructive hover:text-destructive">
          <X className="mr-1 h-3 w-3" /> Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Header */}
      <section className="border-b border-border bg-card pt-20 pb-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">Browse Coaches</h1>
          <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
            Find the perfect coach based on your goals. Connect with verified experts across AI, business, and technology.
          </p>
          <div className="mx-auto max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, skill, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background border-border"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
          {/* Conversion banner */}
          <p className="mt-4 text-xs text-primary font-medium">
            ⚡ Find the right coach in under 2 minutes
          </p>
        </div>
      </section>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="border-b border-border bg-background">
          <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {activeFilters.map(f => (
              <Badge key={f.key} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => removeFilter(f.key)}>
                {f.label} <X className="h-3 w-3" />
              </Badge>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-destructive hover:underline">Clear all</button>
          </div>
        </div>
      )}

      {/* Featured Coaches */}
      {featuredCoaches.length > 0 && (
        <section className="border-b border-border bg-card/50 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Top Featured Coaches Recommended for You</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {featuredCoaches.map(coach => (
                <div key={coach.id} className="min-w-[300px] max-w-[340px] flex-shrink-0">
                  <CoachCard coach={coach} featured />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar - desktop */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              </div>
              <FilterSidebar />
            </div>
          </aside>

          {/* Mobile filter toggle */}
          <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 lg:hidden">
            <Button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="gap-2 rounded-full shadow-lg"
              size="sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
            </Button>
          </div>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Filters</h3>
                  <button onClick={() => setFiltersOpen(false)}>
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                <FilterSidebar />
                <Button onClick={() => setFiltersOpen(false)} className="mt-4 w-full">
                  Show {filtered.length} results
                </Button>
              </div>
            </div>
          )}

          {/* Coach grid */}
          <div className="flex-1">
            {/* Sort bar */}
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filtered.length} coach{filtered.length !== 1 ? "es" : ""} found
              </span>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44 bg-card border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="price-low">Price: Low → High</SelectItem>
                    <SelectItem value="price-high">Price: High → Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="experience">Most Experienced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl border border-border bg-card" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-semibold text-foreground">No coaches found</h3>
                <p className="mb-4 text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
                <Button variant="outline" onClick={clearAllFilters}>Clear Filters</Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleCoaches.map(coach => (
                    <CoachCard key={coach.id} coach={coach} />
                  ))}
                </div>
                {visibleCount < filtered.length && (
                  <div ref={sentinelRef} className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BrowseCoaches;
