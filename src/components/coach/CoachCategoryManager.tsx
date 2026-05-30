import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachCategories } from "@/hooks/useCoachCategories";
import { useCoachCategoryPermissions } from "@/hooks/useCoachCategoryPermissions";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

const CoachCategoryManager = () => {
  const { user } = useAuth();
  const { categories, loading: catLoading } = useCoachCategories(true);
  const { approvedCategories, loading: permLoading, refetch } = useCoachCategoryPermissions(user?.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [primary, setPrimary] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permLoading) {
      setSelected(new Set(approvedCategories.map((c) => c.category_id)));
      const p = approvedCategories.find((c) => c.is_primary);
      if (p) setPrimary(p.category_id);
      else if (approvedCategories[0]) setPrimary(approvedCategories[0].category_id);
    }
  }, [permLoading, approvedCategories.length]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
      if (primary === id) setPrimary(next.values().next().value || "");
    } else {
      next.add(id);
      if (!primary) setPrimary(id);
    }
    setSelected(next);
  };

  const handleSave = async () => {
    if (!user) return;
    if (selected.size === 0) {
      toast({ title: "Select at least one category", variant: "destructive" });
      return;
    }
    setSaving(true);

    const currentIds = new Set(approvedCategories.map((c) => c.category_id));
    const toAdd = [...selected].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !selected.has(id));

    try {
      if (toRemove.length > 0) {
        await supabase
          .from("coach_category_permissions")
          .delete()
          .eq("coach_id", user.id)
          .in("category_id", toRemove);
      }
      if (toAdd.length > 0) {
        await supabase.from("coach_category_permissions").upsert(
          toAdd.map((cid) => ({
            coach_id: user.id,
            category_id: cid,
            is_primary: cid === primary,
            status: "approved",
            approved_at: new Date().toISOString(),
          })),
          { onConflict: "coach_id,category_id" }
        );
      }
      // Reset primary flags then set chosen primary
      await supabase
        .from("coach_category_permissions")
        .update({ is_primary: false })
        .eq("coach_id", user.id);
      if (primary) {
        await supabase
          .from("coach_category_permissions")
          .update({ is_primary: true })
          .eq("coach_id", user.id)
          .eq("category_id", primary);
        // Sync legacy single-category field on profile
        await supabase
          .from("profiles")
          .update({ category_id: primary } as any)
          .eq("user_id", user.id);
      }
      toast({ title: "Categories updated", description: "You'll now appear under the selected categories." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (catLoading || permLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Categories *</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Select one or more categories you teach in. You'll appear on those public Category pages instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {categories.map((cat) => {
          const checked = selected.has(cat.id);
          return (
            <label
              key={cat.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                checked ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-accent/40"
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(cat.id)} />
              <span className="flex-1 text-sm text-foreground">
                {cat.icon ? `${cat.icon} ` : ""}{cat.name}
              </span>
              {checked && primary === cat.id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <CheckCircle2 className="h-3 w-3" /> Primary
                </span>
              )}
            </label>
          );
        })}
      </div>

      {selected.size > 1 && (
        <div className="space-y-2">
          <Label className="text-foreground">Primary category</Label>
          <select
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          >
            {[...selected].map((id) => {
              const cat = categories.find((c) => c.id === id);
              if (!cat) return null;
              return (
                <option key={id} value={id}>
                  {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Categories"}
      </button>
    </div>
  );
};

export default CoachCategoryManager;
