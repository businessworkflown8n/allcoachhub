import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { useCurrency } from "@/hooks/useCurrency";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, Video, MapPin, Briefcase, ExternalLink, Star, Clock, Users, Calendar } from "lucide-react";
import PriceDisplay from "@/components/shared/PriceDisplay";

const CoachLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { symbol, priceKey } = useCurrency();
  const [coach, setCoach] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useSEO({
    title: coach ? `${coach.full_name} – AI Coach | AI Coach Portal` : "Coach Profile – AI Coach Portal",
    description: coach?.bio?.slice(0, 160) || "Discover expert AI coaching on AI Coach Portal.",
    canonical: `https://www.aicoachportal.com/coach-profile/${slug}`,
    ogType: "profile",
  });

  const coachJsonLd = coach ? {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": coach.full_name,
    "jobTitle": coach.job_title || "AI Coach",
    "description": coach.bio || "",
    "url": `https://www.aicoachportal.com/coach-profile/${slug}`,
    "image": coach.avatar_url,
    "worksFor": {
      "@type": "Organization",
      "name": "AI Coach Portal"
    },
    ...(coach.linkedin_profile ? { "sameAs": [coach.linkedin_profile] } : {}),
    ...(coach.country ? { "address": { "@type": "PostalAddress", "addressCountry": coach.country, ...(coach.city ? { "addressLocality": coach.city } : {}) } } : {}),
  } : null;

  // Push dataLayer event for GTM/Looker Studio
  useEffect(() => {
    if (coach) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'coach_profile_view',
        coach_name: coach.full_name,
        coach_category: coach.category,
        coach_country: coach.country,
      });
    }
  }, [coach]);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      // Find coach profile by slug or user_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const { data: profile } = await supabase
        .from("coach_public_profiles" as any)
        .select("*")
        .eq(isUUID ? "user_id" : "slug", slug)
        .maybeSingle();

      if (!profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }


      const coachProfile: any = profile;
      setCoach(coachProfile);

      // Track page view
      await supabase.from("coach_page_views").insert({
        coach_user_id: coachProfile.user_id,
        referrer: document.referrer || null,
        utm_source: searchParams.get("utm_source") || null,
        utm_medium: searchParams.get("utm_medium") || null,
        utm_campaign: searchParams.get("utm_campaign") || null,
      });

      // Fetch published courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("coach_id", coachProfile.user_id)
        .eq("is_published", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      setCourses(coursesData || []);

      // Fetch enrollment counts per course
      if (coursesData && coursesData.length > 0) {
        const counts: Record<string, number> = {};
        for (const course of coursesData) {
          const { count } = await supabase
            .from("enrollments")
            .select("id", { count: "exact", head: true })
            .eq("course_id", course.id);
          counts[course.id] = count || 0;
        }
        setEnrollmentCounts(counts);
      }

      // Fetch upcoming webinars
      const today = new Date().toISOString().split("T")[0];
      const { data: webinarsData } = await supabase
        .from("webinars")
        .select("*")
        .eq("coach_id", coachProfile.user_id)
        .eq("is_published", true)
        .gte("webinar_date", today)
        .order("webinar_date", { ascending: true });

      setWebinars(webinarsData || []);
      setLoading(false);
    };
    load();
  }, [slug, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background px-4">
          <h1 className="text-3xl font-bold text-foreground">Coach Not Found</h1>
          <p className="text-muted-foreground">This coach profile doesn't exist or is unavailable.</p>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  const initials = coach?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <>
      <Navbar />
      {coachJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(coachJsonLd) }} />}
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-xl md:h-40 md:w-40">
                <AvatarImage src={coach.avatar_url} alt={coach.full_name} />
                <AvatarFallback className="bg-primary text-3xl text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-foreground lg:text-4xl">{coach.full_name}</h1>
                {coach.job_title && (
                  <p className="mt-1 text-lg text-muted-foreground">{coach.job_title}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  {coach.category && <Badge variant="secondary">{coach.category}</Badge>}
                  {coach.experience && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" /> {coach.experience}
                    </span>
                  )}
                  {(coach.city || coach.country) && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {[coach.city, coach.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                {coach.bio && (
                  <p className="mt-4 max-w-2xl text-muted-foreground">{coach.bio}</p>
                )}
                {coach.linkedin_profile && (
                  <a href={coach.linkedin_profile} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <ExternalLink className="h-4 w-4" /> LinkedIn Profile
                  </a>
                )}
                {coach.intro_video_url && (
                  <div className="mt-6 max-w-xl">
                    <iframe
                      src={coach.intro_video_url.replace("watch?v=", "embed/")}
                      className="aspect-video w-full rounded-lg border border-border"
                      allowFullScreen
                      title="Coach intro video"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Courses Section */}
        {courses.length > 0 && (
          <section className="container mx-auto px-4 py-12">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
              <GraduationCap className="h-6 w-6 text-primary" /> Courses by {coach.full_name}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card key={course.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
                  {course.thumbnail_url && (
                    <img src={course.thumbnail_url} alt={course.title} className="h-44 w-full object-cover" />
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-lg">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration_hours}h</span>
                        <Badge variant="outline" className="text-xs">{course.level}</Badge>
                        <Badge variant="outline" className="text-xs">{course.category}</Badge>
                      </div>
                      {enrollmentCounts[course.id] > 0 && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> {enrollmentCounts[course.id]} students enrolled
                        </p>
                      )}
                      <PriceDisplay
                        priceInr={course.price_inr}
                        priceUsd={course.price_usd}
                        originalPriceInr={course.original_price_inr}
                        originalPriceUsd={course.original_price_usd}
                        size="md"
                      />
                    </div>
                    <Link to={`/course/${course.slug}`}>
                      <Button className="w-full">View & Enroll</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Webinars Section */}
        {webinars.length > 0 && (
          <section className="container mx-auto px-4 py-12">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
              <Video className="h-6 w-6 text-primary" /> Upcoming Webinars
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {webinars.map((webinar) => (
                <Card key={webinar.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-lg">{webinar.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {webinar.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{webinar.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {new Date(webinar.webinar_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {webinar.webinar_time} · {webinar.duration_minutes}min
                      </span>
                    </div>
                    <Link to="/webinars">
                      <Button variant="outline" className="w-full">View Details</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {courses.length === 0 && webinars.length === 0 && (
          <section className="container mx-auto px-4 py-16 text-center">
            <p className="text-muted-foreground">This coach hasn't published any courses or webinars yet.</p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
};

export default CoachLanding;
