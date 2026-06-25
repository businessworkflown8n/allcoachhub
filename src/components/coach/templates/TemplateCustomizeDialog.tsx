import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { renderCertificateHTML, sampleData, type CertificateDesignConfig } from "@/lib/certificateRenderer";

interface CustomizationRow {
  id: string;
  name: string;
  design_config: CertificateDesignConfig;
  orientation?: string;
  background_image_url?: string | null;
}

interface Props {
  customization: CustomizationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function TemplateCustomizeDialog({ customization, open, onOpenChange, onSaved }: Props) {
  const [name, setName] = useState("");
  const [cfg, setCfg] = useState<CertificateDesignConfig>({});
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customization) {
      setName(customization.name);
      setCfg(customization.design_config ?? {});
      setOrientation((customization.orientation as any) ?? "landscape");
    }
  }, [customization]);

  const set = (patch: Partial<CertificateDesignConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const handleSave = async () => {
    if (!customization) return;
    setSaving(true);
    const { error } = await supabase
      .from("coach_template_customizations" as any)
      .update({ name, design_config: cfg, orientation })
      .eq("id", customization.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Customization saved");
    onSaved?.();
    onOpenChange(false);
  };

  const previewHtml = renderCertificateHTML(
    { ...cfg, backgroundImageUrl: customization?.background_image_url ?? cfg.backgroundImageUrl },
    sampleData(),
    orientation,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader><DialogTitle>Customize Template</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Certificate Title</Label><Input value={cfg.certificateTitle ?? ""} onChange={(e) => set({ certificateTitle: e.target.value })} /></div>
            <div><Label>Badge Text</Label><Input value={cfg.badgeText ?? ""} onChange={(e) => set({ badgeText: e.target.value })} /></div>
            <div><Label>Footer Text</Label><Input value={cfg.footerText ?? ""} onChange={(e) => set({ footerText: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Primary</Label><Input type="color" value={cfg.primaryColor ?? "#0B1A3A"} onChange={(e) => set({ primaryColor: e.target.value })} /></div>
              <div><Label>Accent</Label><Input type="color" value={cfg.accentColor ?? "#C9A14A"} onChange={(e) => set({ accentColor: e.target.value })} /></div>
              <div><Label>Text</Label><Input type="color" value={cfg.textColor ?? "#1a1a1a"} onChange={(e) => set({ textColor: e.target.value })} /></div>
              <div><Label>Background</Label><Input type="color" value={cfg.backgroundColor ?? "#ffffff"} onChange={(e) => set({ backgroundColor: e.target.value })} /></div>
              <div><Label>Border</Label><Input type="color" value={cfg.borderColor ?? "#C9A14A"} onChange={(e) => set({ borderColor: e.target.value })} /></div>
            </div>
            <div>
              <Label>Border Style</Label>
              <Select value={cfg.borderStyle ?? "classic"} onValueChange={(v) => set({ borderStyle: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["classic", "double", "ornate", "minimal", "ribbon", "none"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orientation</Label>
              <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>QR Position</Label>
              <Select value={cfg.qrPosition ?? "bottom-right"} onValueChange={(v) => set({ qrPosition: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Watermark Text</Label><Input value={cfg.watermarkText ?? ""} onChange={(e) => set({ watermarkText: e.target.value })} /></div>
          </div>
          <div className="bg-muted rounded overflow-auto" style={{ maxHeight: "70vh" }}>
            <iframe title="Preview" srcDoc={previewHtml} className="w-full" style={{ height: 600, border: 0, background: "#fff" }} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
