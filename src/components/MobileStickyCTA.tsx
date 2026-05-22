import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mobile-only sticky bottom CTA bar.
 * Appears after the user scrolls past the hero, hides for signed-in users,
 * dismissible per session. Boosts signup conversions on mobile.
 */
const MobileStickyCTA = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" && sessionStorage.getItem("mobile_cta_dismissed") === "1"
  );

  useEffect(() => {
    if (user || dismissed) return;
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [user, dismissed]);

  if (user || dismissed || !visible) return null;

  return (
    <div className="mobile-cta-bar fixed bottom-0 left-0 right-0 z-40 md:hidden animate-fade-in-up">
      <div className="glass-panel-strong mx-3 mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">Start learning AI free</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Join 6,000+ learners today</p>
        </div>
        <Link
          to="/auth?mode=signup"
          className="cta-3d primary sm shrink-0"
        >
          Sign up <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem("mobile_cta_dismissed", "1");
            setDismissed(true);
          }}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MobileStickyCTA;
