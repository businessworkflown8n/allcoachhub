import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, BookOpen, Video, Package as PackageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const REQUIRES_ENROLLMENT_FORM_FIELDS = [
  "full_name", "email", "contact_number", "whatsapp_number", "education_qualification",
  "current_job_title", "industry", "experience_level", "country", "city",
  "linkedin_profile", "learning_objective",
] as const;

const ServicePage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, loading: checkoutLoading } = useRazorpayCheckout();

  const [product, setProduct] = useState<any>(null);
  const [coach, setCoach] = useState<any>(null);
  const [linkedTitle, setLinkedTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(REQUIRES_ENROLLMENT_FORM_FIELDS.map((f) => [f, ""])),
  );

  useSEO({
    title: product ? `${product.title} – AI Coach Portal` : "Service – AI Coach Portal",
    description: product?.short_description || product?.description?.slice(0, 155) || "Buy this service on AI Coach Portal.",
    canonical: `https://www.aicoachportal.com/service/${slug}`,
    ogTitle: product?.title,
    ogImage: product?.cover_image_url,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("digital_products").select("*").eq("slug", slug).maybeSingle();
      if (!data) { setLoading(false); return; }
      setProduct(data);

      const { data: coachProfile } = await supabase.from("profiles").select("full_name, bio, avatar_url").eq("user_id", data.coach_id).maybeSingle();
      setCoach(coachProfile);

      if (data.linked_course_id) {
        const { data: c } = await supabase.from("courses").select("title").eq("id", data.linked_course_id).maybeSingle();
        setLinkedTitle(c?.title ?? null);
      } else if (data.linked_webinar_id) {
        const { data: w } = await supabase.from("webinars").select("title").eq("id", data.linked_webinar_id).maybeSingle();
        setLinkedTitle(w?.title ?? null);
      } else if (data.linked_workshop_id) {
        const { data: w } = await supabase.from("workshops").select("title").eq("id", data.linked_workshop_id).maybeSingle();
        setLinkedTitle(w?.title ?? null);
      }
      setLoading(false);
    };
    if (slug) load();
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data: p }) => {
      setForm((f) => ({
        ...f,
        full_name: p?.full_name || f.full_name,
        email: user.email || f.email,
        contact_number: p?.contact_number || f.contact_number,
      }));
    });
  }, [user]);

  const updateField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">This service could not be found.</p>
        <Link to="/" className="mt-4 text-primary hover:underline">Go back</Link>
      </div>
    );
  }

  const effectivePrice = Number(product.discount_price ?? product.price ?? 0);
  const isPaid = !!product.is_paid && effectivePrice > 0;
  const needsRegistrationForm = !!product.linked_course_id;
  const requiredFields = ["full_name", "email", "contact_number", "industry", "experience_level", "country", "city"];
  const isFormComplete = !needsRegistrationForm || requiredFields.every((k) => form[k]?.trim());

  const buildEnrollmentData = () => (needsRegistrationForm ? form : { full_name: form.full_name, email: form.email, contact_number: form.contact_number });

  const ctaLabel = !isPaid ? (needsRegistrationForm ? "Register Now" : "Get It Free") : product.linked_workshop_id || product.linked_webinar_id ? "Book Now" : "Buy Now";

  const handleCta = async () => {
    if (!user) {
      navigate(`/auth?mode=login&redirect=/service/${slug}`);
      return;
    }
    if (needsRegistrationForm && !isFormComplete) {
      toast({ title: "Please fill in the required fields", variant: "destructive" });
      return;
    }

    if (!isPaid) {
      setSubmitting(true);
      const { data, error } = await (supabase as any).rpc("register_free_digital_product", {
        _product_id: product.id,
        _enrollment_data: buildEnrollmentData(),
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Could not complete registration", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "You're in!", description: data?.already_registered ? "You already have access to this." : "Registration complete." });
      navigate(needsRegistrationForm ? "/learner/courses" : "/learner/payments");
      return;
    }

    openCheckout({
      kind: "digital_product",
      productId: product.id,
      currency: product.currency === "USD" ? "USD" : "INR",
      enrollmentData: buildEnrollmentData(),
      prefill: { name: form.full_name, email: form.email, contact: form.contact_number },
      onSuccess: () => {
        navigate(needsRegistrationForm ? "/learner/courses" : "/learner/payments");
      },
    });
  };

  const linkedIcon = product.linked_course_id ? <BookOpen className="h-4 w-4" /> : product.linked_webinar_id || product.linked_workshop_id ? <Video className="h-4 w-4" /> : <PackageIcon className="h-4 w-4" />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 pt-24">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {product.cover_image_url && (
              <img src={product.cover_image_url} alt={product.title} className="aspect-video w-full rounded-xl object-cover border border-border" />
            )}
            <div>
              <span className="mb-2 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary capitalize">{product.product_type}</span>
              <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
              {product.description && <p className="mt-3 whitespace-pre-line text-muted-foreground">{product.description}</p>}
            </div>

            {linkedTitle && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                {linkedIcon}
                <span>Includes: <strong>{linkedTitle}</strong></span>
              </div>
            )}

            {coach && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Offered by</h3>
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

            {needsRegistrationForm && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-6 text-lg font-semibold text-foreground">Registration Details</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-foreground">Full Name *</Label>
                      <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Email *</Label>
                      <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-foreground">Contact Number *</Label>
                      <Input value={form.contact_number} onChange={(e) => updateField("contact_number", e.target.value)} className="bg-secondary border-border" placeholder="+91 9876543210" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">WhatsApp Number</Label>
                      <Input value={form.whatsapp_number} onChange={(e) => updateField("whatsapp_number", e.target.value)} className="bg-secondary border-border" placeholder="+91 9876543210" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Education Qualification</Label>
                    <Input value={form.education_qualification} onChange={(e) => updateField("education_qualification", e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-foreground">Current Job Title</Label>
                      <Input value={form.current_job_title} onChange={(e) => updateField("current_job_title", e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Industry *</Label>
                      <Input value={form.industry} onChange={(e) => updateField("industry", e.target.value)} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Experience Level *</Label>
                    <Select value={form.experience_level} onValueChange={(v) => updateField("experience_level", v)}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select level" /></SelectTrigger>
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
                      <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">City *</Label>
                      <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="bg-secondary border-border" />
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
                    <Textarea value={form.learning_objective} onChange={(e) => updateField("learning_objective", e.target.value)} className="bg-secondary border-border" rows={3} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                {isPaid ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {product.currency === "USD" ? "$" : "₹"}{effectivePrice.toLocaleString()}
                    </span>
                    {product.discount_price && Number(product.price) > effectivePrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {product.currency === "USD" ? "$" : "₹"}{Number(product.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-primary">Free</span>
                )}
              </div>

              <button
                onClick={handleCta}
                disabled={submitting || checkoutLoading}
                className="glow-lime flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
              >
                {submitting || checkoutLoading ? "Processing..." : ctaLabel}
                {!(submitting || checkoutLoading) && <ArrowRight className="h-4 w-4" />}
              </button>

              {!user && <p className="text-center text-xs text-muted-foreground">You'll be asked to sign in first.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePage;
