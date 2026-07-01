import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { detectCurrency, type SupportedCurrency } from "@/lib/currencyRouter";

const isIndia = (country: string) => {
  const c = (country || "").trim().toLowerCase();
  return c === "india" || c === "in" || c === "ind" || c === "bharat";
};
const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const formatUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const Enroll = () => {
  useSEO({
    title: "Enroll in AI Course – Complete Your Registration",
    description: "Complete your enrollment in our expert-led AI course. Fill out your details and start learning today.",
    canonical: "https://www.aicoachportal.com/enroll",
    noIndex: true,
  });

  const { courseId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>("USD");
  const { openCheckout } = useRazorpayCheckout();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    whatsapp_number: "",
    education_qualification: "",
    current_job_title: "",
    industry: "",
    experience_level: "",
    country: "",
    city: "",
    linkedin_profile: "",
    learning_objective: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=/enroll/${courseId}`);
      return;
    }

    const fetchData = async () => {
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", courseId).single();
      setCourse(courseData);

      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(profileData);

      if (profileData) {
        setForm((prev) => ({
          ...prev,
          full_name: profileData.full_name || "",
          email: user.email || "",
          contact_number: profileData.contact_number || "",
          whatsapp_number: profileData.whatsapp_number || "",
          education_qualification: profileData.education || "",
          current_job_title: profileData.job_title || "",
          industry: profileData.industry || "",
          experience_level: profileData.experience_level || "",
          country: profileData.country || "",
          city: profileData.city || "",
          linkedin_profile: profileData.linkedin_profile || "",
        }));
      } else {
        setForm((prev) => ({ ...prev, email: user.email || "" }));
      }

      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, courseId, navigate]);

  // Currency detection: prefer selected country → IP-based fallback.
  // India = INR, everything else = USD. Never converts prices.
  useEffect(() => {
    if (form.country) {
      setCurrency(isIndia(form.country) ? "INR" : "USD");
      return;
    }
    let cancelled = false;
    detectCurrency().then((c) => { if (!cancelled) setCurrency(c); });
    return () => { cancelled = true; };
  }, [form.country]);

  const priceInr = Number(course?.price_inr ?? 0);
  const priceUsd = Number(course?.price_usd ?? 0);
  const displayPrice = currency === "INR"
    ? (priceInr > 0 ? formatINR(priceInr) : "Free")
    : (priceUsd > 0 ? formatUSD(priceUsd) : "Free");

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Per-course payment method override registry.
  // Scalable: future entries can come from an admin-managed table/column
  // (e.g. courses.payment_method = 'payment_link' | 'razorpay_api' | 'stripe' | 'free'
  // and courses.payment_link_url). Until that column exists we resolve here.
  const resolvePaymentMethod = (c: any): { method: "payment_link" | "razorpay_api" | "free"; url?: string } => {
    const priceInr = Number(c?.price_inr ?? 0);
    const priceUsd = Number(c?.price_usd ?? 0);
    const isFree = priceInr <= 0 && priceUsd <= 0;

    // 1. Prefer explicit course columns when present
    if (c?.payment_method === "payment_link" && c?.payment_link_url) {
      return { method: "payment_link", url: c.payment_link_url };
    }
    if (c?.payment_link_url && !c?.payment_method) {
      return { method: "payment_link", url: c.payment_link_url };
    }

    // 2. Hardcoded overrides (interim, until admin UI ships)
    const COURSE_PAYMENT_LINKS: Record<string, string> = {
      "ai automation for beginners": "https://razorpay.com/payment-link/plink_T78Ltjk1BuOkJE",
    };
    const titleKey = String(c?.title ?? "").trim().toLowerCase();
    if (COURSE_PAYMENT_LINKS[titleKey]) {
      return { method: "payment_link", url: COURSE_PAYMENT_LINKS[titleKey] };
    }

    if (isFree) return { method: "free" };
    return { method: "razorpay_api" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !course) return;
    if (submitting) return; // prevent duplicate clicks

    // Persist profile fields up-front (non-blocking on errors)
    await supabase.from("profiles").update({
      contact_number: form.contact_number,
      whatsapp_number: form.whatsapp_number,
      education: form.education_qualification,
      job_title: form.current_job_title,
      industry: form.industry,
      experience_level: form.experience_level,
      country: form.country,
      city: form.city,
      linkedin_profile: form.linkedin_profile,
    }).eq("user_id", user.id);

    const enrollmentData = {
      full_name: form.full_name,
      email: form.email,
      contact_number: form.contact_number,
      whatsapp_number: form.whatsapp_number,
      education_qualification: form.education_qualification,
      current_job_title: form.current_job_title,
      industry: form.industry,
      experience_level: form.experience_level,
      country: form.country,
      city: form.city,
      linkedin_profile: form.linkedin_profile,
      learning_objective: form.learning_objective,
    };

    const pay = resolvePaymentMethod(course);

    if (pay.method === "free") {
      setSubmitting(true);
      const { error } = await supabase.from("enrollments").insert({
        learner_id: user.id,
        course_id: course.id,
        coach_id: course.coach_id,
        payment_status: "free",
        ...enrollmentData,
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Enrollment failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Enrolled successfully!", description: "You can access the course from your dashboard." });
      navigate("/learner/courses");
      return;
    }

    if (pay.method === "payment_link" && pay.url) {
      setSubmitting(true);
      const { error } = await supabase.from("enrollments").insert({
        learner_id: user.id,
        course_id: course.id,
        coach_id: course.coach_id,
        payment_status: "pending",
        ...enrollmentData,
      } as any);
      if (error) {
        setSubmitting(false);
        toast({
          title: "Could not save enrollment",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Redirecting to payment...", description: "Please complete payment in the new tab." });
      // brief delay so the toast renders before navigation
      setTimeout(() => {
        window.location.href = pay.url as string;
      }, 400);
      return;
    }

    // Default: Razorpay API checkout
    setSubmitting(true);
    await openCheckout({
      courseId: course.id,
      currency: currency === "USD" ? "USD" : "INR",
      enrollmentData,
      prefill: { name: form.full_name, email: form.email, contact: form.contact_number },
      onSuccess: () => {
        setSubmitting(false);
        navigate("/learner/courses");
      },
      onDismiss: () => setSubmitting(false),
    });
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 pt-24">
      <div className="container mx-auto max-w-2xl px-4">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-primary">{course.category}</p>
          <h2 className="text-lg font-bold text-foreground">{course.title}</h2>
          <div className="mt-2"><PriceDisplay priceInr={course.price_inr} priceUsd={course.price_usd} originalPriceInr={course.original_price_inr} originalPriceUsd={course.original_price_usd} size="lg" /></div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-foreground">Enrollment Details</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Full Name *</Label>
                <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} required className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email *</Label>
                <Input value={form.email} readOnly className="bg-secondary/50 border-border cursor-not-allowed" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Contact Number *</Label>
                <Input value={form.contact_number} onChange={(e) => updateField("contact_number", e.target.value)} required className="bg-secondary border-border" placeholder="+91 9876543210" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">WhatsApp Number *</Label>
                <Input value={form.whatsapp_number} onChange={(e) => updateField("whatsapp_number", e.target.value)} required className="bg-secondary border-border" placeholder="+91 9876543210" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Education Qualification *</Label>
              <Input value={form.education_qualification} onChange={(e) => updateField("education_qualification", e.target.value)} required className="bg-secondary border-border" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Current Job Title *</Label>
                <Input value={form.current_job_title} onChange={(e) => updateField("current_job_title", e.target.value)} required className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Industry *</Label>
                <Input value={form.industry} onChange={(e) => updateField("industry", e.target.value)} required className="bg-secondary border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Experience Level *</Label>
              <Select value={form.experience_level} onValueChange={(v) => updateField("experience_level", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                  <SelectItem value="advanced">Advanced (5-10 years)</SelectItem>
                  <SelectItem value="expert">Expert (10+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Country *</Label>
                <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} required className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">City *</Label>
                <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} required className="bg-secondary border-border" />
              </div>
            </div>

            <hr className="border-border" />
            <p className="text-xs text-muted-foreground">Optional fields</p>

            <div className="space-y-2">
              <Label className="text-foreground">LinkedIn Profile</Label>
              <Input value={form.linkedin_profile} onChange={(e) => updateField("linkedin_profile", e.target.value)} className="bg-secondary border-border" placeholder="https://linkedin.com/in/..." />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Learning Objective</Label>
              <Textarea value={form.learning_objective} onChange={(e) => updateField("learning_objective", e.target.value)} className="bg-secondary border-border" placeholder="What do you hope to learn?" rows={3} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="glow-lime flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Proceed to Payment"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Enroll;
