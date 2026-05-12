import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type SectionItem = { id: string; visible: boolean };

export const SECTION_LABELS: Record<string, { label: string; locked?: boolean; desc?: string }> = {
  hero: { label: "Hero", locked: true, desc: "Headline + primary CTA (always first)" },
  stats: { label: "Stats / Achievements", desc: "Key numbers row" },
  about: { label: "About Us", desc: "Your story & mission" },
  usp: { label: "Why Choose Us", desc: "Differentiators / USPs" },
  courses: { label: "Courses", desc: "Your published courses" },
  coach_profile: { label: "Coach Profile", desc: "Coach bio card" },
  video: { label: "Intro Video", desc: "Embedded YouTube video" },
  testimonials: { label: "Testimonials", desc: "Social proof" },
  demo: { label: "Demo / Lead Form", desc: "Capture leads" },
  faq: { label: "FAQ", desc: "Frequently asked questions" },
  social: { label: "Social Links", desc: "Footer-style icons" },
  final_cta: { label: "Final CTA", desc: "Closing conversion banner" },
};

export const DEFAULT_SECTION_ORDER: SectionItem[] = [
  { id: "hero", visible: true },
  { id: "stats", visible: true },
  { id: "about", visible: true },
  { id: "usp", visible: true },
  { id: "courses", visible: true },
  { id: "coach_profile", visible: true },
  { id: "video", visible: false },
  { id: "testimonials", visible: true },
  { id: "demo", visible: true },
  { id: "faq", visible: true },
  { id: "social", visible: true },
  { id: "final_cta", visible: true },
];

function SortableRow({ item }: { item: SectionItem }) {
  const meta = SECTION_LABELS[item.id] || { label: item.id };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: meta.locked });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 ${isDragging ? "ring-2 ring-primary" : ""}`}>
      <button {...attributes} {...listeners}
        className={`touch-none ${meta.locked ? "cursor-not-allowed opacity-30" : "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"}`}
        aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{meta.label}</span>
          {meta.locked && <span className="text-[10px] uppercase tracking-wide rounded bg-muted px-1.5 py-0.5 text-muted-foreground">Fixed</span>}
        </div>
        {meta.desc && <p className="text-xs text-muted-foreground truncate">{meta.desc}</p>}
      </div>
      {item.visible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
    </div>
  );
}

interface Props {
  value: SectionItem[];
  onChange: (next: SectionItem[]) => void;
}

const SectionReorder = ({ value, onChange }: Props) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((s) => s.id === active.id);
    const newIndex = value.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    // Keep "hero" pinned to index 0
    const next = arrayMove(value, oldIndex, newIndex);
    const heroIdx = next.findIndex((s) => s.id === "hero");
    if (heroIdx > 0) {
      const [hero] = next.splice(heroIdx, 1);
      next.unshift(hero);
    }
    onChange(next);
  };

  const toggleVisible = (id: string, v: boolean) => {
    onChange(value.map((s) => (s.id === id ? { ...s, visible: v } : s)));
  };

  const reset = () => onChange(DEFAULT_SECTION_ORDER);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Drag to reorder. Toggle to show/hide on your live page.</p>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1"><SortableRow item={item} /></div>
                <Switch
                  checked={item.visible}
                  onCheckedChange={(v) => toggleVisible(item.id, v)}
                  disabled={item.id === "hero"}
                  aria-label={`Toggle ${SECTION_LABELS[item.id]?.label || item.id}`}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SectionReorder;
