import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowRight, GraduationCap, Users2, UserCircle2 } from "lucide-react";
import { trackEvent, pushDataLayer } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.gif";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const INTERESTS = ["AI Tools", "ChatGPT Mastery", "Automation", "Marketing AI", "Business AI"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const getUtmData = () => {
  try {
    const stored = localStorage.getItem("utm_data");
    if (stored) return JSON.parse(stored);
  } catch {}
  const params = new URLSearchParams(window.location.search);
  const data: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
    const v = params.get(k);
    if (v) data[k] = v;
  });
  if (Object.keys(data).length) {
    try { localStorage.setItem("utm_data", JSON.stringify(data)); } catch {}
  }
  return data;
};

const ThankYouLearner = () => {
  const location = useLocation();
  const state = (location.state || {}) as { email?: string; fullName?: string; userId?: string | null };
  const email = state.email || "";
  const utm = useMemo(() => getUtmData(), []);
  const [interest, setInterest] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  // Fire conversion events on load
  useEffect(() => {
    document.title = "You're In! Start Your AI Learning Journey | AI Coach Portal";

    // GA4 sign_up
    trackEvent("sign_up", { method: "Learner" });
    // Auto signup_complete
    trackEvent("signup_complete", {
      role: "learner",
      source: utm.utm_source || "",
      campaign: utm.utm_campaign || "",
      medium: utm.utm_medium || "",
    });

    // Google Ads conversion
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "conversion", {
        send_to: "AW-CONVERSION_ID/learner_signup",
        event_category: "signup",
        event_label: "Learner",
      });
    }

    // Meta Pixel
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {
        content_name: "Learner Signup",
        status: true,
      });
    }

    // Push to DataLayer for GTM/LinkedIn
    pushDataLayer({
      event: "learner_signup_complete",
      user_role: "learner",
      email,
      ...utm,
    });
  }, [email, utm]);

  const selectInterest = async (value: string) => {
    setInterest(value);
    trackEvent("learner_interest_selected", { interest: value, role: "learner" });
    pushDataLayer({ event: "learner_interest_selected", interest: value, ...utm });
    if (state.userId) {
      supabase.from("profiles").update({ category: value }).eq("user_id", state.userId)
        .then(({ error }) => { if (error) console.error("[ThankYouLearner] interest save:", error); });
    }
  };

  const selectLevel = (value: string) => {
    setLevel(value);
    trackEvent("learner_level_selected", { level: value, role: "learner" });
    pushDataLayer({ event: "learner_level_selected", level: value, ...utm });
  };

  const trackCta = (name: string, destination: string) => {
    trackEvent("activation_cta_click", { cta: name, destination, role: "learner" });
    pushDataLayer({ event: "activation_cta_click", cta: name, destination, role: "learner", ...utm });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header / Confirmation */}
        <header className="mb-10 text-center">
          <img src={logo} alt="AI Coach Portal" className="mx-auto mb-4 h-14 w-14 rounded-xl" />
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-10 w-10 text-primary animate-in zoom-in duration-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            You're In! 🚀 Start Your AI Learning Journey
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Verify your email{email ? <> at <strong className="text-foreground">{email}</strong></> : ""} & unlock your first learning path.
          </p>
        </header>

        {/* Primary Activation CTAs */}
        <section className="mb-10 grid gap-3 sm:grid-cols-3">
          <Link
            to="/courses"
            onClick={() => trackCta("Explore Courses", "/courses")}
            className="cta-3d primary flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
          >
            <GraduationCap className="h-4 w-4" /> Explore Courses
          </Link>
          <a
            href="https://wa.me/919852411280?text=Hi%2C%20I%20just%20signed%20up%20on%20AI%20Coach%20Portal"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCta("Join Free Community", "whatsapp")}
            className="cta-3d secondary flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
          >
            <Users2 className="h-4 w-4" /> Join Free Community
          </a>
          <Link
            to="/learner/profile"
            onClick={() => trackCta("Complete Your Profile", "/learner/profile")}
            className="cta-3d secondary flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
          >
            <UserCircle2 className="h-4 w-4" /> Complete Your Profile
          </Link>
        </section>

        {/* Micro Segmentation */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">What do you want to learn?</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((opt) => (
              <button
                key={opt}
                onClick={() => selectInterest(opt)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  interest === opt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-foreground hover:border-primary/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {interest && (
            <p className="mt-3 text-xs text-muted-foreground">Saved: <span className="text-primary">{interest}</span></p>
          )}
        </section>

        {/* Experience Level */}
        <section className="mb-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Your experience level</h2>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((opt) => (
              <button
                key={opt}
                onClick={() => selectLevel(opt)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  level === opt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-foreground hover:border-primary/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link
            to="/learner"
            onClick={() => trackCta("Go to Dashboard", "/learner")}
            className="cta-3d primary inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouLearner;
