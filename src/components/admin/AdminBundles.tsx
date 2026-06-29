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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package, ChevronDown, ChevronRight, Search, CheckCircle2, XCircle } from "lucide-react";
import { FEATURE_CATALOG, ALL_FEATURE_KEYS } from "@/lib/featureCatalog";

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
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const load = async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from("feature_bundles").select("*").order("sort_order"),
      supabase.from("subscription_plans").select("id,name").order("sort_order"),
    ]);
    setBundles((b as any) || []);
    setPlans((p as any) || []);
  };
  useEffect(() => { load(); }, []);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FEATURE_CATALOG;
    return FEATURE_CATALOG
      .map((c) => ({
        ...c,
        features: c.features.filter(
          (f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || c.label.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.features.length > 0);
  }, [search]);

  const flags = editing.feature_flags || {};
  const enabledCount = Object.values(flags).filter(Boolean).length;

  const toggleFlag = (k: string) => {
    const next = { ...flags, [k]: !flags[k] };
    setEditing({ ...editing, feature_flags: next });
  };

  const setCategory = (catKey: string, value: boolean) => {
    const cat = FEATURE_CATALOG.find((c) => c.key === catKey);
    if (!cat) return;
    const next = { ...flags };
    cat.features.forEach((f) => { next[f.key] = value; });
    setEditing({ ...editing, feature_flags: next });
  };

  const setAll = (value: boolean) => {
    const next: Record<string, boolean> = { ...flags };
    ALL_FEATURE_KEYS.forEach((k) => { next[k] = value; });
    setEditing({ ...editing, feature_flags: next });
  };

  const save = async () => {
    if (!editing.name || !editing.slug) { toast({ title: "Name and slug required", variant: "destructive" }); return; }
    const payload: any = {
      name: editing.name, slug: editing.slug, description: editing.description,
      plan_id: editing.plan_id || null, feature_flags: editing.feature_flags || {},
      is_active: editing.is_active ?? true, sort_order: Number(editing.sort_order) || 0,
    };
    const { error } = editing.id
      ? await supabase.from("feature_bundles").update(payload).eq("id", editing.id)
      : await supabase.from("feature_bundles").insert(payload);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing.id ? "Bundle updated" : "Bundle created" });
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this bundle? Coaches assigned to it will lose its defaults.")) return;
    await supabase.from("feature_bundles").delete().eq("id", id);
    toast({ title: "Bundle deleted" });
    load();
  };

  const openEditor = (b?: Bundle) => {
    setEditing(b ?? empty);
    // expand first category by default
    setOpenCats({ [FEATURE_CATALOG[0].key]: true });
    setSearch("");
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Feature Bundles</h2>
            <p className="text-sm text-muted-foreground">
              Single source of truth for what each subscription plan unlocks for coaches.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(empty); }}>
          <DialogTrigger asChild><Button onClick={() => openEditor()}><Plus className="h-4 w-4 mr-2" />New Bundle</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit" : "Create"} Bundle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div>
                    <Label className="text-sm font-semibold">Feature Permissions</Label>
                    <p className="text-xs text-muted-foreground">
                      {enabledCount} of {ALL_FEATURE_KEYS.length} features enabled
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAll(true)}><CheckCircle2 className="h-3 w-3 mr-1" />Enable All</Button>
                    <Button size="sm" variant="outline" onClick={() => setAll(false)}><XCircle className="h-3 w-3 mr-1" />Disable All</Button>
                  </div>
                </div>

                <div className="relative mb-3">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search features..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="space-y-2">
                  {filteredCatalog.map((cat) => {
                    const total = cat.features.length;
                    const on = cat.features.filter((f) => flags[f.key]).length;
                    const isOpen = openCats[cat.key] ?? !!search;
                    return (
                      <Collapsible key={cat.key} open={isOpen} onOpenChange={(v) => setOpenCats({ ...openCats, [cat.key]: v })}>
                        <div className="rounded-lg border border-border">
                          <div className="flex items-center justify-between p-3">
                            <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="text-lg">{cat.icon}</span>
                              <span className="font-medium text-foreground">{cat.label}</span>
                              <Badge variant={on === total ? "default" : on === 0 ? "secondary" : "outline"} className="ml-2">
                                {on}/{total} Enabled
                              </Badge>
                            </CollapsibleTrigger>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setCategory(cat.key, true)}>Enable</Button>
                              <Button size="sm" variant="ghost" onClick={() => setCategory(cat.key, false)}>Disable</Button>
                            </div>
                          </div>
                          <CollapsibleContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 pt-0">
                              {cat.features.map((f) => (
                                <div key={f.key} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-sm text-foreground truncate">{f.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{f.key}</p>
                                  </div>
                                  <Switch checked={!!flags[f.key]} onCheckedChange={() => toggleFlag(f.key)} />
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No features match "{search}"</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bundles.map((b) => {
          const flagsB = b.feature_flags || {};
          const enabled = Object.entries(flagsB).filter(([, v]) => v).length;
          const plan = plans.find((p) => p.id === b.plan_id);
          const perCat = FEATURE_CATALOG.map((c) => ({
            label: c.label,
            icon: c.icon,
            on: c.features.filter((f) => flagsB[f.key]).length,
            total: c.features.length,
          }));
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
                <p className="text-xs text-muted-foreground mb-2">{enabled} of {ALL_FEATURE_KEYS.length} features enabled</p>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  {perCat.filter((c) => c.on > 0).map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-xs rounded bg-muted/40 px-2 py-1">
                      <span className="truncate">{c.icon} {c.label}</span>
                      <span className="text-muted-foreground ml-2">{c.on}/{c.total}</span>
                    </div>
                  ))}
                  {enabled === 0 && <span className="text-xs text-muted-foreground col-span-2">No features enabled</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditor(b)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
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
