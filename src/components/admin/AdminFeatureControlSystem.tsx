import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Lock, AlertCircle, History, Settings2, Search, ChevronDown, Power,
  Zap, Crown, Sparkles, Users, ToggleRight, Activity, Plus,
} from "lucide-react";

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

const TIER_META = {
  free:    { icon: Power,    accent: "text-blue-300",    bg: "from-blue-500/10 to-blue-500/0",       ring: "ring-blue-500/30" },
  pro:     { icon: Zap,      accent: "text-primary",     bg: "from-primary/15 to-primary/0",          ring: "ring-primary/30" },
  premium: { icon: Crown,    accent: "text-amber-300",   bg: "from-amber-500/15 to-amber-500/0",     ring: "ring-amber-500/30" },
} as const;

export default function AdminFeatureControlSystem() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureMaster[]>([]);
  const [controls, setControls] = useState<Record<string, FeatureControl>>({});
  const [overrides, setOverrides] = useState<CoachOverride[]>([]);
  const [coaches, setCoaches] = useState<Array<{ user_id: string; full_name: string | null; email: string | null }>>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
    return () => { supabase.removeChannel(ch); };
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

  // Bulk: enable/disable all features in a category at global level
  const bulkSetCategory = async (category: string, enabled: boolean) => {
    const keys = features.filter((f) => f.category === category).map((f) => f.feature_key);
    if (keys.length === 0) return;
    const { error } = await supabase.from("feature_controls").update({ global_enabled: enabled }).in("feature_key", keys);
    if (error) {
      toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
      return;
    }
    const next = { ...controls };
    keys.forEach((k) => { if (next[k]) next[k] = { ...next[k], global_enabled: enabled }; });
    setControls(next);
    toast({ title: `Bulk ${enabled ? "enabled" : "disabled"}`, description: `${keys.length} features in ${category}` });
  };

  const isDependencyLocked = (f: FeatureMaster) =>
    (f.depends_on ?? []).some((dep) => controls[dep] && controls[dep].global_enabled === false);

  // Group + filter
  const categories = useMemo(() => {
    const set = new Set(features.map((f) => f.category));
    return Array.from(set);
  }, [features]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return features.filter((f) => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.feature_key.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [features, query, categoryFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, FeatureMaster[]> = {};
    filtered.forEach((f) => {
      (map[f.category] ||= []).push(f);
    });
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = features.length;
    const enabled = features.filter((f) => controls[f.feature_key]?.global_enabled).length;
    const recent24h = audit.filter((a) => Date.now() - new Date(a.created_at).getTime() < 86400000).length;
    return { total, enabled, overrides: overrides.length, recent24h };
  }, [features, controls, overrides, audit]);

  const statCards = [
    { label: "Total Features", value: stats.total, icon: Settings2, accent: "text-primary" },
    { label: "Globally Enabled", value: stats.enabled, icon: ToggleRight, accent: "text-emerald-400" },
    { label: "Coach Overrides", value: stats.overrides, icon: Users, accent: "text-amber-300" },
    { label: "Changes (24h)", value: stats.recent24h, icon: Activity, accent: "text-blue-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary icon-glow" /> Feature Control System
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Global toggles, plan tiers, per-coach overrides, usage limits, and audit log.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card-premium p-4 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList className="bg-secondary/40 border border-border/40 p-1 h-auto flex-wrap">
          <TabsTrigger value="global" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:nav-active-glow rounded-lg px-4 py-1.5 text-xs font-medium">
            Global & Plans
          </TabsTrigger>
          <TabsTrigger value="overrides" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:nav-active-glow rounded-lg px-4 py-1.5 text-xs font-medium">
            Coach Overrides
            <span className="ml-2 tabular-nums rounded-md bg-background/60 px-1.5 py-0.5 text-[10px]">{overrides.length}</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:nav-active-glow rounded-lg px-4 py-1.5 text-xs font-medium">
            <History className="h-3.5 w-3.5 mr-1.5" /> Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          {/* Search + category pills */}
          <div className="card-premium p-3 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search features by name, key, or description..."
                className="w-full rounded-xl border border-border/40 bg-secondary/50 py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-secondary/80 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 border border-border/40 overflow-x-auto">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  categoryFilter === "all" ? "bg-primary/15 text-primary nav-active-glow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({features.length})
              </button>
              {categories.map((cat) => {
                const count = features.filter((f) => f.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap capitalize transition-all ${
                      categoryFilter === cat ? "bg-primary/15 text-primary nav-active-glow" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-card/50 animate-pulse" />)}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="card-premium py-16 text-center">
              <p className="text-sm text-muted-foreground">No features match your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, items]) => {
                const enabledCount = items.filter((f) => controls[f.feature_key]?.global_enabled).length;
                const allOn = enabledCount === items.length;
                const isOpen = openGroups[cat] !== false;
                return (
                  <Collapsible key={cat} open={isOpen} onOpenChange={(v) => setOpenGroups({ ...openGroups, [cat]: v })}>
                    <div className="card-premium overflow-hidden">
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/30">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 flex-1 text-left group">
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-base font-bold text-foreground capitalize">{cat}</span>
                            <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                              {enabledCount}/{items.length} active
                            </span>
                          </button>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => bulkSetCategory(cat, true)}
                            disabled={allOn}
                          >
                            Enable all
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs hover:text-destructive hover:border-destructive/40"
                            onClick={() => bulkSetCategory(cat, false)}
                            disabled={enabledCount === 0}
                          >
                            Disable all
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="divide-y divide-border/30">
                          {items.map((f) => (
                            <FeatureRow
                              key={f.feature_key}
                              f={f}
                              c={controls[f.feature_key]}
                              locked={isDependencyLocked(f)}
                              onChange={(patch) => updateControl(f.feature_key, patch)}
                              onLocalChange={(patch) => setControls({ ...controls, [f.feature_key]: { ...controls[f.feature_key], ...patch } })}
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overrides">
          <CoachOverridesPanel features={features} coaches={coaches} overrides={overrides} onChange={load} />
        </TabsContent>

        <TabsContent value="audit">
          <div className="card-premium overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Recent changes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 100 feature control changes.</p>
            </div>
            {audit.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No audit entries yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-premium">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/30 border-b border-border/40">
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3">Scope</th>
                      <th className="px-4 py-3">Coach</th>
                      <th className="px-4 py-3">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5"><code className="text-xs text-primary/90 bg-primary/5 px-1.5 py-0.5 rounded">{a.feature_key}</code></td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-[10px] capitalize border-border/60">{a.scope}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{a.coach_id ? a.coach_id.slice(0, 8) + "…" : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground/80 max-w-md truncate font-mono">{JSON.stringify(a.new_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Feature row ---------------- */
function FeatureRow({
  f, c, locked, onChange, onLocalChange,
}: {
  f: FeatureMaster;
  c: FeatureControl | undefined;
  locked: boolean;
  onChange: (patch: Partial<FeatureControl>) => void;
  onLocalChange: (patch: Partial<FeatureControl>) => void;
}) {
  if (!c) return null;
  return (
    <div className={`p-4 transition-colors hover:bg-secondary/20 ${locked ? "opacity-70" : ""}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground">{f.name}</h4>
            <code className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{f.feature_key}</code>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">
                <Lock className="h-2.5 w-2.5" /> Dependency off
              </span>
            )}
            {c.global_enabled && !locked && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor] animate-pulse" />
                Live
              </span>
            )}
          </div>
          {f.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.description}</p>}
          {(f.depends_on?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Requires:</span>
              {f.depends_on!.map((d) => (
                <code key={d} className="text-[10px] bg-primary/5 text-primary/80 px-1.5 py-0.5 rounded border border-primary/10">{d}</code>
              ))}
            </div>
          )}
        </div>

        {/* Master toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Label className="text-xs font-medium text-muted-foreground">Global</Label>
          <Switch
            checked={c.global_enabled}
            onCheckedChange={(v) => onChange({ global_enabled: v })}
          />
        </div>
      </div>

      {locked ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-300/90">Locked by dependency. Enable required features to unlock.</span>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(["free", "pro", "premium"] as const).map((tier) => {
            const meta = TIER_META[tier];
            const TierIcon = meta.icon;
            const on = c[`${tier}_enabled`];
            return (
              <div
                key={tier}
                className={`rounded-xl border p-2.5 transition-all bg-gradient-to-br ${meta.bg} ${
                  on ? `border-transparent ring-1 ${meta.ring}` : "border-border/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TierIcon className={`h-3.5 w-3.5 ${on ? meta.accent : "text-muted-foreground"}`} />
                    <Label className={`capitalize text-xs font-semibold ${on ? "text-foreground" : "text-muted-foreground"}`}>{tier}</Label>
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => onChange({ [`${tier}_enabled`]: v } as Partial<FeatureControl>)}
                  />
                </div>
                {f.supports_usage_limit && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      className="h-7 text-xs bg-background/40 border-border/40"
                      value={c[`${tier}_usage_limit`] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        onLocalChange({ [`${tier}_usage_limit`]: val } as Partial<FeatureControl>);
                      }}
                      onBlur={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        onChange({ [`${tier}_usage_limit`]: val } as Partial<FeatureControl>);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Coach overrides ---------------- */
function CoachOverridesPanel({
  features, coaches, overrides, onChange,
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
  const [search, setSearch] = useState("");

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
    const { error } = await supabase.from("coach_feature_override").upsert(payload, { onConflict: "coach_id,feature_key" });
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Override saved" });
    setOpen(false); setCoachId(""); setFeatureKey(""); setEnabled("inherit"); setUsageLimit(""); setNotes("");
    onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("coach_feature_override").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Removed" });
    onChange();
  };

  const filtered = overrides.filter((o) => {
    if (!search) return true;
    const coach = coaches.find((c) => c.user_id === o.coach_id);
    const q = search.toLowerCase();
    return (
      o.feature_key.toLowerCase().includes(q) ||
      (coach?.full_name ?? "").toLowerCase().includes(q) ||
      (coach?.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="card-premium p-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search overrides by coach or feature..."
            className="w-full rounded-xl border border-border/40 bg-secondary/50 py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-secondary/80 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="cta-3d primary sm self-start sm:self-auto"><Plus className="h-4 w-4" /> Add Override</button>
          </DialogTrigger>
          <DialogContent className="card-premium border-border/40">
            <DialogHeader><DialogTitle className="text-lg">New Override</DialogTitle></DialogHeader>
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
              <button onClick={save} className="cta-3d primary sm w-full justify-center">Save Override</button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Per-Coach Overrides
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Force enable/disable or set custom usage limits per coach.</p>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {overrides.length === 0 ? "No overrides yet." : "No overrides match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-premium">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/30 border-b border-border/40">
                  <th className="px-4 py-3">Coach</th>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Limit</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const coach = coaches.find((c) => c.user_id === o.coach_id);
                  const label = coach?.full_name ?? coach?.email ?? o.coach_id.slice(0, 8);
                  return (
                    <tr key={o.id} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {(label || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground">{label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><code className="text-xs text-primary/90 bg-primary/5 px-1.5 py-0.5 rounded">{o.feature_key}</code></td>
                      <td className="px-4 py-3">
                        {o.enabled === null ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground ring-1 ring-border">Inherit</span>
                        ) : o.enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor]" /> ON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">OFF</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-foreground/80">{o.usage_limit ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{o.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => remove(o.id)}
                          className="rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
