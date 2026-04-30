import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCoachCategories } from "@/hooks/useCoachCategories";
import { captureEmailSignupSubmission } from "@/lib/signupCapture";

const CoachSignupForm = () => {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useCoachCategories(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !mobile || !password || !companyName || !categoryId) {
      toast({ title: "Missing fields", description: "Please fill in all required fields including category.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          role: "coach",
          mobile,
          company_name: companyName,
          city,
          country,
        },
      },
    });

    if (error) {
      setLoading(false);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    // CRITICAL: With email confirmation enabled, the user is NOT signed in after signUp.
    // We must use signUpData.user.id directly — supabase.auth.getUser() will return null.
    const newUserId = signUpData?.user?.id ?? null;
    console.log("[CoachSignup] User created:", newUserId, email);

    // [Additive] Capture full email signup payload (non-blocking)
    captureEmailSignupSubmission({
      userType: "coach",
      email,
      userId: newUserId,
      formData: {
        full_name: fullName,
        email,
        mobile,
        company_name: companyName,
        category_id: categoryId,
        expertise,
        experience,
        bio,
        city,
        country,
      },
    });

    // Update profile with extra coach fields after signup (fire-and-forget; trigger
    // already inserted the base profile from raw_user_meta_data).
    if (newUserId) {
      supabase.from("profiles").update({
        bio,
        experience,
        category: expertise,
        category_id: categoryId,
      }).eq("user_id", newUserId).then(({ error: profileErr }) => {
        if (profileErr) console.error("[CoachSignup] Profile update failed:", profileErr);
      });

      // Auto-create primary category permission
      if (categoryId) {
        supabase.from("coach_category_permissions").upsert({
          coach_id: newUserId,
          category_id: categoryId,
          is_primary: true,
          status: "approved",
          approved_at: new Date().toISOString(),
        }, { onConflict: "coach_id,category_id" }).then(({ error: catErr }) => {
          if (catErr) console.error("[CoachSignup] Category permission failed:", catErr);
        });
      }
    }

    // Send admin notification email (fire-and-forget)
    supabase.functions.invoke("notify-coach-registration", {
      body: { fullName, email, mobile, companyName, expertise, city, country },
    }).catch((err) => console.error("Coach registration notification failed:", err));

    // Send welcome email to the coach (fire-and-forget)
    supabase.functions.invoke("welcome-coach-email", {
      body: { fullName, email },
    }).catch((err) => console.error("Welcome coach email failed:", err));

    // Notify all learners about new coach (fire-and-forget)
    supabase.functions.invoke("notify-new-coach-to-learners", {
      body: { coachName: fullName, expertise, bio, coachUserId: newUserId },
    }).catch((err) => console.error("Learner notification failed:", err));

    setLoading(false);
    setSuccess(true);
    navigate("/signup/coach/thank-you-coach", {
      state: { email, fullName, userId: newUserId },
      replace: true,
    });
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setResendLoading(false);

    if (error) {
      toast({
        title: "Failed to resend",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email sent!",
        description: "A new verification link has been sent to your email.",
      });
    }
  };

  if (success) {
    return (
      <div className="py-8 text-center space-y-4">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h3 className="mb-2 text-lg font-semibold text-foreground">Thank You For Registration!</h3>
        <p className="text-sm text-muted-foreground">
          Please verify your Email ID for further use. We've sent a verification link to <strong className="text-foreground">{email}</strong>.
        </p>
        <Button
          onClick={handleResendVerification}
          disabled={resendLoading}
          variant="outline"
          className="mt-4"
        >
          {resendLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Resending...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend Verification Email
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-foreground">Full Name *</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required className="bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">Email *</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile" className="text-foreground">Phone Number *</Label>
        <Input id="mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 9876543210" required className="bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyName" className="text-foreground">Company / Brand Name *</Label>
        <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company or brand" required className="bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-foreground">Category *</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categoriesLoading ? (
              <SelectItem value="loading" disabled>Loading...</SelectItem>
            ) : categories.length === 0 ? (
              <SelectItem value="none" disabled>No categories available</SelectItem>
            ) : categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!categoryId && <p className="text-xs text-destructive">Please select a category</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expertise" className="text-foreground">Area of Expertise</Label>
        <Input id="expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="e.g. Prompt Engineering, AI Agents" className="bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience" className="text-foreground">Experience</Label>
        <Input id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 5+ years in AI/ML" className="bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-foreground">Short Bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself and your teaching approach..." rows={3} className="bg-secondary border-border resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="city" className="text-foreground">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country" className="text-foreground">Country</Label>
          <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Your country" className="bg-secondary border-border" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground">Password *</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required className="bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password *</Label>
        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" minLength={6} required className="bg-secondary border-border" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="glow-lime flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create Coach Account"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
};

export default CoachSignupForm;
