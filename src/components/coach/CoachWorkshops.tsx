import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshopAccess } from "@/hooks/useWorkshopAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Video, Users, BarChart3, Calendar, Copy, Trash2, Edit, ExternalLink,
  Play, Square, Sparkles, Radio, Search, Clock
} from "lucide-react";
import { format } from "date-fns";

interface Workshop {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  meeting_provider: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  max_attendees: number | null;
  status: string;
  recording_url: string | null;
  registrations?: number;
  attended?: number;
}

const STATUS_META: Record<string, { label: string; dot: string; chip: string }> = {
  scheduled: { label: "Scheduled", dot: "bg-blue-400", chip: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  live: { label: "Live Now", dot: "bg-red-400 animate-pulse", chip: "bg-red-500/15 text-red-300 border-red-500/30" },
  completed: { label: "Completed", dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  cancelled: { label: "Cancelled", dot: "bg-muted-foreground", chip: "bg-muted/40 text-muted-foreground border-border" },
};

const CoachWorkshops = () => {
  const { user } = useAuth();
  const { meetingCreation, analyticsAccess } = useWorkshopAccess();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "scheduled" | "live" | "completed">("all");
  const [form, setForm] = useState({
    title: "", description: "", scheduled_at: "", duration_minutes: 60,
    meeting_url: "", meeting_provider: "manual", is_recurring: false,
    recurrence_pattern: "", max_attendees: "",
  });

  const fetchWorkshops = async () => {
    if (!user) return;
    setLoading(true);
    const { data: ws } = await supabase.from("workshops").select("*").eq("coach_id", user.id).order("scheduled_at", { ascending: false });
    if (!ws) { setLoading(false); return; }
    const wsIds = ws.map((w) => w.id);
    const { data: regs } = wsIds.length > 0
      ? await supabase.from("workshop_registrations").select("workshop_id, status").in("workshop_id", wsIds)
      : { data: [] };
    const regMap = new Map<string, { total: number; attended: number }>();
    (regs || []).forEach((r) => {
      const e = regMap.get(r.workshop_id) || { total: 0, attended: 0 };
      e.total++;
      if (r.status === "attended" || r.status === "completed") e.attended++;
      regMap.set(r.workshop_id, e);
    });
    setWorkshops(ws.map((w) => {
      const s = regMap.get(w.id) || { total: 0, attended: 0 };
      return { ...w, registrations: s.total, attended: s.attended };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchWorkshops(); }, [user]);

  const resetForm = () => {
    setForm({ title: "", description: "", scheduled_at: "", duration_minutes: 60, meeting_url: "", meeting_provider: "manual", is_recurring: false, recurrence_pattern: "", max_attendees: "" });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!user || !form.title || !form.scheduled_at) {
      toast({ title: "Error", description: "Title and date are required", variant: "destructive" });
      return;
    }
    const payload = {
      coach_id: user.id,
      title: form.title,
      description: form.description || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: form.duration_minutes,
      meeting_url: form.meeting_url || null,
      meeting_provider: form.meeting_provider,
      is_recurring: form.is_recurring,
      recurrence_pattern: form.is_recurring ? form.recurrence_pattern : null,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
    };
    if (editingId) {
      await supabase.from("workshops").update(payload).eq("id", editingId);
      toast({ title: "Workshop updated" });
    } else {
      await supabase.from("workshops").insert(payload);
      toast({ title: "Workshop created" });
    }
    resetForm();
    setDialogOpen(false);
    fetchWorkshops();
  };

  const handleEdit = (w: Workshop) => {
    setForm({
      title: w.title,
      description: w.description || "",
      scheduled_at: w.scheduled_at.slice(0, 16),
      duration_minutes: w.duration_minutes,
      meeting_url: w.meeting_url || "",
      meeting_provider: w.meeting_provider || "manual",
      is_recurring: w.is_recurring,
      recurrence_pattern: w.recurrence_pattern || "",
      max_attendees: w.max_attendees?.toString() || "",
    });
    setEditingId(w.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("workshops").delete().eq("id", id);
    toast({ title: "Workshop deleted" });
    fetchWorkshops();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("workshops").update({ status }).eq("id", id);
    toast({ title: `Workshop marked as ${status}` });
    fetchWorkshops();
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  const stats = useMemo(() => {
    const total = workshops.length;
    const live = workshops.filter(w => w.status === "live").length;
    const upcoming = workshops.filter(w => w.status === "scheduled" && new Date(w.scheduled_at) > new Date()).length;
    const totalRegs = workshops.reduce((s, w) => s + (w.registrations || 0), 0);
    const totalAttended = workshops.reduce((s, w) => s + (w.attended || 0), 0);
    const attendance = totalRegs > 0 ? Math.round((totalAttended / totalRegs) * 100) : 0;
    return { total, live, upcoming, totalRegs, attendance };
  }, [workshops]);

  const statCards = [
    { label: "Total Workshops", value: stats.total, icon: Calendar, accent: "from-primary/20 to-transparent", iconColor: "text-primary" },
    { label: "Live Now", value: stats.live, icon: Radio, accent: "from-red-500/20 to-transparent", iconColor: "text-red-400" },
    { label: "Registrations", value: stats.totalRegs, icon: Users, accent: "from-blue-500/20 to-transparent", iconColor: "text-blue-400" },
    { label: "Attendance Rate", value: `${stats.attendance}%`, icon: BarChart3, accent: "from-emerald-500/20 to-transparent", iconColor: "text-emerald-400" },
  ];

  const filtered = workshops.filter(w => {
    if (filter !== "all" && w.status !== filter) return false;
    if (search && !w.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filterPills: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: workshops.length },
    { key: "live", label: "Live", count: workshops.filter(w => w.status === "live").length },
    { key: "scheduled", label: "Scheduled", count: workshops.filter(w => w.status === "scheduled").length },
    { key: "completed", label: "Completed", count: workshops.filter(w => w.status === "completed").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/30">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Workshops & Live Sessions</h2>
              <p className="text-sm text-muted-foreground">Plan, host, and analyze your live coaching experiences</p>
            </div>
          </div>
          {meetingCreation && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" />Create Workshop</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingId ? "Edit Workshop" : "Create Workshop"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Workshop title" /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Workshop description" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Date & Time *</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                    <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} /></div>
                  </div>
                  <div><Label>Meeting Provider</Label>
                    <Select value={form.meeting_provider} onValueChange={(v) => setForm({ ...form, meeting_provider: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Link</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Meeting URL</Label><Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://..." /></div>
                  <div><Label>Max Attendees</Label><Input type="number" value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: e.target.value })} placeholder="Unlimited" /></div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                    <Label>Recurring Session</Label>
                  </div>
                  {form.is_recurring && (
                    <div><Label>Recurrence Pattern</Label>
                      <Select value={form.recurrence_pattern} onValueChange={(v) => setForm({ ...form, recurrence_pattern: v })}>
                        <SelectTrigger><SelectValue placeholder="Select pattern" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button className="w-full" onClick={handleSubmit}>{editingId ? "Update" : "Create"} Workshop</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      {analyticsAccess && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:-translate-y-0.5`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-50 pointer-events-none`} />
                <div className="relative">
                  <Icon className={`h-5 w-5 ${s.iconColor} mb-2`} />
                  <p className="text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workshops..." className="pl-9 bg-background/40 border-border" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterPills.map(p => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filter === p.key
                  ? "bg-primary/15 text-primary border-primary/40 shadow-sm shadow-primary/10"
                  : "bg-background/40 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {p.label} <span className="ml-1 opacity-60">{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_60%)] pointer-events-none" />
          <Sparkles className="relative h-10 w-10 mx-auto text-primary mb-3" />
          <p className="relative text-foreground font-semibold">No workshops yet</p>
          <p className="relative text-sm text-muted-foreground mt-1">Create your first live session to start engaging your audience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((w) => {
            const meta = STATUS_META[w.status] || STATUS_META.scheduled;
            const isUpcoming = new Date(w.scheduled_at) > new Date();
            return (
              <div key={w.id} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${meta.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      {w.is_recurring && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border border-border bg-background/40 rounded-full px-2 py-0.5">
                          {w.recurrence_pattern || "Recurring"}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{w.title}</h3>
                    {w.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{w.description}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Calendar className="h-3 w-3" /> Date</div>
                    <p className="text-xs font-semibold text-foreground mt-1">{format(new Date(w.scheduled_at), "MMM dd, HH:mm")}</p>
                  </div>
                  <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Clock className="h-3 w-3" /> Duration</div>
                    <p className="text-xs font-semibold text-foreground mt-1">{w.duration_minutes} min</p>
                  </div>
                  <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Users className="h-3 w-3" /> Registered</div>
                    <p className="text-xs font-semibold text-foreground mt-1 tabular-nums">{w.registrations}{w.max_attendees ? ` / ${w.max_attendees}` : ""}</p>
                  </div>
                  <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><BarChart3 className="h-3 w-3" /> Attended</div>
                    <p className="text-xs font-semibold text-foreground mt-1 tabular-nums">{w.attended}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-1">
                    {w.meeting_url && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(w.meeting_url!)} title="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Open"><a href={w.meeting_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(w)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(w.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {w.status === "scheduled" && isUpcoming && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={() => handleStatusChange(w.id, "live")}>
                        <Play className="h-3 w-3" /> Go Live
                      </Button>
                    )}
                    {w.status === "live" && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => handleStatusChange(w.id, "completed")}>
                        <Square className="h-3 w-3" /> End
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoachWorkshops;
