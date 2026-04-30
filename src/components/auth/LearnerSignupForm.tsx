import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { captureEmailSignupSubmission } from "@/lib/signupCapture";

const LearnerSignupForm = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !mobile || !password) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
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
          role: "learner",
          mobile,
          city,
          country,
          ...(referralCode ? { referral_code: referralCode } : {}),
        },
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    // CRITICAL: With email confirmation enabled, the user is NOT signed in after signUp.
    // Use signUpData.user.id directly — supabase.auth.getUser() will return null.
    const newUserId = signUpData?.user?.id ?? null;
    console.log("[LearnerSignup] User created:", newUserId, email);

    // [Additive] Capture full email signup payload (non-blocking)
    captureEmailSignupSubmission({
      userType: "learner",
      email,
      userId: newUserId,
      formData: {
        full_name: fullName,
        email,
        mobile,
        city,
        country,
        referral_code: referralCode,
      },
    });

    // Gather UTM params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get("utm_source") || "";
    const utmMedium = urlParams.get("utm_medium") || "";
    const utmCampaign = urlParams.get("utm_campaign") || "";

    // Send admin notification email (fire-and-forget)
    supabase.functions.invoke("notify-learner-registration", {
      body: { fullName, email, mobile, city, country, referralCode, source: window.location.href, utmSource, utmMedium, utmCampaign },
    }).catch((err) => console.error("Learner registration notification failed:", err));

    // Send welcome email to the learner (fire-and-forget)
    supabase.functions.invoke("welcome-learner-email", {
      body: { fullName, email },
    }).catch((err) => console.error("Welcome learner email failed:", err));

    setSuccess(true);
    navigate("/signup/learner/thank-you-learner", {
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

      <div className="space-y-2">
        <Label htmlFor="referralCode" className="text-foreground">Referral Code <span className="text-muted-foreground">(Optional)</span></Label>
        <Input id="referralCode" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Enter referral code" className="bg-secondary border-border" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="glow-lime flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create Learner Account"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
};

export default LearnerSignupForm;
