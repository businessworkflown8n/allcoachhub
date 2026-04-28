import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const TYPES = ["document", "video", "image", "text", "link", "physical"];

interface Settings {
  id: string;
  global_enabled: boolean;
  allowed_types: string[];
  allow_paid: boolean;
  require_approval: boolean;
  platform_commission_percent: number;
  min_price: number | null;
  max_price: number | null;
  allow_discount: boolean;
  allow_refunds: boolean;
  max_products_per_coach: number | null;
}

interface Coach {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Override {
  id: string;
  coach_id: string;
  enabled: boolean | null;
  allowed_types: string[] | null;
  max_products: number | null;
}

const AdminDigitalProductsControl = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: cs }, { data: ov }, { data: pr }] = await Promise.all([
      supabase.from("digital_product_settings").select("*").maybeSingle(),
      supabase.from("profiles").select("user_id, full_name, email").limit(500),
      supabase.from("digital_product_coach_access").select("*"),
      supabase.from("digital_products").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    // Filter to coaches only
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
    const coachIds = new Set((roles || []).map((r: any) => r.user_id));
    setCoaches(((cs as any) || []).filter((c: any) => coachIds.has(c.user_id)));
    setSettings(s as any);
    const map: Record<string, Override> = {};
    (ov || []).forEach((o: any) => { map[o.coach_id] = o; });
    setOverrides(map);
    setProducts((pr as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const { error } = await supabase.from("digital_product_settings").update(patch).eq("id", settings.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); setSettings({ ...settings, ...patch }); }
  };

  const toggleType = (t: string) => {
    if (!settings) return;
    const next = settings.allowed_types.includes(t)
      ? settings.allowed_types.filter(x => x !== t)
      : [...settings.allowed_types, t];
    saveSettings({ allowed_types: next });
  };

  const toggleCoach = async (coachId: string, enabled: boolean) => {
    const existing = overrides[coachId];
    if (existing) {
      await supabase.from("digital_product_coach_access").update({ enabled }).eq("id", existing.id);
    } else {
      await supabase.from("digital_product_coach_access").insert({ coach_id: coachId, enabled });
    }
    load();
  };

  const approve = async (id: string, approval_status: "approved" | "rejected") => {
    const patch: any = { approval_status };
    if (approval_status === "approved") patch.status = "published";
    await supabase.from("digital_products").update(patch).eq("id", id);
    load();
  };

  if (loading || !settings) return <div className="p-6 text-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Digital Products Control</h2>
        <p className="text-sm text-muted-foreground">Manage coach access, monetization rules and product approvals.</p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Enable Digital Products globally</Label>
            <p className="text-xs text-muted-foreground">Master switch — when off, the module is hidden from all coaches.</p>
          </div>
          <Switch checked={settings.global_enabled} onCheckedChange={(v) => saveSettings({ global_enabled: v })} />
        </div>

        <div>
          <Label className="text-base">Allowed product types</Label>
          <div className="flex flex-wrap gap-3 mt-2">
            {TYPES.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={settings.allowed_types.includes(t)} onCheckedChange={() => toggleType(t)} />
                <span className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label>Allow paid products</Label>
            <Switch checked={settings.allow_paid} onCheckedChange={(v) => saveSettings({ allow_paid: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Require approval before publish</Label>
            <Switch checked={settings.require_approval} onCheckedChange={(v) => saveSettings({ require_approval: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow discounting</Label>
            <Switch checked={settings.allow_discount} onCheckedChange={(v) => saveSettings({ allow_discount: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow refunds</Label>
            <Switch checked={settings.allow_refunds} onCheckedChange={(v) => saveSettings({ allow_refunds: v })} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Commission %</Label>
            <Input type="number" defaultValue={settings.platform_commission_percent}
              onBlur={(e) => saveSettings({ platform_commission_percent: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Min price</Label>
            <Input type="number" defaultValue={settings.min_price ?? ""}
              onBlur={(e) => saveSettings({ min_price: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label>Max price</Label>
            <Input type="number" defaultValue={settings.max_price ?? ""}
              onBlur={(e) => saveSettings({ max_price: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label>Max products / coach</Label>
            <Input type="number" defaultValue={settings.max_products_per_coach ?? ""}
              onBlur={(e) => saveSettings({ max_products_per_coach: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">Per-coach access</h3>
        <div className="max-h-96 overflow-auto divide-y divide-border">
          {coaches.map(c => {
            const ov = overrides[c.user_id];
            const eff = ov?.enabled ?? settings.global_enabled;
            return (
              <div key={c.user_id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-foreground">{c.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {ov && <Badge variant="outline">override</Badge>}
                  <Switch checked={eff} onCheckedChange={(v) => toggleCoach(c.user_id, v)} />
                </div>
              </div>
            );
          })}
          {coaches.length === 0 && <div className="text-sm text-muted-foreground">No coaches found.</div>}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">Pending approvals</h3>
        <div className="space-y-2">
          {products.filter(p => p.approval_status === "pending" && p.status === "pending").map(p => (
            <div key={p.id} className="flex items-center justify-between border border-border rounded-lg p-3">
              <div>
                <div className="text-sm font-medium text-foreground">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.product_type} · {p.is_paid ? `${p.currency} ${p.price}` : "Free"}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => approve(p.id, "rejected")}>Reject</Button>
                <Button size="sm" onClick={() => approve(p.id, "approved")}>Approve & Publish</Button>
              </div>
            </div>
          ))}
          {products.filter(p => p.approval_status === "pending" && p.status === "pending").length === 0 && (
            <div className="text-sm text-muted-foreground">Nothing pending.</div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminDigitalProductsControl;
