import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TEMPLATE_CATEGORIES } from "@/components/coach/templates/TemplateGalleryFilters";
import { TemplatePreviewModal } from "@/components/coach/templates/TemplatePreviewModal";
import { Eye, Plus, Sparkles, Trash2, Pencil } from "lucide-react";
import type { CertificateTemplateRow } from "@/hooks/useCertificateTemplates";

const EMPTY: Partial<CertificateTemplateRow> = {
  name: "",
  category: "corporate",
  orientation: "landscape",
  is_premium: false,
  is_active: true,
  is_system: false,
  style_tags: [],
  supported_sources: ["course", "webinar", "workshop", "masterclass", "challenge", "membership", "event"],
  design_config: {
    primaryColor: "#0B1A3A",
    accentColor: "#C9A14A",
    borderStyle: "classic",
    certificateTitle: "Certificate of Completion",
    footerText: "Issued via AI Coach Portal",
  },
};

export default function AdminCertificateTemplateManager() {
  const [rows, setRows] = useState<CertificateTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editing, setEditing] = useState<Partial<CertificateTemplateRow> | null>(null);
  const [preview, setPreview] = useState<CertificateTemplateRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("certificate_templates").select("*").order("name");
    setRows((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const uploadAsset = async (file: File, kind: "preview" | "background"): Promise<string | null> => {
    if (!file.type.startsWith("image/")) { toast.error("Image files only"); return null; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return null; }
    const ext = file.name.split(".").pop() || "png";
    const path = `${kind}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("certificate-templates").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { toast.error(error.message); return null; }
    const { data } = await supabase.storage.from("certificate-templates").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    return data?.signedUrl ?? null;
  };

  const save = async () => {
    if (!editing?.name) { toast.error("Name is required"); return; }
    const payload: any = {
      name: editing.name,
      category: editing.category,
      orientation: editing.orientation,
      is_premium: editing.is_premium ?? false,
      is_active: editing.is_active ?? true,
      is_system: editing.is_system ?? false,
      style_tags: editing.style_tags ?? [],
      supported_sources: editing.supported_sources ?? [],
      preview_image_url: editing.preview_image_url ?? null,
      background_image_url: editing.background_image_url ?? null,
      design_config: editing.design_config ?? {},
    };
    const { error } = editing.id
      ? await supabase.from("certificate_templates").update(payload).eq("id", editing.id)
      : await supabase.from("certificate_templates").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete template?")) return;
    const { error } = await supabase.from("certificate_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const toggle = async (id: string, field: "is_active" | "is_premium", value: boolean) => {
    await supabase.from("certificate_templates").update({ [field]: value } as any).eq("id", id);
    void load();
  };

  const seed = async () => {
    setSeeding(true);
    const { data, error } = await supabase.functions.invoke("seed-certificate-templates", { body: {} });
    setSeeding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Seeded ${data?.inserted ?? 0} templates`);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Template Library</h3>
          <p className="text-sm text-muted-foreground">Manage certificate templates available to coaches.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seed} disabled={seeding}>
            <Sparkles className="h-4 w-4 mr-1" /> {seeding ? "Seeding…" : "Seed default library"}
          </Button>
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4 mr-1" /> New template
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No templates yet. Click "Seed default library" to populate the 30+ starter designs.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((t) => (
            <Card key={t.id} className="p-3 space-y-2">
              <div className="aspect-[16/10] bg-muted rounded overflow-hidden">
                {t.preview_image_url
                  ? <img src={t.preview_image_url} alt={t.name} loading="lazy" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No preview</div>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{t.name}</div>
                {t.is_system && <Badge variant="outline" className="text-[10px]">system</Badge>}
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.orientation}</Badge>
                {t.is_premium && <Badge className="text-[10px] bg-amber-500/90 text-black border-0">Premium</Badge>}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1"><Switch checked={!!t.is_active} onCheckedChange={(v) => toggle(t.id, "is_active", v)} /> Active</label>
                <label className="flex items-center gap-1"><Switch checked={!!t.is_premium} onCheckedChange={(v) => toggle(t.id, "is_premium", v)} /> Premium</label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreview(t)} className="flex-1"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={editing.category ?? "corporate"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Orientation</Label>
                <Select value={editing.orientation ?? "landscape"} onValueChange={(v) => setEditing({ ...editing, orientation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Preview Image URL</Label><Input value={editing.preview_image_url ?? ""} onChange={(e) => setEditing({ ...editing, preview_image_url: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Background Image URL</Label><Input value={editing.background_image_url ?? ""} onChange={(e) => setEditing({ ...editing, background_image_url: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <Label>Design config (JSON)</Label>
                <textarea
                  className="w-full min-h-[140px] rounded-md border border-input bg-background p-2 text-sm font-mono"
                  value={JSON.stringify(editing.design_config ?? {}, null, 2)}
                  onChange={(e) => {
                    try { setEditing({ ...editing, design_config: JSON.parse(e.target.value) }); } catch { /* ignore */ }
                  }}
                />
              </div>
              <label className="flex items-center gap-2"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Active</label>
              <label className="flex items-center gap-2"><Switch checked={!!editing.is_premium} onCheckedChange={(v) => setEditing({ ...editing, is_premium: v })} /> Premium</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplatePreviewModal template={preview} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} />
    </div>
  );
}
