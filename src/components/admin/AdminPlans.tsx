import { useEffect, useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, CreditCard, Star, Layers, Search } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  sort_order: number;
  is_active: boolean;
  highlight: boolean;
}

interface FeatureMaster {
  feature_key: string;
  name: string;
  description: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
}

interface PlanBundle {
  id: string;
  plan_id: string;
  feature_flags: Record<string, boolean>;
}

const empty: Partial<Plan> = { name: "", slug: "", description: "", price: 0, currency: "INR", billing_interval: "monthly", sort_order: 0, is_active: true, highlight: false };

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [bundles, setBundles] = useState<PlanBundle[]>([]);
  const [features, setFeatures] = useState<FeatureMaster[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Plan>>(empty);

  // Feature management dialog
  const [featPlan, setFeatPlan] = useState<Plan | null>(null);
  const [featFlags, setFeatFlags] = useState<Record<string, boolean>>({});
  const [featSearch, setFeatSearch] = useState("");
  const [savingFeat, setSavingFeat] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: b }, { data: f }] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("feature_bundles").select("id,plan_id,feature_flags").not("plan_id", "is", null),
      supabase.from("features_master").select("feature_key,name,description,category,sort_order,is_active").eq("is_active", true).order("category").order("sort_order"),
    ]);
    setPlans((p as Plan[]) || []);
    setBundles((b as any) || []);
    setFeatures((f as any) || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name || !editing.slug) { toast({ title: "Name and slug required", variant: "destructive" }); return; }
    const payload = { ...editing, price: Number(editing.price) || 0, sort_order: Number(editing.sort_order) || 0 };
    if (editing.id) await supabase.from("subscription_plans").update(payload).eq("id", editing.id);
    else await supabase.from("subscription_plans").insert(payload as any);
    toast({ title: editing.id ? "Plan updated" : "Plan created" });
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan? Coaches assigned to it will become unassigned.")) return;
    await supabase.from("subscription_plans").delete().eq("id", id);
    toast({ title: "Plan deleted" });
    load();
  };

  const bundleFor = (planId: string) => bundles.find((b) => b.plan_id === planId);
  const enabledCount = (planId: string) => Object.values(bundleFor(planId)?.feature_flags || {}).filter(Boolean).length;

  const openFeatures = (p: Plan) => {
    const b = bundleFor(p.id);
    setFeatPlan(p);
    setFeatFlags({ ...(b?.feature_flags || {}) });
    setFeatSearch("");
  };

  const toggleFeat = (key: string) => setFeatFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  const categorized = useMemo(() => {
    const q = featSearch.trim().toLowerCase();
    const list = q
      ? features.filter((f) => f.name.toLowerCase().includes(q) || f.feature_key.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
      : features;
    return list.reduce<Record<string, FeatureMaster[]>>((acc, f) => {
      (acc[f.category] = acc[f.category] || []).push(f);
      return acc;
    }, {});
  }, [features, featSearch]);

  const toggleCategory = (cat: string, on: boolean) => {
    const next = { ...featFlags };
    (categorized[cat] || []).forEach((f) => { next[f.feature_key] = on; });
    setFeatFlags(next);
  };

  const saveFeatures = async () => {
    if (!featPlan) return;
    setSavingFeat(true);
    const existing = bundleFor(featPlan.id);
    const cleanFlags = Object.fromEntries(Object.entries(featFlags).filter(([, v]) => v));
    if (existing) {
      await supabase.from("feature_bundles").update({ feature_flags: cleanFlags }).eq("id", existing.id);
    } else {
      await supabase.from("feature_bundles").insert({
        name: `${featPlan.name} Features`,
        slug: `plan-${featPlan.slug}`,
        plan_id: featPlan.id,
        feature_flags: cleanFlags,
        is_active: true,
        sort_order: featPlan.sort_order,
      } as any);
    }
    toast({ title: "Plan features updated", description: `${Object.keys(cleanFlags).length} features enabled for ${featPlan.name}` });
    setSavingFeat(false);
    setFeatPlan(null);
    load();
  };

  const totalEnabled = Object.values(featFlags).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Subscription Plans</h2>
            <p className="text-sm text-muted-foreground">Define pricing tiers and choose features included in each plan</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(empty); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" />New Plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "Create"} Plan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) })} /></div>
                <div><Label>Currency</Label><Input value={editing.currency || "INR"} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} /></div>
                <div><Label>Interval</Label>
                  <Select value={editing.billing_interval || "monthly"} onValueChange={(v) => setEditing({ ...editing, billing_interval: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem><SelectItem value="lifetime">Lifetime</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) })} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={editing.highlight ?? false} onCheckedChange={(v) => setEditing({ ...editing, highlight: v })} /><Label>Highlighted</Label></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => {
          const count = enabledCount(p.id);
          return (
            <Card key={p.id} className={p.highlight ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-foreground">{p.name}{p.highlight && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}</CardTitle>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{p.currency} {p.price}<span className="text-xs font-normal text-muted-foreground">/{p.billing_interval}</span></p>
                {p.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.description}</p>}
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs text-foreground">
                    <span className="font-semibold">{count}</span> feature{count === 1 ? "" : "s"} enabled
                  </span>
                  <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => openFeatures(p)}>
                    {count === 0 ? "Choose features" : "Manage"}
                  </Button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Features-per-plan dialog */}
      <Dialog open={!!featPlan} onOpenChange={(v) => !v && setFeatPlan(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Features for {featPlan?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Choose which platform features are included in this plan. Coaches on this plan will receive these as defaults.</p>
          </DialogHeader>

          <div className="flex items-center gap-3 pb-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search features..." value={featSearch} onChange={(e) => setFeatSearch(e.target.value)} />
            </div>
            <Badge variant="outline" className="whitespace-nowrap">{totalEnabled} enabled</Badge>
          </div>

          <ScrollArea className="flex-1 pr-3 -mr-3 max-h-[55vh]">
            <div className="space-y-4">
              {Object.keys(categorized).sort().map((cat) => {
                const items = categorized[cat];
                const allOn = items.every((i) => featFlags[i.feature_key]);
                return (
                  <div key={cat} className="rounded-lg border border-border/60 bg-card/50">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize text-foreground">{cat}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Toggle all</span>
                        <Switch checked={allOn} onCheckedChange={(v) => toggleCategory(cat, v)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                      {items.map((f) => (
                        <div key={f.feature_key} className="flex items-start justify-between rounded-md border border-border/40 bg-background/40 px-3 py-2">
                          <div className="min-w-0 pr-2">
                            <div className="text-sm text-foreground">{f.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{f.feature_key}</div>
                          </div>
                          <Switch checked={!!featFlags[f.feature_key]} onCheckedChange={() => toggleFeat(f.feature_key)} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(categorized).length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">No features match your search.</div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatPlan(null)}>Cancel</Button>
            <Button onClick={saveFeatures} disabled={savingFeat}>{savingFeat ? "Saving..." : "Save features"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlans;
