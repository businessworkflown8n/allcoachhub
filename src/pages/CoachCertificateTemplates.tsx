import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCertificateTemplates, type CertificateTemplateRow } from "@/hooks/useCertificateTemplates";
import { TemplateCard } from "@/components/coach/templates/TemplateCard";
import { TemplatePreviewModal } from "@/components/coach/templates/TemplatePreviewModal";
import { TemplateCustomizeDialog } from "@/components/coach/templates/TemplateCustomizeDialog";
import { TemplateGalleryFilters } from "@/components/coach/templates/TemplateGalleryFilters";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface CustomizationRow {
  id: string;
  name: string;
  design_config: any;
  orientation: string | null;
  base_template_id: string | null;
  preview_image_url: string | null;
  background_image_url: string | null;
}

export default function CoachCertificateTemplates() {
  const { templates, favorites, loading, reload, toggleFavorite, duplicate } = useCertificateTemplates();
  const [category, setCategory] = useState("all");
  const [orientation, setOrientation] = useState<"all" | "landscape" | "portrait">("all");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [preview, setPreview] = useState<CertificateTemplateRow | null>(null);
  const [customizations, setCustomizations] = useState<CustomizationRow[]>([]);
  const [editing, setEditing] = useState<CustomizationRow | null>(null);

  const loadCustomizations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("coach_template_customizations" as any)
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setCustomizations((data as any) ?? []);
  };

  useEffect(() => { void loadCustomizations(); }, []);

  const filtered = useMemo(() => templates.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (orientation !== "all" && t.orientation !== orientation) return false;
    if (favoritesOnly && !favorites.has(t.id)) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [templates, category, orientation, search, favoritesOnly, favorites]);

  const handleDuplicate = async (t: CertificateTemplateRow) => {
    try {
      await duplicate(t);
      toast.success("Duplicated — open My Customizations to edit");
      void loadCustomizations();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteCustom = async (id: string) => {
    if (!confirm("Delete this customization?")) return;
    await supabase.from("coach_template_customizations" as any).delete().eq("id", id);
    void loadCustomizations();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Certificate Templates</h2>
        <p className="text-sm text-muted-foreground">Browse, preview, favorite, and customize designs to use for your courses, webinars, workshops, and more.</p>
      </div>

      <TemplateGalleryFilters
        category={category} onCategory={setCategory}
        orientation={orientation} onOrientation={setOrientation}
        search={search} onSearch={setSearch}
        favoritesOnly={favoritesOnly} onFavoritesOnly={setFavoritesOnly}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No templates yet. Ask an admin to seed the template library, or check back soon.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isFavorite={favorites.has(t.id)}
              onPreview={() => setPreview(t)}
              onFavorite={() => toggleFavorite(t.id)}
              onDuplicate={() => handleDuplicate(t)}
            />
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <h3 className="text-xl font-semibold mb-3">My Customizations</h3>
        {customizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Duplicate any template above to start customizing.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customizations.map((c) => (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.orientation}</div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteCustom(c.id)} aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TemplatePreviewModal template={preview} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} />
      <TemplateCustomizeDialog
        customization={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => { void loadCustomizations(); void reload(); }}
      />
    </div>
  );
}
