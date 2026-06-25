import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TemplateCard } from "./TemplateCard";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import { TemplateGalleryFilters, TEMPLATE_CATEGORIES } from "./TemplateGalleryFilters";
import { useCertificateTemplates, type CertificateTemplateRow } from "@/hooks/useCertificateTemplates";
import { Award, X } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (templateId: string | null, template: CertificateTemplateRow | null) => void;
  sourceType?: "course" | "webinar" | "workshop" | "masterclass" | "challenge" | "membership" | "event";
}

export function CertificateTemplatePicker({ value, onChange, sourceType }: Props) {
  const { templates, favorites, loading, toggleFavorite } = useCertificateTemplates();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [orientation, setOrientation] = useState<"all" | "landscape" | "portrait">("all");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [preview, setPreview] = useState<CertificateTemplateRow | null>(null);
  const [selectedTpl, setSelectedTpl] = useState<CertificateTemplateRow | null>(null);

  useEffect(() => {
    if (!value) { setSelectedTpl(null); return; }
    const found = templates.find((t) => t.id === value);
    if (found) setSelectedTpl(found);
  }, [value, templates]);

  // If passed a value not in active list, fetch it separately
  useEffect(() => {
    if (!value || selectedTpl) return;
    (async () => {
      const { data } = await supabase.from("certificate_templates").select("*").eq("id", value).maybeSingle();
      if (data) setSelectedTpl(data as any);
    })();
  }, [value, selectedTpl]);

  const filtered = templates.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (orientation !== "all" && t.orientation !== orientation) return false;
    if (sourceType && t.supported_sources && t.supported_sources.length > 0 && !t.supported_sources.includes(sourceType)) return false;
    if (favoritesOnly && !favorites.has(t.id)) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-3 rounded-md border border-border bg-muted/40">
        <Award className="h-4 w-4 text-primary" />
        <div className="flex-1 text-sm">
          {selectedTpl ? (
            <>
              <div className="font-medium">{selectedTpl.name}</div>
              <div className="text-xs text-muted-foreground">
                {TEMPLATE_CATEGORIES.find((c) => c.value === selectedTpl.category)?.label ?? selectedTpl.category} · {selectedTpl.orientation}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">No template selected — a default will be used.</span>
          )}
        </div>
        {selectedTpl && (
          <Button size="sm" variant="ghost" onClick={() => onChange(null, null)} aria-label="Clear">
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Choose template</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Choose a certificate template</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2">
            <TemplateGalleryFilters
              category={category} onCategory={setCategory}
              orientation={orientation} onOrientation={setOrientation}
              search={search} onSearch={setSearch}
              favoritesOnly={favoritesOnly} onFavoritesOnly={setFavoritesOnly}
            />
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading templates…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No templates match these filters.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isFavorite={favorites.has(t.id)}
                    selected={value === t.id}
                    onPreview={() => setPreview(t)}
                    onUse={() => { onChange(t.id, t); setOpen(false); }}
                    onFavorite={() => toggleFavorite(t.id)}
                    onDuplicate={() => setPreview(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TemplatePreviewModal
        template={preview}
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        onUse={() => { if (preview) { onChange(preview.id, preview); setPreview(null); setOpen(false); } }}
      />
    </div>
  );
}
