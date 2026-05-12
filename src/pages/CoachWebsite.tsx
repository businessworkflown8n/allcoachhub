import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import CoachWebsiteHeader from "@/components/coach-website/CoachWebsiteHeader";
import CoachWebsiteHero from "@/components/coach-website/CoachWebsiteHero";
import CoachWebsiteStats from "@/components/coach-website/CoachWebsiteStats";
import CoachWebsiteAbout from "@/components/coach-website/CoachWebsiteAbout";
import CoachWebsiteUSP from "@/components/coach-website/CoachWebsiteUSP";
import CoachWebsiteCourses from "@/components/coach-website/CoachWebsiteCourses";
import CoachWebsiteCoachProfile from "@/components/coach-website/CoachWebsiteCoachProfile";
import CoachWebsiteVideo from "@/components/coach-website/CoachWebsiteVideo";
import CoachWebsiteTestimonials from "@/components/coach-website/CoachWebsiteTestimonials";
import CoachWebsiteDemoForm from "@/components/coach-website/CoachWebsiteDemoForm";
import CoachWebsiteFAQ from "@/components/coach-website/CoachWebsiteFAQ";
import CoachWebsiteSocial from "@/components/coach-website/CoachWebsiteSocial";
import CoachWebsiteFinalCTA from "@/components/coach-website/CoachWebsiteFinalCTA";
import CoachWebsiteStickyCTA from "@/components/coach-website/CoachWebsiteStickyCTA";
import CoachWebsiteFloatingCTA from "@/components/coach-website/CoachWebsiteFloatingCTA";

const CoachWebsite = () => {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<any>(null);
  const [coach, setCoach] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useSEO({
    title: site?.meta_title || site?.institute_name || "Coach Website",
    description: site?.meta_description || site?.tagline || "Discover expert coaching",
    canonical: `https://www.aicoachportal.com/coach-website/${slug}`,
    ogType: "website",
  });

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data: website } = await supabase
        .from("coach_websites").select("*")
        .eq("slug", slug).eq("status", "approved").eq("is_live", true)
        .maybeSingle();

      if (!website) { setNotFound(true); setLoading(false); return; }
      setSite(website);

      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", website.coach_id).single();
      setCoach(profile);

      if (website.show_courses) {
        const { data: coursesData } = await supabase.from("courses").select("*")
          .eq("coach_id", website.coach_id).eq("is_published", true).eq("approval_status", "approved")
          .order("created_at", { ascending: false });
        setCourses(coursesData || []);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (notFound) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background px-4">
          <h1 className="text-3xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground">This coach website doesn't exist or isn't published yet.</p>
          <Link to="/"><Button>Back to Home</Button></Link>
        </div>
        <Footer />
      </>
    );
  }

  const socialLinks = (site.social_links || {}) as Record<string, string>;
  const themeColor = site.theme_color || "#6366f1";
  const cs = (site.content_sections || {}) as any;

  const headerConfig = (site.header_config || {}) as any;
  const heroVariant = (site.hero_variant || "classic") as "classic" | "gradient" | "particle" | "video";

  const DEFAULT_ORDER = [
    { id: "hero", visible: true },
    { id: "stats", visible: true },
    { id: "about", visible: site.show_about !== false },
    { id: "usp", visible: true },
    { id: "courses", visible: site.show_courses !== false },
    { id: "coach_profile", visible: true },
    { id: "video", visible: !!site.show_video },
    { id: "testimonials", visible: site.show_testimonials !== false },
    { id: "demo", visible: true },
    { id: "faq", visible: true },
    { id: "social", visible: true },
    { id: "final_cta", visible: true },
  ];
  const sectionOrder: { id: string; visible: boolean }[] =
    Array.isArray(site.section_order) && site.section_order.length > 0
      ? site.section_order
      : DEFAULT_ORDER;

  const renderSection = (id: string) => {
    switch (id) {
      case "hero":
        return <CoachWebsiteHero key="hero" site={site} coach={coach} courseCount={courses.length} themeColor={themeColor} variant={heroVariant} />;
      case "stats":
        return <CoachWebsiteStats key="stats" courseCount={courses.length} themeColor={themeColor} contentSections={cs} />;
      case "about":
        return site.about_text ? <CoachWebsiteAbout key="about" aboutText={site.about_text} /> : null;
      case "usp":
        return <CoachWebsiteUSP key="usp" themeColor={themeColor} contentSections={cs} />;
      case "courses":
        return <CoachWebsiteCourses key="courses" courses={courses} themeColor={themeColor} />;
      case "coach_profile":
        return <CoachWebsiteCoachProfile key="coach_profile" coach={coach} themeColor={themeColor} />;
      case "video":
        return site.video_url ? <CoachWebsiteVideo key="video" videoUrl={site.video_url} themeColor={themeColor} /> : null;
      case "testimonials":
        return <CoachWebsiteTestimonials key="testimonials" themeColor={themeColor} contentSections={cs} />;
      case "demo":
        return <CoachWebsiteDemoForm key="demo" coachId={site.coach_id} instituteName={site.institute_name} themeColor={themeColor} contentSections={cs} slug={slug} />;
      case "faq":
        return <CoachWebsiteFAQ key="faq" contentSections={cs} />;
      case "social":
        return <CoachWebsiteSocial key="social" socialLinks={socialLinks} />;
      case "final_cta":
        return <CoachWebsiteFinalCTA key="final_cta" themeColor={themeColor} contentSections={cs} />;
      default:
        return null;
    }
  };

  return (
    <>
      <CoachWebsiteHeader
        logoUrl={site.logo_url}
        instituteName={site.institute_name}
        themeColor={themeColor}
        config={{ ...headerConfig, social_links: socialLinks }}
        homeHref={`/coach-website/${slug}`}
      />
      <main className="min-h-screen bg-background pb-16 md:pb-0">
        {sectionOrder.filter((s) => s.visible).map((s) => renderSection(s.id))}
      </main>
      <Footer />
      <CoachWebsiteStickyCTA themeColor={themeColor} />
      <CoachWebsiteFloatingCTA themeColor={themeColor} />
    </>
  );
};

export default CoachWebsite;
