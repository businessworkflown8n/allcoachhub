import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Sparkles, GraduationCap, Award, Users, ShieldCheck, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "exit_intent_shown";
const DELAY_MS = 10000;
const EXCLUDED = [
  /^\/admin/, /^\/coach/, /^\/learner/,
  /^\/login/, /^\/signup/, /^\/auth/,
  /^\/enroll/, /^\/learn/, /^\/reset-password/,
  /thank-you/, /^\/invoice/, /^\/oauth-callback/,
];

const track = (event: string) => {
  try {
    (window as any).gtag?.("event", event, { event_category: "exit_intent" });
    (window as any).fbq?.("trackCustom", event);
  } catch {}
};

const ExitIntentPopup = () => {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const excluded = EXCLUDED.some((r) => r.test(location.pathname));

  useEffect(() => {
    if (excluded) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setArmed(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [excluded]);

  useEffect(() => {
    if (!armed || excluded) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const trigger = () => {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, "1");
      setOpen(true);
      track("exit_popup_shown");
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    // Mobile: back button intent via history state
    const pushState = () => window.history.pushState({ exitGuard: true }, "");
    pushState();
    const onPopState = () => {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        trigger();
        pushState();
      }
    };

    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("popstate", onPopState);
    };
  }, [armed, excluded]);

  if (!open) return null;

  const close = (reason: "close" | "continue") => {
    setOpen(false);
    track(reason === "continue" ? "exit_popup_continue_clicked" : "exit_popup_closed");
  };

  const goCourses = () => {
    track("exit_popup_browse_courses_clicked");
    setOpen(false);
    navigate("/courses");
  };

  const trust = [
    { icon: GraduationCap, label: "Expert-Led AI Courses" },
    { icon: InfinityIcon, label: "Lifetime Access" },
    { icon: Award, label: "Certificates" },
    { icon: Users, label: "Community Support" },
    { icon: ShieldCheck, label: "Secure Payments" },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => close("close")}
      />
      <div className="relative w-full max-w-lg animate-scale-in">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e1b4b]/95 via-[#312e81]/95 to-[#6b21a8]/95 backdrop-blur-xl shadow-[0_25px_80px_-10px_rgba(139,92,246,0.5)]">
          {/* Glow orbs */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/30 blur-3xl" />

          <button
            onClick={() => close("close")}
            className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative p-7 sm:p-8 text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg shadow-purple-500/40">
              <Sparkles className="h-8 w-8 text-white" />
            </div>

            <h2 id="exit-intent-title" className="text-center text-2xl sm:text-3xl font-bold leading-tight">
              🚀 Wait! Your AI Learning Journey Starts Here
            </h2>
            <p className="mt-3 text-center text-sm sm:text-base text-white/80 leading-relaxed">
              Don't miss the opportunity to learn from industry experts, build AI skills, launch your coaching business, and access premium courses. Continue your journey with AI Coach Portal.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => close("continue")}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-purple-500/40 h-11"
              >
                Continue Exploring
              </Button>
              <Button
                onClick={goCourses}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white h-11"
              >
                Browse Courses
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2">
              {trust.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-white/80">
                  <Icon className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => close("close")}
              className="mt-5 mx-auto block text-xs text-white/60 hover:text-white underline underline-offset-4"
            >
              Close & Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
