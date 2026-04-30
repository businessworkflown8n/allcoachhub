import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowRight, BookOpen, DollarSign, Calendar } from "lucide-react";
import { trackEvent, pushDataLayer } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.gif";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const OFFER_TYPES = ["Courses", "1:1 Coaching", "Webinars", "Digital Products"];
const REVENUE_TIERS = ["< $1K", "$1K–$5K", "$5K+"];

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

const ThankYouCoach = () => {
  const location = useLocation();
  const state = (location.state || {}) as { email?: string; fullName?: string; userId?: string | null };
  const email = state.email || "";
  const utm = useMemo(() => getUtmData(), []);
  const [offerType, setOfferType] = useState<string | null>(null);
  const [revenueIntent, setRevenueIntent] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Welcome Coach! Start Earning with AI | AI Coach Portal";

    trackEvent("sign_up", { method: "Coach" });
    trackEvent("signup_complete", {
      role: "coach",
      source: utm.utm_source || "",
      campaign: utm.utm_campaign || "",
      medium: utm.utm_medium || "",
    });

    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "conversion", {
        send_to: "AW-CONVERSION_ID/coach_signup",
        event_category: "signup",
        event_label: "Coach",
      });
    }

    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {
        content_name: "Coach Signup",
        status: true,
      });
    }

    pushDataLayer({
      event: "coach_signup_complete",
      user_role: "coach",
      email,
      ...utm,
    });
  }, [email, utm]);

  const selectOffer = async (value: string) => {
    setOfferType(value);
    trackEvent("coach_offer_type", { type: value, role: "coach" });
    pushDataLayer({ event: "coach_offer_type", type: value, ...utm });
    if (state.userId) {
      supabase.from("profiles").update({ category: value }).eq("user_id", state.userId)
        .then(({ error }) => { if (error) console.error("[ThankYouCoach] offer save:", error); });
    }
  };

  const selectRevenue = (value: string) => {
    setRevenueIntent(value);
    trackEvent("coach_revenue_intent", { intent: value, role: "coach" });
    pushDataLayer({ event: "coach_revenue_intent", intent: value, ...utm });
  };

  const trackCta = (name: string, destination: string) => {
    trackEvent("activation_cta_click", { cta: name, destination, role: "coach" });
    pushDataLayer({ event: "activation_cta_click", cta: name, destination, role: "coach", ...utm });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <img src={logo} alt="AI Coach Portal" className="mx-auto mb-4 h-14 w-14 rounded-xl" />
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-10 w-10 text-primary animate-in zoom-in duration-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Welcome Coach! Start Earning with AI 🚀
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Set up your first product & go live{email ? <> — verification sent to <strong className="text-foreground">{email}</strong></> : ""}.
          </p>
        </header>

        {/* Revenue Activation CTAs */}
        <section className="mb-10 grid gap-3 sm:grid-cols-3">
          <Link
            to="/coach/courses"
            onClick={() => trackCta("Create Your First Course", "/coach/courses")}
            className="cta-3d primary flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
          >
            <BookOpen className="h-4 w-4" /> Create First Course
          </Link>
          <Link
            to="/coach/courses"
            onClick={() => trackCta("Set Pricing", "/coach/courses")}
            className="cta-3d secondary flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
          >
            <DollarSign className="h-4 w-4" /> Set Pricing
          </Link>
          <Link
            to="/coach/webinars"
            onClick={() => trackCta("Schedule Live Session", "/coach/webinars")}
            className="cta-3d secondary flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
          >
            <Calendar className="h-4 w-4" /> Schedule Live Session
          </Link>
        </section>

        {/* Offer segmentation */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">What will you offer?</h2>
          <div className="flex flex-wrap gap-2">
            {OFFER_TYPES.map((opt) => (
              <button
                key={opt}
                onClick={() => selectOffer(opt)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  offerType === opt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-foreground hover:border-primary/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Revenue Intent */}
        <section className="mb-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Expected monthly earnings?</h2>
          <div className="flex flex-wrap gap-2">
            {REVENUE_TIERS.map((opt) => (
              <button
                key={opt}
                onClick={() => selectRevenue(opt)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  revenueIntent === opt
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
            to="/coach"
            onClick={() => trackCta("Go to Dashboard", "/coach")}
            className="cta-3d primary inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouCoach;
