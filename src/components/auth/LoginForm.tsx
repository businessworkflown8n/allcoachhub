import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { trackLogin, trackPasswordReset, trackFormError } from "@/lib/analytics";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const navigate = useNavigate();

  // Use production domain for OAuth on the live site; fall back to current origin in preview/dev
  const getOAuthRedirectUri = () => {
    const host = window.location.hostname;
    if (host === "www.aicoachportal.com" || host === "aicoachportal.com") {
      return "https://www.aicoachportal.com";
    }
    return window.location.origin;
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: getOAuthRedirectUri(),
    });
    setGoogleLoading(false);
    if (error) {
      console.error("Google OAuth error:", error);
      toast({ title: "Google Sign-In failed", description: String(error), variant: "destructive" });
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const redirectUri = getOAuthRedirectUri();
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: redirectUri,
    });
    setAppleLoading(false);
    if (error) {
      console.error("Apple OAuth error:", error, "redirect_uri:", redirectUri);
      const msg = String(error);
      const isRedirectIssue = msg.toLowerCase().includes("redirect_uri") || msg.toLowerCase().includes("invalid_request");
      toast({
        title: "Apple Sign-In failed",
        description: isRedirectIssue
          ? "This domain isn't authorized for Apple Sign-In yet. Please try on www.aicoachportal.com or contact support."
          : msg,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      trackFormError("login", "credentials");
      const isInvalidCredentials = error.message.toLowerCase().includes("invalid login credentials") || 
                                    error.message.toLowerCase().includes("invalid email or password");
      toast({
        title: isInvalidCredentials ? "Email not registered" : "Login failed",
        description: isInvalidCredentials 
          ? "This email is not registered yet. Please complete the signup process first."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    trackLogin("email");

    // Redirect based on user role
    if (authData?.user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (roleData?.role === "coach") {
        navigate("/coach");
      } else if (roleData?.role === "learner") {
        navigate("/learner");
      } else if (roleData?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } else {
      navigate("/");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "A password reset link has been sent to your email." });
      setShowReset(false);
    }
  };

  if (showReset) {
    return (
      <form onSubmit={handleResetPassword} className="space-y-5">
        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-foreground">Email</Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="bg-secondary border-border"
          />
        </div>
        <button
          type="submit"
          disabled={resetLoading}
          className="glow-lime flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {resetLoading ? "Sending..." : "Send Reset Link"}
          {!resetLoading && <ArrowRight className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => setShowReset(false)} className="w-full text-sm text-primary hover:underline">
          Back to Sign In
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-foreground">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password" className="text-foreground">Password</Label>
          <button type="button" onClick={() => setShowReset(true)} className="text-xs text-primary hover:underline">
            Forgot Password?
          </button>
        </div>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          required
          className="bg-secondary border-border"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="glow-lime flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {googleLoading ? "Connecting..." : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={appleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-foreground px-4 py-3 font-medium text-background transition-all hover:opacity-90 disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        {appleLoading ? "Connecting..." : "Continue with Apple"}
      </button>
    </form>
  );
};

export default LoginForm;
