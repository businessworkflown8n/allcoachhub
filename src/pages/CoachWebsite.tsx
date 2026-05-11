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

  return (
    <>
      <Navbar customLogo={site.logo_url} customName={site.institute_name} customHomeLink={`/coach-website/${slug}`} />
      <main className="min-h-screen bg-background pb-16 md:pb-0">
        <CoachWebsiteHero site={site} coach={coach} courseCount={courses.length} themeColor={themeColor} />
        <CoachWebsiteStats courseCount={courses.length} themeColor={themeColor} contentSections={cs} />

        {site.show_about && site.about_text && <CoachWebsiteAbout aboutText={site.about_text} />}

        <CoachWebsiteUSP themeColor={themeColor} contentSections={cs} />

        {site.show_courses && <CoachWebsiteCourses courses={courses} themeColor={themeColor} />}

        <CoachWebsiteCoachProfile coach={coach} themeColor={themeColor} />

        {site.show_video && site.video_url && <CoachWebsiteVideo videoUrl={site.video_url} themeColor={themeColor} />}

        {site.show_testimonials !== false && <CoachWebsiteTestimonials themeColor={themeColor} contentSections={cs} />}

        <CoachWebsiteDemoForm coachId={site.coach_id} instituteName={site.institute_name} themeColor={themeColor} contentSections={cs} slug={slug} />

        <CoachWebsiteFAQ contentSections={cs} />

        <CoachWebsiteSocial socialLinks={socialLinks} />

        <CoachWebsiteFinalCTA themeColor={themeColor} contentSections={cs} />
      </main>
      <Footer />
      <CoachWebsiteStickyCTA themeColor={themeColor} />
      <CoachWebsiteFloatingCTA themeColor={themeColor} />
    </>
  );
};

export default CoachWebsite;
