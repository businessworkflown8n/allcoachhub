import { Star, Eye, Copy, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CertificateTemplateRow } from "@/hooks/useCertificateTemplates";

interface Props {
  template: CertificateTemplateRow;
  isFavorite: boolean;
  selected?: boolean;
  onPreview: () => void;
  onUse?: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
}

export function TemplateCard({ template, isFavorite, selected, onPreview, onUse, onFavorite, onDuplicate }: Props) {
  const styleTag = (template.style_tags ?? [])[0];
  return (
    <Card className={`overflow-hidden bg-card border-border ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="relative aspect-[16/10] bg-muted">
        {template.preview_image_url ? (
          <img src={template.preview_image_url} alt={template.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No preview</div>
        )}
        {template.is_premium && (
          <Badge className="absolute top-2 left-2 bg-amber-500/90 text-black border-0">
            <Crown className="h-3 w-3 mr-1" /> Premium
          </Badge>
        )}
        <button
          onClick={onFavorite}
          aria-label={isFavorite ? "Unfavorite" : "Favorite"}
          className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background"
        >
          <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{template.name}</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {template.category && <Badge variant="outline" className="text-[10px]">{template.category}</Badge>}
          {template.orientation && <Badge variant="outline" className="text-[10px]">{template.orientation}</Badge>}
          {styleTag && <Badge variant="secondary" className="text-[10px]">{styleTag}</Badge>}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onPreview} className="flex-1">
            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
          </Button>
          {onUse && (
            <Button size="sm" onClick={onUse} className="flex-1">
              {selected ? <Check className="h-3.5 w-3.5 mr-1" /> : null}
              {selected ? "In use" : "Use"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDuplicate} aria-label="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
