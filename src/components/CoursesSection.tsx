import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, Clock, Users, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/i18n/TranslationProvider";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import PriceDisplay from "@/components/shared/PriceDisplay";

const CoursesSection = () => {
  const { user } = useAuth();
  const { symbol, priceKey, originalPriceKey } = useCurrency();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const getRefLink = (course: any) => {
    const base = `${window.location.origin}/course/${course.slug || course.id}`;
    return user ? `${base}?ref=${user.id}` : base;
  };

  const handleCopy = (course: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(getRefLink(course));
    toast({ title: t("courses.linkCopied") });
  };

  const handleWhatsApp = (course: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const msg = encodeURIComponent(`Check out "${course.title}" on AllCoachHub! ${getRefLink(course)}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = (course: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const subject = encodeURIComponent(`Check out: ${course.title}`);
    const body = encodeURIComponent(`I found this great course on AllCoachHub!\n\n${course.title}\n\n${getRefLink(course)}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  useEffect(() => {
    supabase.from("courses").select("*").eq("is_published", true).limit(8).then(({ data }) => {
      setCourses(data || []);
      setLoading(false);
    });
  }, []);

  const staticCourses = [
    { id: "static-1", category: "Prompt Engineering", title: "Master Prompt Engineering: From Zero to Expert", duration_hours: 8, level: "Beginner", price_usd: 49, price_inr: 3999, original_price_usd: 99, original_price_inr: 7999, discount_percent: 51 },
    { id: "static-2", category: "AI Agents", title: "Build AI Agents with No Code", duration_hours: 12, level: "Intermediate", price_usd: 69, price_inr: 5699, original_price_usd: 129, original_price_inr: 10699, discount_percent: 47 },
    { id: "static-3", category: "AI for Marketing", title: "AI-Powered Marketing Masterclass", duration_hours: 6, level: "Beginner", price_usd: 39, price_inr: 3199, original_price_usd: null, original_price_inr: null, discount_percent: 0 },
    { id: "static-4", category: "LLMs & Fine-tuning", title: "Fine-Tune Your Own LLM", duration_hours: 16, level: "Advanced", price_usd: 99, price_inr: 8199, original_price_usd: 199, original_price_inr: 16499, discount_percent: 50 },
  ];

  const displayCourses = courses.length > 0 ? courses : staticCourses;

  return (
    <section id="courses" className="py-12 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-2 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mb-3 text-3xl font-bold text-foreground">{t("courses.title")}</h2>
            <p className="text-muted-foreground">{t("courses.subtitle")}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayCourses.map((course) => (
              <Link
                to={course.id?.startsWith("static") ? "#" : `/course/${course.slug || course.id}`}
                key={course.id || course.title}
                className="group flex flex-col rounded-xl border border-border bg-card transition-all hover:border-primary/20"
              >
                <CourseThumbnail
                  src={course.thumbnail_url}
                  alt={course.title}
                  imgClassName="group-hover:scale-105"
                />

                <div className="border-b border-border p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{course.level}</span>
                    {Number(course.discount_percent) > 0 && (
                      <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">{Number(course.discount_percent)}% {t("common.off")}</span>
                    )}
                  </div>
                  <p className="mb-1 text-xs text-primary">{course.category}</p>
                  <h3 className="text-sm font-bold leading-snug text-foreground">{course.title}</h3>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Number(course.duration_hours)} {t("courses.hours")}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <PriceDisplay
                      priceInr={course.price_inr}
                      priceUsd={course.price_usd}
                      originalPriceInr={course.original_price_inr}
                      originalPriceUsd={course.original_price_usd}
                      size="md"
                    />
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                            title={t("courses.shareEarn")}
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <p className="mb-2 text-xs font-semibold text-foreground">{t("courses.shareEarn")}</p>
                          <div className="flex flex-col gap-1">
                            <button onClick={(e) => handleCopy(course, e)} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">📋 {t("courses.copyLink")}</button>
                            <button onClick={(e) => handleWhatsApp(course, e)} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">💬 {t("courses.whatsapp")}</button>
                            <button onClick={(e) => handleEmail(course, e)} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">📧 {t("courses.email")}</button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <span className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all group-hover:brightness-110">
                        {t("courses.enroll")}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CoursesSection;
