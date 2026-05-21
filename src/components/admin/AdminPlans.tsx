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
import { Plus, Edit, Trash2, CreditCard, Star } from "lucide-react";

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

const empty: Partial<Plan> = { name: "", slug: "", description: "", price: 0, currency: "INR", billing_interval: "monthly", sort_order: 0, is_active: true, highlight: false };

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Plan>>(empty);

  const load = async () => {
    const { data } = await supabase.from("subscription_plans").select("*").order("sort_order");
    setPlans((data as Plan[]) || []);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Subscription Plans</h2>
            <p className="text-sm text-muted-foreground">Define pricing tiers that map to feature bundles</p>
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
        {plans.map((p) => (
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
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminPlans;
