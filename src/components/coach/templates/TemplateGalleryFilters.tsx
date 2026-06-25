import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search } from "lucide-react";

export const TEMPLATE_CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "corporate", label: "Professional Corporate" },
  { value: "ai", label: "AI Certification" },
  { value: "minimal", label: "Modern Minimal" },
  { value: "luxury", label: "Luxury" },
  { value: "education", label: "Education" },
  { value: "creative", label: "Creative" },
  { value: "webinar", label: "Webinar" },
  { value: "course", label: "Course Completion" },
  { value: "workshop", label: "Workshop" },
  { value: "dark", label: "Premium Dark" },
];

interface Props {
  category: string;
  onCategory: (v: string) => void;
  orientation: "all" | "landscape" | "portrait";
  onOrientation: (v: "all" | "landscape" | "portrait") => void;
  search: string;
  onSearch: (v: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnly: (v: boolean) => void;
}

export function TemplateGalleryFilters({
  category, onCategory, orientation, onOrientation, search, onSearch, favoritesOnly, onFavoritesOnly,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search templates…"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_CATEGORIES.map((c) => (
          <Button
            key={c.value}
            size="sm"
            variant={category === c.value ? "default" : "outline"}
            onClick={() => onCategory(c.value)}
          >
            {c.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "landscape", "portrait"] as const).map((o) => (
          <Button
            key={o}
            size="sm"
            variant={orientation === o ? "secondary" : "ghost"}
            onClick={() => onOrientation(o)}
          >
            {o}
          </Button>
        ))}
        <Button
          size="sm"
          variant={favoritesOnly ? "secondary" : "ghost"}
          onClick={() => onFavoritesOnly(!favoritesOnly)}
        >
          <Star className={`h-3.5 w-3.5 mr-1 ${favoritesOnly ? "fill-amber-400 text-amber-400" : ""}`} />
          Favorites
        </Button>
      </div>
    </div>
  );
}
