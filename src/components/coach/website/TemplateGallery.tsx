import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  preview_image: string | null;
  theme_color: string;
  hero_variant: string;
  layout_variant: string;
  content_sections: any;
  header_config: any;
  is_premium: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (tpl: Template) => void;
  currentTemplateId?: string | null;
}

const TemplateGallery = ({ open, onOpenChange, onApply, currentTemplateId }: Props) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("coach_website_templates" as any)
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      setTemplates((data as any) || []);
      setLoading(false);
    })();
  }, [open]);

  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];
  const filtered = filter === "All" ? templates : templates.filter((t) => t.category === filter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" /> Premium Website Templates
          </DialogTitle>
          <DialogDescription>
            Pick a ready-made design tuned for conversion. Applying a template updates your hero style, theme color, and content sections — your courses, banner, and logo are kept.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                filter === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground/80 border-border hover:bg-muted"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => {
                const isCurrent = currentTemplateId === t.id;
                return (
                  <div
                    key={t.id}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <div
                      className="h-32 w-full relative"
                      style={{
                        background: `linear-gradient(135deg, ${t.theme_color}, ${t.theme_color}88), radial-gradient(ellipse at top right, #ffffff22, transparent 60%)`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-background font-bold text-lg drop-shadow">{t.name}</span>
                      </div>
                      {t.is_premium && (
                        <Badge className="absolute top-2 right-2 bg-amber-400/90 text-amber-950 text-[10px]">PREMIUM</Badge>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t.category}</span>
                        {isCurrent && <Badge variant="secondary" className="text-[10px] gap-1"><Check className="h-3 w-3" /> Active</Badge>}
                      </div>
                      <p className="text-xs text-foreground/70 line-clamp-2 min-h-[2.5rem]">{t.description}</p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => onApply(t)}
                        style={{ backgroundColor: t.theme_color, color: "#0B0F1A" }}
                      >
                        {isCurrent ? "Re-apply" : "Use this template"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateGallery;
