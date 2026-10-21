import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle, CalendarClock, Eye, History, Loader2, Lock, RefreshCw, Save, Send, Trash2, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import SyncStatusBadge from "@/components/webinar/SyncStatusBadge";
import { callWebinarManagement } from "@/services/webinarManagement.service";
import {
  FIELD_PERMISSION, SYNC_DESTINATIONS, changedFields, configFromWebinar, durationMinutes, googleCalendarUrl, listTimeZones,
  overallSyncState, toServerConfig, validateConfig,
  type ConfigField, type DestinationSummary, type ManagedWebinarRow, type ValidationErrors, type WebinarConfig, type WebinarPermissions,
} from "@/lib/webinarManagement";

interface DraftRow { webinar_id: string; draft: WebinarConfig; base_version: number; revision: number; updated_at: string }
interface VersionRow {
  webinar_id: string; version: number; changed_fields: string[]; change_source: string; change_summary: string | null;
  published_by: string | null; published_at: string; config: any; previous_config: any;
}
interface JobRow {
  webinar_id: string; config_version: number; destination: string; status: string; attempts: number;
  last_error: string | null; last_error_code: string | null; acknowledged_at: string | null; next_attempt_at: string; updated_at: string;
}
interface ListResponse {
  permissions: WebinarPermissions; coach_status: string; webinars: ManagedWebinarRow[];
  drafts: DraftRow[]; versions: VersionRow[]; sync_jobs: JobRow[]; actors: { user_id: string; full_name: string | null }[];
}

const FIELD_LABEL: Record<ConfigField, string> = {
  title: "Title", schedule: "Date / time / timezone", webinar_url: "Joining URL", whatsapp_url: "WhatsApp URL",
  registration_url: "Registration URL", calendar_details: "Calendar details",
};

const SOURCE_LABEL: Record<string, string> = {
  manage_webinar: "Coach publish", admin: "Admin edit", link_approval: "Link approval", coach: "Visibility change", system: "System",
};

const linkBadge = (status: string) =>
  status === "approved" ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Join link approved</Badge>
  : status === "rejected" ? <Badge variant="destructive">Join link rejected</Badge>
  : <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Join link awaiting admin approval</Badge>;

const fmt = (iso: string | null | undefined) => (iso ? format(new Date(iso), "MMM d, yyyy · HH:mm") : "—");

