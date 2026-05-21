import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

type PopupCampaign = {
  id: string;
  subject: string;
  content: string;
  cta_text: string | null;
  cta_link: string | null;
};

const WebsitePopup = () => {
  const [popup, setPopup] = useState<PopupCampaign | null>(null);
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  // Don't show popups on admin/coach/learner dashboard routes
  const isDashboard = /^\/(admin|coach|learner)/.test(location.pathname);

  useEffect(() => {
    if (isDashboard) return;

    const fetchPopup = async () => {
      // Get dismissed popup IDs from sessionStorage
      const dismissed = JSON.parse(sessionStorage.getItem("dismissed_popups") || "[]");

      const { data } = await supabase
        .from("email_campaigns")
        .select("id, subject, content, cta_text, cta_link")
        .eq("channel", "web")
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0 && !dismissed.includes(data[0].id)) {
        setPopup(data[0] as PopupCampaign);
        // Small delay for entrance animation
        setTimeout(() => setVisible(true), 500);
      }
    };

    fetchPopup();
  }, [isDashboard, location.pathname]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      if (popup) {
        const dismissed = JSON.parse(sessionStorage.getItem("dismissed_popups") || "[]");
        dismissed.push(popup.id);
        sessionStorage.setItem("dismissed_popups", JSON.stringify(dismissed));
      }
      setPopup(null);
    }, 300);
  };

  if (!popup || isDashboard) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={dismiss}
      />

      {/* Popup */}
      <div
        className={`fixed inset-0 z-[101] flex items-center justify-center p-4 transition-all duration-300 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header accent */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-accent" />

          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 pt-5">
            {/* Icon */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Announcement</span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-foreground mb-2 pr-6">
              {popup.subject}
            </h3>

            {/* Content */}
            <div className="text-sm text-muted-foreground leading-relaxed mb-5 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {popup.content}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {popup.cta_text && popup.cta_link && (
                <Button asChild className="gap-2 flex-1">
                  <a
                    href={popup.cta_link}
                    target={popup.cta_link.startsWith("http") ? "_blank" : undefined}
                    rel={popup.cta_link.startsWith("http") ? "noopener noreferrer" : undefined}
                    onClick={dismiss}
                  >
                    {popup.cta_text}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={dismiss} className="shrink-0">
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebsitePopup;
