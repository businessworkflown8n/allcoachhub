import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Lock, AlertCircle, History, Settings2 } from "lucide-react";

interface FeatureMaster {
  feature_key: string;
  name: string;
  description: string | null;
  category: string;
  depends_on: string[] | null;
  supports_usage_limit: boolean;
  sort_order: number;
}

interface FeatureControl {
  feature_key: string;
  global_enabled: boolean;
  free_enabled: boolean;
  pro_enabled: boolean;
  premium_enabled: boolean;
  default_usage_limit: number | null;
  free_usage_limit: number | null;
  pro_usage_limit: number | null;
  premium_usage_limit: number | null;
}

interface CoachOverride {
  id: string;
  coach_id: string;
  feature_key: string;
  enabled: boolean | null;
  usage_limit: number | null;
  notes: string | null;
}

interface AuditEntry {
  id: string;
  feature_key: string;
  scope: string;
  coach_id: string | null;
  changed_by: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

export default function AdminFeatureControlSystem() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureMaster[]>([]);
  const [controls, setControls] = useState<Record<string, FeatureControl>>({});
  const [overrides, setOverrides] = useState<CoachOverride[]>([]);
  const [coaches, setCoaches] = useState<Array<{ user_id: string; full_name: string | null; email: string | null }>>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [fm, fc, ov, au, co] = await Promise.all([
      supabase.from("features_master").select("*").order("sort_order"),
      supabase.from("feature_controls").select("*"),
      supabase.from("coach_feature_override").select("*"),
      supabase.from("feature_control_audit").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("user_id, full_name, email").limit(500),
    ]);
    setFeatures((fm.data ?? []) as FeatureMaster[]);
    const byKey: Record<string, FeatureControl> = {};
    ((fc.data ?? []) as FeatureControl[]).forEach((c) => (byKey[c.feature_key] = c));
    setControls(byKey);
    setOverrides((ov.data ?? []) as CoachOverride[]);
    setAudit((au.data ?? []) as AuditEntry[]);
    setCoaches((co.data ?? []) as typeof coaches);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-feature-control")
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_controls" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "coach_feature_override" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const updateControl = async (key: string, patch: Partial<FeatureControl>) => {
    const existing = controls[key];
    const { error } = await supabase.from("feature_controls").update(patch).eq("feature_key", key);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setControls({ ...controls, [key]: { ...existing, ...patch } });
    toast({ title: "Updated", description: `${key} saved.` });
  };

  // Dependency check: a feature is "locked" if any of its deps are globally OFF
  const isDependencyLocked = (f: FeatureMaster) =>
    (f.depends_on ?? []).some((dep) => controls[dep] && controls[dep].global_enabled === false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" /> Feature Control System
        </h1>
        <p className="text-muted-foreground text-sm">
          Global toggles, plan-based access, per-coach overrides, usage limits, and audit log.
        </p>
      </div>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Global & Plans</TabsTrigger>
          <TabsTrigger value="overrides">Coach Overrides</TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-3.5 w-3.5 mr-1" /> Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4 mt-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {features.map((f) => {
            const c = controls[f.feature_key];
            if (!c) return null;
            const locked = isDependencyLocked(f);
            return (
              <Card key={f.feature_key} className={locked ? "opacity-70 border-dashed" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {f.name}
                        <Badge variant="outline">{f.category}</Badge>
                        {locked && (
                          <Badge variant="destructive" className="gap-1">
                            <Lock className="h-3 w-3" /> Dependency off
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{f.description}</CardDescription>
                      {(f.depends_on?.length ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Requires: {f.depends_on!.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Global</Label>
                      <Switch
                        checked={c.global_enabled}
                        onCheckedChange={(v) => updateControl(f.feature_key, { global_enabled: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {locked ? (
                    <div className="flex items-center justify-between bg-muted p-3 rounded">
                      <span className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Locked by dependency. Enable required features to unlock.
                      </span>
                      <Button size="sm" variant="outline" disabled>
                        Upgrade
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(["free", "pro", "premium"] as const).map((tier) => (
                        <div key={tier} className="border rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="capitalize font-semibold">{tier}</Label>
                            <Switch
                              checked={c[`${tier}_enabled`]}
                              onCheckedChange={(v) =>
                                updateControl(f.feature_key, { [`${tier}_enabled`]: v } as Partial<FeatureControl>)
                              }
                            />
                          </div>
                          {f.supports_usage_limit && (
                            <div>
                              <Label className="text-xs">Usage limit</Label>
                              <Input
                                type="number"
                                placeholder="Unlimited"
                                value={c[`${tier}_usage_limit`] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  setControls({
                                    ...controls,
                                    [f.feature_key]: { ...c, [`${tier}_usage_limit`]: val },
                                  });
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  updateControl(f.feature_key, { [`${tier}_usage_limit`]: val } as Partial<FeatureControl>);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="overrides" className="mt-4">
          <CoachOverridesPanel
            features={features}
            coaches={coaches}
            overrides={overrides}
            onChange={load}
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent changes</CardTitle>
              <CardDescription>Last 100 feature control changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell><code className="text-xs">{a.feature_key}</code></TableCell>
                      <TableCell><Badge variant="outline">{a.scope}</Badge></TableCell>
                      <TableCell className="text-xs">{a.coach_id ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-md truncate">
                        {JSON.stringify(a.new_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {audit.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No audit entries yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CoachOverridesPanel({
  features,
  coaches,
  overrides,
  onChange,
}: {
  features: FeatureMaster[];
  coaches: Array<{ user_id: string; full_name: string | null; email: string | null }>;
  overrides: CoachOverride[];
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [coachId, setCoachId] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [enabled, setEnabled] = useState<string>("inherit");
  const [usageLimit, setUsageLimit] = useState("");
  const [notes, setNotes] = useState("");

  const save = async () => {
    if (!coachId || !featureKey) {
      toast({ title: "Coach and feature required", variant: "destructive" });
      return;
    }
    const payload = {
      coach_id: coachId,
      feature_key: featureKey,
      enabled: enabled === "inherit" ? null : enabled === "on",
      usage_limit: usageLimit === "" ? null : Number(usageLimit),
      notes: notes || null,
    };
    const { error } = await supabase
      .from("coach_feature_override")
      .upsert(payload, { onConflict: "coach_id,feature_key" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Override saved" });
    setOpen(false);
    setCoachId("");
    setFeatureKey("");
    setEnabled("inherit");
    setUsageLimit("");
    setNotes("");
    onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("coach_feature_override").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removed" });
    onChange();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Per-Coach Overrides</CardTitle>
          <CardDescription>Force enable/disable or set custom usage limits per coach.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Override</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Override</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Coach</Label>
                <Select value={coachId} onValueChange={setCoachId}>
                  <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                  <SelectContent>
                    {coaches.map((c) => (
                      <SelectItem key={c.user_id} value={c.user_id}>
                        {c.full_name ?? c.email ?? c.user_id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Feature</Label>
                <Select value={featureKey} onValueChange={setFeatureKey}>
                  <SelectTrigger><SelectValue placeholder="Select feature" /></SelectTrigger>
                  <SelectContent>
                    {features.map((f) => (
                      <SelectItem key={f.feature_key} value={f.feature_key}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State</Label>
                <Select value={enabled} onValueChange={setEnabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit plan</SelectItem>
                    <SelectItem value="on">Force ON</SelectItem>
                    <SelectItem value="off">Force OFF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Usage limit (blank = inherit)</Label>
                <Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coach</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Limit</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overrides.map((o) => {
              const coach = coaches.find((c) => c.user_id === o.coach_id);
              return (
                <TableRow key={o.id}>
                  <TableCell className="text-xs">{coach?.full_name ?? coach?.email ?? o.coach_id.slice(0, 8)}</TableCell>
                  <TableCell><code className="text-xs">{o.feature_key}</code></TableCell>
                  <TableCell>
                    {o.enabled === null ? <Badge variant="outline">Inherit</Badge>
                      : o.enabled ? <Badge>ON</Badge>
                      : <Badge variant="destructive">OFF</Badge>}
                  </TableCell>
                  <TableCell>{o.usage_limit ?? "—"}</TableCell>
                  <TableCell className="text-xs">{o.notes ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => remove(o.id)}>Remove</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {overrides.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No overrides yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