const CoachManageWebinar = () => {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<WebinarConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "publish" | "discard">(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const pollUntil = useRef(0);
  const timeZones = useMemo(() => listTimeZones(), []);

  const load = useCallback(async (opts: { keepForm?: boolean } = {}) => {
    const res = await callWebinarManagement<ListResponse & { success: boolean }>("list");
    if (!res.ok) {
      setLoadError(res.error ?? "Could not load webinars");
      setLoading(false);
      return null;
    }
    setLoadError(null);
    setData(res.data!);
    setLoading(false);
    if (!opts.keepForm) setDirty(false);
    return res.data!;
  }, []);

  useEffect(() => { load(); }, [load]);

  const webinar = data?.webinars.find((w) => w.id === selectedId) ?? null;
  const draft = data?.drafts.find((d) => d.webinar_id === selectedId) ?? null;
  const published = useMemo(() => (webinar ? configFromWebinar(webinar) : null), [webinar]);

  // Select the first webinar, and reset the form whenever the selection or server state changes (unless editing).
  useEffect(() => {
    if (!data) return;
    if (!selectedId && data.webinars.length) setSelectedId(data.webinars[0].id);
  }, [data, selectedId]);

  useEffect(() => {
    if (!published || dirty) return;
    setForm(draft ? { ...published, ...draft.draft, calendar_details: draft.draft.calendar_details ?? {} } : published);
    setErrors({});
  }, [published, draft, dirty]);

  const perms = data?.permissions;
  const changes = form && published ? changedFields(published, form) : [];
  const pendingChanges = !!draft || dirty;
  const canEdit = (f: ConfigField) => !!perms?.[FIELD_PERMISSION[f]];

  // Current-version job status per destination.
  const destinations: DestinationSummary[] = useMemo(() => {
    if (!webinar || !data) return [];
    const jobs = data.sync_jobs.filter((j) => j.webinar_id === webinar.id && j.config_version === webinar.config_version);
    return SYNC_DESTINATIONS.map(({ key }) => {
      const j = jobs.find((x) => x.destination === key);
      return {
        destination: key,
        status: (j?.status as DestinationSummary["status"]) ?? "not_started",
        last_error: j?.last_error ?? null,
        attempts: j?.attempts ?? 0,
        acknowledged_at: j?.acknowledged_at ?? null,
      };
    });
  }, [data, webinar]);
  const syncState = overallSyncState(destinations);

  // Poll briefly after publishing while jobs are in flight.
  useEffect(() => {
    if (syncState !== "in_progress" || Date.now() > pollUntil.current) return;
    const t = setTimeout(() => load({ keepForm: true }), 4000);
    return () => clearTimeout(t);
  }, [syncState, data, load]);

  const update = (patch: Partial<WebinarConfig>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setDirty(true);
  };

  const runValidation = (cfg: WebinarConfig) => {
    const e = validateConfig(cfg, { scheduleChanged: published ? changedFields(published, cfg).includes("schedule") : true });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveDraft = async (): Promise<number | null> => {
    if (!form || !webinar) return null;
    if (!runValidation(form)) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return null;
    }
    setBusy("save");
    const res = await callWebinarManagement("save_draft", {
      webinar_id: webinar.id, draft: toServerConfig(form), expected_revision: draft?.revision ?? 0,
    });
    setBusy(null);
    if (!res.ok) {
      toast({ title: "Draft not saved", description: res.error, variant: "destructive" });
      if (res.code === "WM_CONFLICT") await load();
      return null;
    }
    toast({ title: "Draft saved", description: "Nothing is visible to learners or integrations until you publish." });
    setDirty(false);
    await load();
    return res.data.draft.revision as number;
  };

  const publish = async () => {
    if (!webinar) return;
    let revision = draft?.revision ?? 0;
    if (dirty) {
      const saved = await saveDraft();
      if (saved === null) return;
      revision = saved;
    }
    setBusy("publish");
    const res = await callWebinarManagement("publish", {
      webinar_id: webinar.id, expected_version: webinar.config_version, expected_revision: revision, summary: summary.trim() || null,
    });
    setBusy(null);
    setPublishOpen(false);
    if (!res.ok) {
      toast({ title: "Not published", description: res.error, variant: "destructive" });
      if (res.code === "WM_CONFLICT" || res.code === "WM_STALE_DRAFT") await load();
      return;
    }
    const r = res.data.result;
    toast({
      title: `Published version ${r.version}`,
      description: r.link_reapproval_required
        ? "The new joining link is waiting for admin approval before learners and integrations receive it."
        : "Synchronizing with connected platforms…",
    });
    setSummary("");
    pollUntil.current = Date.now() + 90_000;
    await load();
  };

  const discard = async () => {
    if (!webinar) return;
    if (draft) {
      setBusy("discard");
      const res = await callWebinarManagement("discard_draft", { webinar_id: webinar.id });
      setBusy(null);
      if (!res.ok) {
        toast({ title: "Could not discard draft", description: res.error, variant: "destructive" });
        return;
      }
    }
    setDirty(false);
    await load();
    toast({ title: "Changes discarded" });
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  if (loadError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" onClick={() => { setLoading(true); load(); }}>Retry</Button>
      </div>
    );
  }

  if (!perms?.access) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Webinar Management is not enabled</h2>
        <p className="text-sm text-muted-foreground">Ask the platform administrator to enable Webinar Management for your account.</p>
      </div>
    );
  }

  const fieldError = (k: keyof WebinarConfig) => errors[k] && <p className="text-xs text-destructive mt-1">{errors[k]}</p>;
  const lockedHint = (f: ConfigField) => !canEdit(f) && (
    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Lock className="h-3 w-3" />Not enabled for your account</p>
  );
  const versions = data!.versions.filter((v) => v.webinar_id === selectedId);
  const actorName = (id: string | null) => (id ? data!.actors.find((a) => a.user_id === id)?.full_name || "Admin / system" : "System");
  const notApproved = data!.coach_status !== "approved";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Manage Webinar</h2>
        <p className="text-sm text-muted-foreground">Update webinar details once. Published changes sync to the website and connected platforms.</p>
      </div>

      {data!.webinars.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">You have no webinars yet. Create one under My Webinars first.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm">Webinar</Label>
            <Select
              value={selectedId ?? undefined}
              onValueChange={(v) => {
                if (dirty && !confirm("Discard unsaved changes?")) return;
                setDirty(false);
                setSelectedId(v);
              }}
            >
              <SelectTrigger className="w-full sm:w-[420px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {data!.webinars.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.title} · {w.webinar_date}{data!.drafts.some((d) => d.webinar_id === w.id) ? " · draft" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {webinar && form && (
            <>
              {/* Publication state */}
              <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-2 text-sm">
                {webinar.config_version > 0
                  ? <Badge className="bg-primary/15 text-primary border-primary/30">Published · v{webinar.config_version}</Badge>
                  : <Badge variant="outline">Not yet published through Manage Webinar</Badge>}
                {pendingChanges && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Unpublished changes</Badge>}
                {!webinar.is_published && <Badge variant="outline">Hidden from public listing</Badge>}
                {linkBadge(webinar.webinar_link_status)}
                <span className="text-muted-foreground ml-auto">
                  Last published {fmt(webinar.config_published_at)}{webinar.config_version > 0 && ` by ${actorName(webinar.config_updated_by)}`}
                  {draft && ` · Draft saved ${fmt(draft.updated_at)}`}
                </span>
              </div>

              {draft && draft.base_version !== webinar.config_version && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  This draft was started from version {draft.base_version}, but version {webinar.config_version} has since been published. Discard it and edit again.
                </div>
              )}

              {/* Editor */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                <div>
                  <Label>Webinar title *</Label>
                  <Input value={form.title} onChange={(e) => update({ title: e.target.value })} disabled={!canEdit("title")} maxLength={200} />
                  {fieldError("title")}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><CalendarClock className="h-4 w-4" />Schedule</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} disabled={!canEdit("schedule")} />{fieldError("date")}</div>
                    <div><Label>Start time *</Label><Input type="time" value={form.start_time} onChange={(e) => update({ start_time: e.target.value.slice(0, 5) })} disabled={!canEdit("schedule")} />{fieldError("start_time")}</div>
                    <div><Label>End time *</Label><Input type="time" value={form.end_time} onChange={(e) => update({ end_time: e.target.value.slice(0, 5) })} disabled={!canEdit("schedule")} />{fieldError("end_time")}</div>
                    <div>
                      <Label>Timezone *</Label>
                      <Select value={form.timezone} onValueChange={(v) => update({ timezone: v })} disabled={!canEdit("schedule")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {(timeZones.includes(form.timezone) ? timeZones : [form.timezone, ...timeZones]).map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {fieldError("timezone")}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Length: {durationMinutes(form.start_time, form.end_time)} min
                    {form.end_time <= form.start_time && " (ends the next day)"}
                  </p>
                  {lockedHint("schedule")}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Webinar joining URL *</Label>
                    <Input type="url" placeholder="https://zoom.us/j/…" value={form.webinar_url} onChange={(e) => update({ webinar_url: e.target.value })} disabled={!canEdit("webinar_url")} />
                    {fieldError("webinar_url")}{lockedHint("webinar_url")}
                    {changes.includes("webinar_url") && webinar.config_version > 0 && (
                      <p className="text-xs text-amber-600 mt-1">A new joining link needs admin approval again before learners see it.</p>
                    )}
                  </div>
                  <div>
                    <Label>WhatsApp group / community URL</Label>
                    <Input type="url" placeholder="https://chat.whatsapp.com/…" value={form.whatsapp_url ?? ""} onChange={(e) => update({ whatsapp_url: e.target.value })} disabled={!canEdit("whatsapp_url")} />
                    {fieldError("whatsapp_url")}{lockedHint("whatsapp_url")}
                  </div>
                  <div>
                    <Label>Registration / landing page URL</Label>
                    <Input type="url" placeholder="https://…" value={form.registration_url ?? ""} onChange={(e) => update({ registration_url: e.target.value })} disabled={!canEdit("registration_url")} />
                    {fieldError("registration_url")}{lockedHint("registration_url")}
                  </div>
                  <div>
                    <Label>Calendar integration</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={form.calendar_details.provider ?? "none"} onValueChange={(v) => update({ calendar_details: { ...form.calendar_details, provider: v as any } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="google">Google Calendar</SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Event ID (optional)" value={form.calendar_details.event_id ?? ""} maxLength={500}
                        onChange={(e) => update({ calendar_details: { ...form.calendar_details, event_id: e.target.value } })} />
                    </div>
                    {fieldError("calendar_details")}
                    <p className="text-xs text-muted-foreground mt-1">Stored for reference. Calendar API sync is not connected yet; add-to-calendar links always use the published time.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <Button variant="outline" onClick={saveDraft} disabled={!!busy || !dirty} className="gap-2">
                    {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save draft
                  </Button>
                  <Button variant="outline" onClick={() => { runValidation(form); setPreviewOpen(true); }} className="gap-2"><Eye className="h-4 w-4" />Preview</Button>
                  <Button
                    onClick={() => { if (runValidation(form)) setPublishOpen(true); }}
                    disabled={!!busy || !perms.publish || notApproved || (webinar.config_version > 0 && changes.length === 0)}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />{webinar.config_version === 0 && changes.length === 0 ? "Publish & enable sync" : "Publish"}
                  </Button>
                  {pendingChanges && (
                    <Button variant="ghost" onClick={discard} disabled={!!busy} className="gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" />Discard changes
                    </Button>
                  )}
                </div>
                {!perms.publish && <p className="text-xs text-muted-foreground">Publishing is not enabled for your account. You can still save drafts.</p>}
                {perms.publish && notApproved && <p className="text-xs text-amber-600">Your coach account must be approved by an admin before you can publish.</p>}
              </div>

              {/* Sync status */}
              {perms.view_sync && webinar.config_version > 0 && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Synchronization · v{webinar.config_version}</h3>
                    <div className="flex items-center gap-2">
                      {syncState === "complete" && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">All applicable platforms acknowledged</Badge>}
                      {syncState === "in_progress" && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">In progress</Badge>}
                      {syncState === "failed" && <Badge variant="destructive">Some platforms failed</Badge>}
                      <Button size="sm" variant="ghost" onClick={() => load({ keepForm: true })}><RefreshCw className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {destinations.map((d) => (
                      <div key={d.destination} className="py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                        <span className="w-32 font-medium text-foreground">{SYNC_DESTINATIONS.find((x) => x.key === d.destination)?.label}</span>
                        <SyncStatusBadge status={d.status} />
                        <span className="text-xs text-muted-foreground flex-1">
                          {d.status === "synced" ? `Acknowledged ${fmt(d.acknowledged_at)}` : d.last_error ?? ""}
                          {d.attempts > 1 && ` · ${d.attempts} attempts`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Failed platforms are retried automatically with backoff. Administrators can retry them manually.</p>
                </div>
              )}

              {/* History */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><History className="h-4 w-4" />Update history</h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No published versions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <div key={v.version} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">v{v.version}</Badge>
                          <span className="text-foreground">{SOURCE_LABEL[v.change_source] ?? v.change_source}</span>
                          <span className="text-muted-foreground">by {actorName(v.published_by)} · {fmt(v.published_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {v.previous_config ? `Changed: ${v.changed_fields.join(", ") || "—"}` : "Initial managed version"}
                          {v.previous_config && v.changed_fields.some((f) => ["date", "start_time", "timezone"].includes(f)) &&
                            ` · ${v.previous_config.date} ${v.previous_config.start_time} ${v.previous_config.timezone} → ${v.config.date} ${v.config.start_time} ${v.config.timezone}`}
                        </p>
                        {v.change_summary && <p className="text-xs text-foreground mt-1">“{v.change_summary}”</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
          {form && published && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/20 text-primary">Upcoming</span>
                <h3 className="text-base font-bold text-foreground">{form.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {form.date} · {form.start_time}–{form.end_time} ({form.timezone}) · {durationMinutes(form.start_time, form.end_time)} min
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.whatsapp_url && <a href={form.whatsapp_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">WhatsApp group</a>}
                  {form.registration_url && <a href={form.registration_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Registration page</a>}
                  {!errors.date && !errors.timezone && (
                    <a
                      href={googleCalendarUrl({ title: form.title, date: form.date, time: form.start_time, durationMinutes: durationMinutes(form.start_time, form.end_time), timezone: form.timezone })}
                      target="_blank" rel="noreferrer" className="text-xs text-primary underline"
                    >Add to Google Calendar</a>
                  )}
                </div>
              </div>
              {changes.length > 0 ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-foreground">Changes from the published version</p>
                  {changes.map((c) => <p key={c} className="text-muted-foreground">• {FIELD_LABEL[c]}</p>)}
                </div>
              ) : <p className="text-sm text-muted-foreground">No changes from the published version.</p>}
              {Object.keys(errors).length > 0 && (
                <p className="text-sm text-destructive">Fix {Object.keys(errors).length} validation issue(s) before publishing.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Publish confirmation */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Publish webinar changes?</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            {changes.length > 0
              ? <p className="text-muted-foreground">Publishing: {changes.map((c) => FIELD_LABEL[c]).join(", ")}.</p>
              : <p className="text-muted-foreground">This makes the current details version 1 and turns on synchronization for this webinar.</p>}
            {changes.includes("schedule") && <p className="text-muted-foreground">Registrations are kept. Reminders will be rescheduled to the new time.</p>}
            {changes.includes("webinar_url") && webinar && webinar.config_version > 0 && (
              <p className="text-amber-600">The new joining link goes back to admin approval. Learners and integrations keep receiving no link until it is approved.</p>
            )}
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} placeholder="e.g. Moved to Saturday due to holiday" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button onClick={publish} disabled={!!busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoachManageWebinar;
