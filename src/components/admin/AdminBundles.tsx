import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package } from "lucide-react";

const FEATURE_KEYS = [
  "workshops_access","courses_access","feed_access","messaging_access","paid_content_access",
  "contact_access","profile_picture_access","blueprint_access","materials_access",
];

const labelOf = (k: string) => k.replace(/_access$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan_id: string | null;
  feature_flags: Record<string, boolean>;
  is_active: boolean;
  sort_order: number;
}

interface Plan { id: string; name: string; }

const empty: Partial<Bundle> = { name: "", slug: "", description: "", plan_id: null, feature_flags: {}, is_active: true, sort_order: 0 };

const AdminBundles = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Bundle>>(empty);

  const load = async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from("feature_bundles").select("*").order("sort_order"),
      supabase.from("subscription_plans").select("id,name").order("sort_order"),
    ]);
    setBundles((b as any) || []);
    setPlans((p as any) || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name || !editing.slug) { toast({ title: "Name and slug required", variant: "destructive" }); return; }
    const payload: any = {
      name: editing.name, slug: editing.slug, description: editing.description,
      plan_id: editing.plan_id || null, feature_flags: editing.feature_flags || {},
      is_active: editing.is_active ?? true, sort_order: Number(editing.sort_order) || 0,
    };
    if (editing.id) await supabase.from("feature_bundles").update(payload).eq("id", editing.id);
    else await supabase.from("feature_bundles").insert(payload);
    toast({ title: editing.id ? "Bundle updated" : "Bundle created" });
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this bundle? Coaches assigned to it will lose its defaults.")) return;
    await supabase.from("feature_bundles").delete().eq("id", id);
    toast({ title: "Bundle deleted" });
    load();
  };

  const toggleFlag = (k: string) => {
    const flags = { ...(editing.feature_flags || {}) };
    flags[k] = !flags[k];
    setEditing({ ...editing, feature_flags: flags });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Feature Bundles</h2>
            <p className="text-sm text-muted-foreground">Reusable templates of feature toggles, linked to a plan</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(empty); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" />New Bundle</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "Create"} Bundle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Linked Plan</Label>
                  <Select value={editing.plan_id || "none"} onValueChange={(v) => setEditing({ ...editing, plan_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>

              <div className="border-t pt-3">
                <Label className="text-sm font-semibold">Feature Toggles</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {FEATURE_KEYS.map((k) => (
                    <div key={k} className="flex items-center justify-between rounded-lg border border-border p-2">
                      <span className="text-sm text-foreground">{labelOf(k)}</span>
                      <Switch checked={!!editing.feature_flags?.[k]} onCheckedChange={() => toggleFlag(k)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bundles.map((b) => {
          const enabled = Object.entries(b.feature_flags || {}).filter(([, v]) => v).map(([k]) => k);
          const plan = plans.find((p) => p.id === b.plan_id);
          return (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-foreground">{b.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{b.slug}{plan && ` • ${plan.name}`}</p>
                  </div>
                  <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {b.description && <p className="text-sm text-muted-foreground mb-3">{b.description}</p>}
                <div className="flex flex-wrap gap-1 mb-3">
                  {enabled.length === 0 ? <span className="text-xs text-muted-foreground">No features enabled</span> :
                    enabled.map((k) => <Badge key={k} variant="outline" className="text-xs">{labelOf(k)}</Badge>)}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(b); setOpen(true); }}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminBundles;
