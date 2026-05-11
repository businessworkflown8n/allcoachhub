import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, MapPin, Star, Users, BookOpen, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Premium3DButton from "./Premium3DButton";

interface Props {
  site: any;
  coach: any;
  courseCount: number;
  themeColor: string;
  variant?: "classic" | "gradient" | "particle" | "video";
}

const CoachWebsiteHero = ({ site, coach, courseCount, themeColor, variant = "classic" }: Props) => {
  const bannerUrls: string[] = (site.banner_urls?.length > 0 ? site.banner_urls : site.banner_url ? [site.banner_url] : []);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (bannerUrls.length <= 1) return;
    const timer = setInterval(() => setCurrentBanner((i) => (i + 1) % bannerUrls.length), 5000);
    return () => clearInterval(timer);
  }, [bannerUrls.length]);

  const scrollToCourses = () => document.getElementById("cw-courses")?.scrollIntoView({ behavior: "smooth" });
  const scrollToDemo = () => document.getElementById("cw-demo")?.scrollIntoView({ behavior: "smooth" });

  const cs = (site.content_sections || {}) as any;
  const stats = cs.stats;

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Banner Slider */}
      {bannerUrls.length > 0 && (
        <div className="relative w-full" style={{ aspectRatio: '16/5' }}>
          {bannerUrls.map((url: string, i: number) => (
            <img
              key={i}
              src={url}
              alt={`Banner ${i + 1}`}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === currentBanner ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {/* Banner navigation arrows */}
          {bannerUrls.length > 1 && (
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-10 pointer-events-none">
              <button
                onClick={() => setCurrentBanner((i) => (i - 1 + bannerUrls.length) % bannerUrls.length)}
                className="pointer-events-auto h-10 w-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/80 transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentBanner((i) => (i + 1) % bannerUrls.length)}
                className="pointer-events-auto h-10 w-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/80 transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Navigation dots */}
          {bannerUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {bannerUrls.map((_: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${i === currentBanner ? "w-7" : "bg-white/50"}`}
                  style={i === currentBanner ? { backgroundColor: themeColor } : {}}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div id="top" className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background variants */}
        {variant === "gradient" && (
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background: `radial-gradient(ellipse at 20% 10%, ${themeColor}30, transparent 55%), radial-gradient(ellipse at 80% 90%, ${themeColor}25, transparent 55%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--background)))`,
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--foreground)/0.06)_1px,transparent_0)] [background-size:24px_24px]" />
          </div>
        )}
        {variant === "particle" && (
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at top, ${themeColor}25, transparent 60%)` }}
            />
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${(i * 53) % 100}%`,
                  top: `${(i * 37) % 100}%`,
                  width: 4 + (i % 4) * 2,
                  height: 4 + (i % 4) * 2,
                  background: themeColor,
                  opacity: 0.4,
                  filter: "blur(1px)",
                }}
                animate={{ y: [0, -20, 0], opacity: [0.25, 0.6, 0.25] }}
                transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
        {variant === "classic" && (
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at top, ${themeColor}18, transparent 70%)` }} />
        )}

        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
          {site.tagline && (
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-6xl">
              {site.tagline}
            </h1>
          )}

          {coach && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              by <span className="font-medium text-foreground">{coach.full_name}</span>
              {coach.country && (<><MapPin className="h-3.5 w-3.5" /> {coach.country}</>)}
            </p>
          )}

          {/* Trust Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {courseCount > 0 && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs backdrop-blur">
                <BookOpen className="h-3.5 w-3.5" /> {courseCount} Courses
              </Badge>
            )}
            {stats && stats.length > 0 && (
              <>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" /> {stats.find((s: any) => s.label?.toLowerCase().includes("rate"))?.value || "4.8 Rating"}
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs backdrop-blur">
                  <Users className="h-3.5 w-3.5" /> {stats.find((s: any) => s.label?.toLowerCase().includes("student"))?.value || "500+ Students"}
                </Badge>
              </>
            )}
          </div>

          {/* Premium 3D CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Premium3DButton themeColor={themeColor} variant="neon" onClick={scrollToDemo}>
              <Play className="h-4 w-4" /> Book Free Demo
            </Premium3DButton>
            {courseCount > 0 && (
              <Premium3DButton themeColor={themeColor} variant="outline" onClick={scrollToCourses}>
                <GraduationCap className="h-4 w-4" /> View Courses
              </Premium3DButton>
            )}
          </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CoachWebsiteHero;
