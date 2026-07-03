import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Star, Clock, Users, ArrowLeft, Heart, Share2, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PriceDisplay from "@/components/shared/PriceDisplay";
import JoinAsLearnerModal from "@/components/JoinAsLearnerModal";

const CourseDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { isLearner, isCoach } = useUserRole();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [coach, setCoach] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);

  useSEO({
    title: course ? `${course.title} – AI Course by ${coach?.full_name || 'Expert Coach'}` : "Course Details – AI Coach Portal",
    description: course?.description?.substring(0, 155) || "Learn AI skills from expert coaches with hands-on courses in prompt engineering, AI agents, automation, and more.",
    canonical: `https://www.aicoachportal.com/course/${slug}`,
    ogTitle: course?.title,
    ogDescription: course?.description?.substring(0, 155),
    ogImage: course?.thumbnail_url,
    ogType: "article",
  });

  // Track referral click when arriving via ?ref=
  useEffect(() => {
    if (!course?.id) return;
    const params = new URLSearchParams(window.location.search);
    const refId = params.get("ref");
    if (!refId || refId === user?.id) return;
    const key = `ref_clicked_${course.id}_${refId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    (supabase as any).from("referral_clicks").insert({
      referrer_id: refId,
      referrer_role: "learner",
      course_id: course.id,
      referral_code: refId,
      referrer_url: document.referrer || null,
      user_agent: navigator.userAgent,
    }).then(() => {});
  }, [course?.id, user?.id]);

  // Push dataLayer event for GTM/Looker Studio
  useEffect(() => {
    if (course && coach) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'course_view',
        course_id: course.id,
        course_name: course.title,
        course_category: course.category,
        course_level: course.level,
        course_price_usd: Number(course.price_usd),
        coach_name: coach.full_name,
      });
    }
  }, [course, coach]);

  const courseJsonLd = course ? {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description || "",
    "provider": {
      "@type": "Organization",
      "name": "AI Coach Portal",
      "sameAs": "https://www.aicoachportal.com"
    },
    "instructor": coach ? {
      "@type": "Person",
      "name": coach.full_name,
      "jobTitle": coach.job_title || "AI Coach",
    } : undefined,
    "educationalLevel": course.level,
    "inLanguage": course.language,
    "offers": {
      "@type": "Offer",
      "price": Number(course.price_usd),
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "url": `https://www.aicoachportal.com/course/${course.slug || course.id}`
    },
    "image": course.thumbnail_url,
    "url": `https://www.aicoachportal.com/course/${course.slug || course.id}`,
    "timeRequired": `PT${Number(course.duration_hours)}H`,
    "courseMode": "online",
  } : null;

  useEffect(() => {
    const fetchCourse = async () => {
      // Try slug first, fallback to id for backward compatibility
      let query = supabase.from("courses").select("*");
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || "");
      if (isUUID) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }
      const { data } = await query.single();
      if (data) {
        setCourse(data);
        const { data: coachProfile } = await supabase.from("profiles").select("*").eq("user_id", data.coach_id).single();
        setCoach(coachProfile);

        const { data: reviewData } = await supabase.from("reviews").select("*").eq("course_id", data.id).eq("is_approved", true);
        setReviews(reviewData || []);

        if (user) {
          const { data: wl } = await supabase.from("wishlists").select("id").eq("course_id", data.id).eq("learner_id", user.id).single();
          setWishlisted(!!wl);
        }
      }

      setLoading(false);
    };

    if (slug) fetchCourse();
  }, [slug, user]);

  const courseId = course?.id;

  const handleEnroll = () => {
    if (!user) {
      navigate(`/auth?redirect=/enroll/${courseId}`);
    } else {
      navigate(`/enroll/${courseId}`);
    }
  };

  const toggleWishlist = async () => {
    if (!user) return navigate("/auth");
    if (wishlisted) {
      await supabase.from("wishlists").delete().eq("course_id", courseId).eq("learner_id", user.id);
      setWishlisted(false);
      toast({ title: "Removed from wishlist" });
    } else {
      await supabase.from("wishlists").insert({ course_id: courseId, learner_id: user.id });
      setWishlisted(true);
      toast({ title: "Added to wishlist" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Course not found</p>
        <Link to="/" className="mt-4 text-primary hover:underline">Go back</Link>
      </div>
    );
  }

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "N/A";

  return (
    <div className="min-h-screen bg-background">
      {courseJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />}
      <div className="container mx-auto px-4 py-8 pt-24">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <span className="mb-2 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">{course.category}</span>
              <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
              <p className="mt-3 text-muted-foreground">{course.description}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {Number(course.duration_hours)} hours</span>
              <span className="rounded-full bg-secondary px-3 py-1">{course.level}</span>
              <span className="rounded-full bg-secondary px-3 py-1">{course.language}</span>
              {reviews.length > 0 && (
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-primary text-primary" /> {avgRating} ({reviews.length} reviews)</span>
              )}
            </div>

            {coach && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Instructor</h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {coach.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{coach.full_name}</p>
                    {coach.bio && <p className="text-xs text-muted-foreground">{coach.bio}</p>}
                  </div>
                </div>
              </div>
            )}

            {reviews.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground">Reviews</h3>
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                        ))}
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-6 space-y-4">
              <PriceDisplay
                priceInr={course.price_inr}
                priceUsd={course.price_usd}
                originalPriceInr={course.original_price_inr}
                originalPriceUsd={course.original_price_usd}
                size="xl"
              />

              <button
                onClick={handleEnroll}
                className="glow-lime w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Enroll Now
              </button>

              <button
                onClick={toggleWishlist}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${
                  wishlisted ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-primary" : ""}`} />
                {wishlisted ? "In Wishlist" : "Add to Wishlist"}
              </button>

              {user && isLearner ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                      <Share2 className="h-4 w-4" /> Share & Earn 10%
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">Share this course & earn 10% commission!</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/course/${course.slug || courseId}?ref=${user.id}`); toast({ title: "Link copied!" }); }} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">📋 Copy Link</button>
                      <button onClick={() => { const msg = encodeURIComponent(`Check out "${course.title}"! ${window.location.origin}/course/${course.slug || courseId}?ref=${user.id}`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">💬 WhatsApp</button>
                      <button onClick={() => { const s = encodeURIComponent(`Check out: ${course.title}`); const b = encodeURIComponent(`${course.title}\n\n${window.location.origin}/course/${course.slug || courseId}?ref=${user.id}`); window.open(`mailto:?subject=${s}&body=${b}`); }} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">📧 Email</button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : user && isCoach ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
                      <Share2 className="h-4 w-4" /> Invite Coaches Like You
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <p className="mb-1 text-xs font-semibold text-foreground">Invite fellow coaches</p>
                    <p className="mb-2 text-[11px] text-muted-foreground">Grow the network and lower your student acquisition cost.</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup/coach?ref=${user.id}`); toast({ title: "Invite link copied!" }); }} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">📋 Copy Invite Link</button>
                      <button onClick={() => { const msg = encodeURIComponent(`Join me on AI Coach Portal as a coach: ${window.location.origin}/signup/coach?ref=${user.id}`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">💬 WhatsApp</button>
                      <button onClick={() => { const s = encodeURIComponent(`Join me on AI Coach Portal`); const b = encodeURIComponent(`I'd like to invite you to join AI Coach Portal as a coach.\n\n${window.location.origin}/signup/coach?ref=${user.id}`); window.open(`mailto:?subject=${s}&body=${b}`); }} className="rounded-md px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary">📧 Email</button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : !user ? (
                <button
                  onClick={() => navigate("/auth")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Lock className="h-3.5 w-3.5" /> Login as a learner to unlock Share & Earn 10%
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
