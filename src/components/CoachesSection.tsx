import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, SlidersHorizontal, MapPin, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/i18n/TranslationProvider";

interface CoachData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  category: string | null;
  experience: string | null;
  job_title: string | null;
  country: string | null;
  city: string | null;
  tags: string[] | null;
  slug: string | null;
  courseCount: number;
  minPriceUsd: number | null;
  minPriceInr: number | null;
}

const CoachesSection = () => {
  const { symbol, currency } = useCurrency();
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortFilter, setSortFilter] = useState("all");
  const { t } = useTranslation();

  useEffect(() => {
    const fetchCoaches = async () => {
      const { data: profiles } = await supabase
        .from("coach_public_profiles")
        .select("user_id, full_name, avatar_url, bio, category, experience, job_title, country, city, tags, slug, is_suspended, created_at")
        .eq("is_suspended", false)
        .order("created_at", { ascending: true });

      if (!profiles?.length) { setCoaches([]); setLoading(false); return; }

      const { data: courses } = await supabase
        .from("courses")
        .select("coach_id, price_usd, price_inr")
        .in("coach_id", profiles.map(p => p.user_id))
        .eq("is_published", true)
        .eq("approval_status", "approved");

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

      const enriched: CoachData[] = profiles
        .filter(p => p.full_name)
        .map(p => {
          const meta = courseMap.get(p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            bio: p.bio,
            category: p.category,
            experience: p.experience,
            job_title: p.job_title,
            country: p.country,
            city: p.city,
            tags: p.tags,
            slug: p.slug,
            courseCount: meta?.count || 0,
            minPriceUsd: meta?.minUsd ?? null,
            minPriceInr: meta?.minInr ?? null,
          };
        });

      setCoaches(enriched);
      setLoading(false);
    };
    fetchCoaches();
  }, []);

  const sorted = [...coaches].sort((a, b) => {
    if (sortFilter === "low") {
      const keyA = currency === "INR" ? a.minPriceInr : a.minPriceUsd;
      const keyB = currency === "INR" ? b.minPriceInr : b.minPriceUsd;
      return (keyA ?? 9999) - (keyB ?? 9999);
    }
    if (sortFilter === "high") {
      const keyA = currency === "INR" ? a.minPriceInr : a.minPriceUsd;
      const keyB = currency === "INR" ? b.minPriceInr : b.minPriceUsd;
      return (keyB ?? 0) - (keyA ?? 0);
    }
    return 0;
  });

  const getInitials = (name: string | null) =>
    name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <section id="coaches" className="py-12 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mb-3 text-3xl font-bold text-foreground">{t("coaches.title")}</h2>
            <p className="text-muted-foreground">{t("coaches.subtitle")}</p>
          </div>
          <Link to="/browse-coaches" className="text-sm font-medium text-primary transition-colors hover:underline">
            {t("coaches.viewAll")}
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select value={sortFilter} onValueChange={setSortFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="all">{t("coaches.defaultOrder")}</SelectItem>
              <SelectItem value="low">{t("coaches.priceLowHigh")}</SelectItem>
              <SelectItem value="high">{t("coaches.priceHighLow")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-56 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">{t("coaches.noMatch")}</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sorted.map((coach) => (
              <Link
                key={coach.user_id}
                to={`/coach-profile/${coach.slug || coach.user_id}`}
                className="block rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="mb-4 flex items-start gap-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={coach.avatar_url || undefined} alt={coach.full_name || "Coach"} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {getInitials(coach.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground truncate">{coach.full_name}</h3>
                    {coach.job_title && <p className="text-sm text-muted-foreground truncate">{coach.job_title}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {coach.experience && (
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {coach.experience}</span>
                      )}
                      {(coach.city || coach.country) && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {[coach.city, coach.country].filter(Boolean).join(", ")}</span>
                      )}
                    </div>
                  </div>
                </div>

                {coach.tags && coach.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {coach.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {coach.category && !coach.tags?.length && (
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs">{coach.category}</Badge>
                  </div>
                )}

                {coach.bio && (
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">{coach.bio}</p>
                )}

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">
                    {coach.courseCount} {coach.courseCount === 1 ? "course" : "courses"}
                  </span>
                  {(currency === "INR" ? coach.minPriceInr : coach.minPriceUsd) != null && (
                    <span className="text-sm font-semibold text-foreground">
                      {t("coaches.from")} {symbol}{currency === "INR" ? coach.minPriceInr : coach.minPriceUsd}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CoachesSection;
