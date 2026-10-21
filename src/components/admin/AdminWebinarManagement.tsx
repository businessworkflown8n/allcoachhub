import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, History, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/compatClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import SyncStatusBadge from "@/components/webinar/SyncStatusBadge";
import { callWebinarManagement } from "@/services/webinarManagement.service";
import { SYNC_DESTINATIONS, WEBINAR_PERMISSION_COLUMNS } from "@/lib/webinarManagement";

const fmt = (iso: string | null | undefined) => (iso ? format(new Date(iso), "MMM d, yyyy HH:mm") : "—");

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
interface CoachPermRow {
  coach_id: string;
  full_name: string;
  email: string;
  status: string;
  [column: string]: string | boolean;
}

const PermissionsTab = () => {
  const [rows, setRows] = useState<CoachPermRow[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const cols = WEBINAR_PERMISSION_COLUMNS.map((p) => p.column).join(", ");
    const [{ data: profiles }, { data: roles }, { data: flags, error: flagsErr }, { data: auditRows }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("user_roles").select("user_id").eq("role", "coach"),
      supabase.from("coach_feature_flags").select(`coach_id, status, ${cols}`),
      supabase.from("feature_control_audit").select("*").eq("feature_key", "webinar_management").order("created_at", { ascending: false }).limit(25),
    ]);
    if (flagsErr) {
      toast({ title: "Could not load permissions", description: "Has the webinar management migration been applied?", variant: "destructive" });
    }
    const coachIds = new Set((roles || []).map((r: any) => r.user_id));
    const flagMap = new Map<string, any>((flags || []).map((f: any) => [f.coach_id, f]));
    setRows(
      (profiles || [])
        .filter((p: any) => coachIds.has(p.user_id))
        .map((p: any) => {
          const f = flagMap.get(p.user_id);
          const row: CoachPermRow = { coach_id: p.user_id, full_name: p.full_name || "Unknown", email: p.email || "", status: f?.status ?? "pending" };
          WEBINAR_PERMISSION_COLUMNS.forEach(({ column }) => { row[column] = !!f?.[column]; });
          return row;
        }),
    );
    setAudit(auditRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (coachId: string, column: string, current: boolean) => {
    const key = `${coachId}:${column}`;
    setSaving(key);
    const now = new Date().toISOString();
    const { data: existing } = await supabase.from("coach_feature_flags").select("id").eq("coach_id", coachId).maybeSingle();
    const { error } = existing
      ? await supabase.from("coach_feature_flags").update({ [column]: !current, updated_at: now }).eq("coach_id", coachId)
      : await supabase.from("coach_feature_flags").insert({ coach_id: coachId, [column]: !current });
    setSaving(null);
    if (error) {
      toast({ title: "Permission not changed", description: error.message, variant: "destructive" });
      return;
    }
    if (column === "webinar_mgmt_access") {
      await supabase.from("learner_notifications").insert({
        learner_id: coachId,
        coach_id: coachId,
        title: !current ? "Webinar Management Enabled" : "Webinar Management Disabled",
        message: !current
          ? "You can now manage your webinar details from Manage Webinar in your dashboard."
          : "Webinar Management has been disabled for your account by the administrator.",
        cta_link: !current ? "/coach/manage-webinar" : null,
      });
    }
    setRows((prev) => prev.map((r) => (r.coach_id === coachId ? { ...r, [column]: !current } : r)));
    toast({ title: `${WEBINAR_PERMISSION_COLUMNS.find((p) => p.column === column)?.label} ${!current ? "enabled" : "disabled"}` });
    load();
  };

  const filtered = rows.filter((r) => `${r.full_name} ${r.email}`.toLowerCase().includes(search.toLowerCase()));
  const nameOf = (id: string | null) => rows.find((r) => r.coach_id === id)?.full_name ?? (id ? "Admin" : "System");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div>
              <CardTitle className="text-foreground">Webinar Management Permissions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Enforced on the server. Every permission also requires "Access". Coach approval status is not changed here.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search coaches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-center py-8">Loading coaches...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead>Approval</TableHead>
                    {WEBINAR_PERMISSION_COLUMNS.map((p) => <TableHead key={p.column} className="text-xs">{p.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.coach_id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </TableCell>
                      <TableCell><Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      {WEBINAR_PERMISSION_COLUMNS.map((p) => (
                        <TableCell key={p.column}>
                          <Switch
                            checked={r[p.column] as boolean}
                            disabled={saving === `${r.coach_id}:${p.column}`}
                            className={p.key !== "access" && !r.webinar_mgmt_access ? "opacity-50" : ""}
                            onCheckedChange={() => toggle(r.coach_id, p.column, r[p.column] as boolean)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No coaches found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-foreground text-base">Recent permission changes</CardTitle></CardHeader>
        <CardContent>
          {audit.length === 0 ? <p className="text-sm text-muted-foreground">No changes recorded yet.</p> : (
            <div className="space-y-2 text-sm">
              {audit.map((a) => {
                const changed = Object.keys(a.new_value || {}).filter((k) => a.old_value?.[k] !== a.new_value[k]);
                return (
                  <div key={a.id} className="flex flex-wrap gap-2 text-muted-foreground">
                    <span className="text-foreground">{fmt(a.created_at)}</span>
                    <span>{nameOf(a.changed_by)} →</span>
                    <span className="text-foreground">{nameOf(a.coach_id)}</span>
                    <span>{changed.map((k) => `${k}: ${a.new_value[k] ? "on" : "off"}`).join(", ")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sync monitor
// ---------------------------------------------------------------------------
const SyncMonitorTab = () => {
  const [webinars, setWebinars] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<any | null>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ws, error } = await supabase
      .from("webinars")
      .select("id, title, coach_id, webinar_date, webinar_time, timezone, webinar_link_status, is_published, config_version, config_published_at, config_updated_by")
      .gt("config_version", 0)
      .order("config_published_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load webinars", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = (ws || []).map((w: any) => w.id);
    const [{ data: vs }, { data: js }] = ids.length
      ? await Promise.all([
        supabase.from("webinar_config_versions")
          .select("webinar_id, version, config, previous_config, changed_fields, change_source, change_summary, published_by, published_at")
          .in("webinar_id", ids).order("version", { ascending: false }).limit(2000),
        supabase.from("webinar_sync_jobs")
          .select("id, webinar_id, config_version, destination, status, attempts, max_attempts, last_error, last_error_code, acknowledged_at, next_attempt_at, attempt_log, updated_at")
          .in("webinar_id", ids).order("config_version", { ascending: false }).limit(5000),
      ])
      : [{ data: [] }, { data: [] }];
    const people = new Set<string>();
    (ws || []).forEach((w: any) => { people.add(w.coach_id); if (w.config_updated_by) people.add(w.config_updated_by); });
    (vs || []).forEach((v: any) => v.published_by && people.add(v.published_by));
    const { data: profiles } = people.size
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", [...people])
      : { data: [] };
    setNames(new Map((profiles || []).map((p: any) => [p.user_id, p.full_name || "Unknown"])));
    setWebinars(ws || []);
    setVersions(vs || []);
    setJobs(js || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentJobs = useCallback(
    (w: any) => jobs.filter((j) => j.webinar_id === w.id && j.config_version === w.config_version),
    [jobs],
  );

  const rows = useMemo(() => webinars.map((w) => {
    const js = currentJobs(w);
    const latest = versions.find((v) => v.webinar_id === w.id && v.version === w.config_version);
    return { w, js, latest, failed: js.filter((j) => j.status === "failed") };
  }), [webinars, versions, currentJobs]);

  const filtered = rows.filter(({ w, failed, js }) => {
    const text = `${w.title} ${w.id} ${names.get(w.coach_id) ?? ""}`.toLowerCase();
    if (!text.includes(search.toLowerCase())) return false;
    if (onlyProblems) return failed.length > 0 || js.some((j) => j.status === "pending" && j.attempts > 0);
    return true;
  });

  const failures = rows.flatMap(({ w, failed }) => failed.map((j) => ({ ...j, webinar: w })));

  const retry = async (jobId: string) => {
    setRetrying(jobId);
    const res = await callWebinarManagement("retry", { job_id: jobId });
    setRetrying(null);
    if (!res.ok) {
      toast({ title: "Retry failed", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Retry queued", description: "The destination will be processed again shortly." });
    setTimeout(load, 3000);
  };

  const openHistory = async (w: any) => {
    setHistoryFor(w);
    const { data } = await supabase
      .from("activity_logs")
      .select("id, user_id, action, metadata, created_at")
      .eq("entity_type", "webinar").eq("entity_id", w.id)
      .order("created_at", { ascending: false }).limit(100);
    setAuditEvents(data || []);
  };

  const who = (id: string | null) => (id ? names.get(id) ?? "Admin / system" : "System");
  const counts = {
    managed: rows.length,
    complete: rows.filter(({ js }) => js.length > 0 && js.every((j) => ["synced", "skipped", "superseded"].includes(j.status))).length,
    failed: rows.filter(({ failed }) => failed.length > 0).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-foreground">{counts.managed}</p><p className="text-sm text-muted-foreground">Managed webinars</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-emerald-600">{counts.complete}</p><p className="text-sm text-muted-foreground">Fully processed (latest version)</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-destructive">{counts.failed}</p><p className="text-sm text-muted-foreground">With failed destinations</p></CardContent></Card>
      </div>

      {failures.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-foreground text-base">Failed destinations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {failures.map((j) => (
              <div key={j.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <div className="flex-1">
                  <p className="text-foreground font-medium">
                    {SYNC_DESTINATIONS.find((d) => d.key === j.destination)?.label} · {j.webinar.title} · v{j.config_version}
                  </p>
                  <p className="text-xs text-muted-foreground">{j.last_error} {j.last_error_code && `(${j.last_error_code})`} · {j.attempts} attempt(s) · last {fmt(j.updated_at)}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1" disabled={retrying === j.id} onClick={() => retry(j.id)}>
                  <RotateCcw className="h-3.5 w-3.5" />Retry
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-foreground">Synchronization overview</CardTitle>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={onlyProblems} onCheckedChange={setOnlyProblems} />Only problems
              </label>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Coach, title or webinar ID" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-center py-8">Loading…</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach / webinar</TableHead>
                    <TableHead>Date (previous → current)</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last updated</TableHead>
                    {SYNC_DESTINATIONS.map((d) => <TableHead key={d.key} className="text-xs">{d.label}</TableHead>)}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(({ w, js, latest }) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{names.get(w.coach_id) ?? "Unknown"}</p>
                        <p className="text-xs text-foreground">{w.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{w.id}</p>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {latest?.previous_config && latest.previous_config.date !== latest.config.date
                          ? <span className="text-muted-foreground line-through mr-1">{latest.previous_config.date} {latest.previous_config.start_time}</span>
                          : null}
                        <span className="text-foreground">{w.webinar_date} {String(w.webinar_time).slice(0, 5)}</span>
                        <p className="text-muted-foreground">{w.timezone}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline">v{w.config_version}</Badge></TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <p className="text-foreground">{who(w.config_updated_by)}</p>
                        <p className="text-muted-foreground">{fmt(w.config_published_at)}</p>
                      </TableCell>
                      {SYNC_DESTINATIONS.map((d) => {
                        const j = js.find((x) => x.destination === d.key);
                        return (
                          <TableCell key={d.key} title={j?.last_error ?? (j?.acknowledged_at ? `Acknowledged ${fmt(j.acknowledged_at)}` : "")}>
                            <SyncStatusBadge status={j?.status ?? "none"} />
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => openHistory(w)}><History className="h-3.5 w-3.5" />History</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No managed webinars{onlyProblems ? " with problems" : ""}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            "Not applied" means the destination did not change anything (not configured, unsupported, or no change needed); hover a status for details.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!historyFor} onOpenChange={(o) => { if (!o) setHistoryFor(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>History · {historyFor?.title}</DialogTitle></DialogHeader>
          {historyFor && (
            <div className="space-y-5 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2"><CalendarClock className="h-4 w-4" />Configuration versions</h4>
                {versions.filter((v) => v.webinar_id === historyFor.id).map((v) => (
                  <div key={v.version} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline">v{v.version}</Badge>
                      <span className="text-foreground">{v.change_source}</span>
                      <span className="text-muted-foreground">by {who(v.published_by)} · {fmt(v.published_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {v.config.date} {v.config.start_time}–{v.config.end_time} {v.config.timezone} · link {v.config.webinar_url_status}
                      {v.previous_config && ` · changed: ${v.changed_fields.join(", ")}`}
                    </p>
                    {v.change_summary && <p className="text-xs text-foreground mt-1">“{v.change_summary}”</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {jobs.filter((j) => j.webinar_id === historyFor.id && j.config_version === v.version).map((j) => (
                        <span key={j.id} className="inline-flex items-center gap-1 text-xs" title={j.last_error ?? ""}>
                          {SYNC_DESTINATIONS.find((d) => d.key === j.destination)?.label}<SyncStatusBadge status={j.status} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Audit events</h4>
                {auditEvents.length === 0 ? <p className="text-muted-foreground">No audit events.</p> : auditEvents.map((e) => (
                  <p key={e.id} className="text-xs text-muted-foreground">
                    <span className="text-foreground">{fmt(e.created_at)}</span> · {e.action} · {who(e.user_id)} · {JSON.stringify(e.metadata)}
                  </p>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Delivery attempts (latest version)</h4>
                {currentJobs(historyFor).map((j) => (
                  <div key={j.id} className="text-xs">
                    <p className="text-foreground">{SYNC_DESTINATIONS.find((d) => d.key === j.destination)?.label} · {j.status} · {j.attempts}/{j.max_attempts}</p>
                    {(j.attempt_log || []).map((a: any, i: number) => (
                      <p key={i} className="text-muted-foreground pl-3">{a.at} · {a.event ?? a.outcome} {a.message ? `· ${a.message}` : ""}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminWebinarManagement = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <div>
        <h2 className="text-xl font-bold text-foreground">Webinar Management</h2>
        <p className="text-sm text-muted-foreground">Coach-level webinar permissions and cross-platform synchronization</p>
      </div>
    </div>
    <Tabs defaultValue="permissions">
      <TabsList>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
        <TabsTrigger value="sync">Sync monitor</TabsTrigger>
      </TabsList>
      <TabsContent value="permissions" className="mt-4"><PermissionsTab /></TabsContent>
      <TabsContent value="sync" className="mt-4"><SyncMonitorTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminWebinarManagement;
