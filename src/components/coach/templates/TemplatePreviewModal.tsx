import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { renderCertificateHTML, sampleData } from "@/lib/certificateRenderer";
import type { CertificateTemplateRow } from "@/hooks/useCertificateTemplates";
import { Button } from "@/components/ui/button";

interface Props {
  template: CertificateTemplateRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse?: () => void;
}

export function TemplatePreviewModal({ template, open, onOpenChange, onUse }: Props) {
  if (!template) return null;
  const html = renderCertificateHTML(
    { ...(template.design_config ?? {}), backgroundImageUrl: template.background_image_url ?? undefined },
    sampleData(),
    (template.orientation as any) ?? "landscape",
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
        </DialogHeader>
        <div className="w-full overflow-auto bg-muted rounded-md" style={{ maxHeight: "70vh" }}>
          <iframe
            title="Certificate preview"
            srcDoc={html}
            className="w-full"
            style={{ height: 600, border: 0, background: "#fff" }}
          />
        </div>
        {onUse && (
          <div className="flex justify-end">
            <Button onClick={onUse}>Use this template</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
