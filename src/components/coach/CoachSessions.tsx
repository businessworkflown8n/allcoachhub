import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Clock, Video, ExternalLink, PlayCircle, Paperclip, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: string;
  client_id: string | null;
  client_name: string | null;
  title: string;
  topic: string | null;
  description: string | null;
  tags: string[] | null;
  session_type: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: string;
  agenda: string | null;
  outcome: string | null;
  recurrence_type?: string;
  parent_session_id?: string | null;
}

interface Client { id: string; full_name: string; }
interface CourseOpt { id: string; title: string; thumbnail_url: string | null; enrolled_count: number; }

const TYPES = ["one_on_one", "group", "workshop", "discovery"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CoachSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [notesOpen, setNotesOpen] = useState<Session | null>(null);
  const [mediaOpen, setMediaOpen] = useState<Session | null>(null);
  const [notesForm, setNotesForm] = useState({ summary: "", private_notes: "", title: "", external_url: "", file_url: "", client_visible: true });
  const [form, setForm] = useState({
    title: "", topic: "", description: "", tags: "",
    course_id: "", client_id: "", client_name: "", session_type: "one_on_one",
    scheduled_at: "", duration_minutes: 60, meeting_url: "", agenda: "",
    recurrence_type: "none" as "none"|"daily"|"weekly"|"monthly",
    rec_interval: 1, rec_days: [] as number[],
    rec_end_type: "after" as "never"|"after"|"on", rec_end_after: 4, rec_end_on: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [sRes, cRes, coRes] = await Promise.all([
      supabase.from("coach_sessions").select("*").eq("coach_id", user.id).order("scheduled_at", { ascending: false }),
      supabase.from("coach_clients").select("id, full_name").eq("coach_id", user.id),
      supabase.from("courses").select("id, title, thumbnail_url").eq("coach_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSessions((sRes.data || []) as any);
    setClients((cRes.data || []) as any);
    const courseList = (coRes.data || []) as any[];
    const counts: Record<string, number> = {};
    if (courseList.length) {
      const { data: enr } = await supabase
        .from("enrollments").select("course_id")
        .in("course_id", courseList.map((c) => c.id));
      for (const e of enr || []) counts[(e as any).course_id] = (counts[(e as any).course_id] || 0) + 1;
    }
    setCourses(courseList.map((c) => ({ ...c, enrolled_count: counts[c.id] || 0 })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const resetForm = () => {
    const now = new Date(); now.setMinutes(0); now.setSeconds(0);
    setForm({
      title: "", topic: "", description: "", tags: "",
      course_id: "", client_id: "", client_name: "", session_type: "one_on_one",
      scheduled_at: now.toISOString().slice(0, 16), duration_minutes: 60, meeting_url: "", agenda: "",
      recurrence_type: "none", rec_interval: 1, rec_days: [], rec_end_type: "after", rec_end_after: 4, rec_end_on: "",
    });
  };

  const openNew = () => { setEditing(null); resetForm(); setOpen(true); };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({
      title: s.title, topic: s.topic || "", description: s.description || "", tags: (s.tags || []).join(", "),
      course_id: (s as any).course_id || "", client_id: s.client_id || "", client_name: s.client_name || "",
      session_type: s.session_type, scheduled_at: new Date(s.scheduled_at).toISOString().slice(0, 16),
      duration_minutes: s.duration_minutes, meeting_url: s.meeting_url || "", agenda: s.agenda || "",
      recurrence_type: "none", rec_interval: 1, rec_days: [], rec_end_type: "after", rec_end_after: 4, rec_end_on: "",
    });
    setOpen(true);
  };

  // Pre-generate future recurring occurrences (capped at 10)
  const buildOccurrences = (startISO: string): string[] => {
    if (form.recurrence_type === "none") return [];
    const start = new Date(startISO);
    const occs: string[] = [];
    const max = form.rec_end_type === "after" ? Math.min(form.rec_end_after - 1, 9) : 9;
    const endOn = form.rec_end_type === "on" && form.rec_end_on ? new Date(form.rec_end_on).getTime() : Infinity;
    const interval = Math.max(1, form.rec_interval || 1);
    let cur = new Date(start);
    if (form.recurrence_type === "weekly" && form.rec_days.length > 0) {
      // For each subsequent week, emit selected weekdays in order
      for (let w = 0; w < 12 && occs.length < 9; w++) {
        for (const d of [...form.rec_days].sort()) {
          const occ = new Date(start);
          occ.setDate(start.getDate() + w * 7 * interval + ((d - start.getDay() + 7) % 7));
          if (occ.getTime() <= start.getTime()) continue;
          if (occ.getTime() > endOn) break;
          occs.push(occ.toISOString());
          if (occs.length >= 9) break;
        }
      }
    } else {
      for (let i = 0; i < max + 1; i++) {
        const next = new Date(cur);
        if (form.recurrence_type === "daily") next.setDate(next.getDate() + interval);
        else if (form.recurrence_type === "weekly") next.setDate(next.getDate() + 7 * interval);
        else if (form.recurrence_type === "monthly") next.setMonth(next.getMonth() + interval);
        if (next.getTime() > endOn) break;
        occs.push(next.toISOString());
        cur = next;
      }
    }
    return occs.slice(0, 9);
  };

  const save = async () => {
    if (!user || !form.title.trim() || !form.scheduled_at) { toast.error("Title and date required"); return; }
    if (!form.course_id) { toast.error("Please select a course for this session"); return; }
    if (form.meeting_url && !/^https?:\/\//i.test(form.meeting_url)) { toast.error("Meeting URL must start with http(s)://"); return; }
    const client = clients.find((c) => c.id === form.client_id);
    const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const startISO = new Date(form.scheduled_at).toISOString();
    const recurrenceRule = form.recurrence_type === "none" ? null : {
      interval: form.rec_interval, days_of_week: form.rec_days,
      end_type: form.rec_end_type, end_after: form.rec_end_after, end_on: form.rec_end_on || null,
    };
    const payload: any = {
      coach_id: user.id, title: form.title, topic: form.topic || null, description: form.description || null,
      tags: tagsArr, course_id: form.course_id,
      client_id: form.client_id || null,
      client_name: client?.full_name || form.client_name || null,
      session_type: form.session_type, scheduled_at: startISO,
      duration_minutes: Number(form.duration_minutes),
      meeting_url: form.meeting_url || null, agenda: form.agenda || null,
      recurrence_type: form.recurrence_type, recurrence_rule: recurrenceRule,
    };

    const res = editing
      ? await supabase.from("coach_sessions").update(payload).eq("id", editing.id).select("id").maybeSingle()
      : await supabase.from("coach_sessions").insert(payload).select("id").maybeSingle();
    if (res.error) { toast.error(res.error.message); return; }
    const sessionId = (res.data as any)?.id || editing?.id;

    // Generate recurring children only on create
    if (!editing && sessionId && form.recurrence_type !== "none") {
      const occs = buildOccurrences(startISO);
      if (occs.length > 0) {
        const children = occs.map((iso) => ({ ...payload, scheduled_at: iso, parent_session_id: sessionId, recurrence_type: "none", recurrence_rule: null }));
        await supabase.from("coach_sessions").insert(children);
      }
    }

    toast.success(editing ? "Session updated" : `Session scheduled · ${form.recurrence_type !== "none" ? "recurring instances generated · " : ""}learners notified`);
    if (sessionId) {
      supabase.functions.invoke("notify-course-session", { body: { sessionId, kind: editing ? "updated" : "scheduled" } }).catch(() => {});
    }
    setOpen(false); load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("coach_sessions").update({ status }).eq("id", id);
    toast.success(`Marked as ${status}`);
    if (status === "cancelled") {
      supabase.functions.invoke("notify-course-session", { body: { sessionId: id, kind: "cancelled" } }).catch(() => {});
    }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    await supabase.from("coach_sessions").delete().eq("id", id);
    load();
  };

  const openNotes = async (s: Session) => {
    setNotesOpen(s);
    const { data } = await supabase.from("coach_session_notes").select("*").eq("session_id", s.id).maybeSingle();
    setNotesForm({
      summary: data?.summary || "", private_notes: data?.private_notes || "",
      title: data?.title || "", external_url: data?.external_url || "", file_url: data?.file_url || "",
      client_visible: data?.client_visible ?? true,
    });
  };
  const saveNotes = async () => {
    if (!user || !notesOpen) return;
    const { data: existing } = await supabase.from("coach_session_notes").select("id").eq("session_id", notesOpen.id).maybeSingle();
    const payload = { session_id: notesOpen.id, coach_id: user.id, ...notesForm };
    const { error } = existing
      ? await supabase.from("coach_session_notes").update(payload).eq("id", existing.id)
      : await supabase.from("coach_session_notes").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Notes saved · learners can view if marked visible");
    setNotesOpen(null);
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({ ...f, rec_days: f.rec_days.includes(d) ? f.rec_days.filter((x) => x !== d) : [...f.rec_days, d] }));
  };

  const now = Date.now();
  const upcoming = sessions.filter((s) => new Date(s.scheduled_at).getTime() >= now && s.status === "scheduled");
  const past = sessions.filter((s) => new Date(s.scheduled_at).getTime() < now || s.status !== "scheduled");

  const renderRow = (s: Session) => (
    <div key={s.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-foreground">{s.title}</div>
          {s.topic && <div className="text-xs text-primary mt-0.5">{s.topic}</div>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(s.scheduled_at).toLocaleString()}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
            {s.client_name && <span>· {s.client_name}</span>}
          </div>
          {(s.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(s.tags || []).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{s.session_type.replace("_", " ")}</Badge>
          <Badge variant={s.status === "completed" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>{s.status}</Badge>
          {s.parent_session_id && <Badge variant="outline" className="text-[10px]">↻ recurring</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap pt-2">
        {s.meeting_url && (
          <a href={s.meeting_url} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline"><Video className="h-3 w-3 mr-1" /> Join <ExternalLink className="h-3 w-3 ml-1" /></Button>
          </a>
        )}
        <Button size="sm" variant="outline" onClick={() => openNotes(s)}><FileText className="h-3 w-3 mr-1" />Notes</Button>
        <Button size="sm" variant="outline" onClick={() => setMediaOpen(s)}><PlayCircle className="h-3 w-3 mr-1" />Recordings & Resources</Button>
        {s.status === "scheduled" && (
          <>
            <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "completed")}>Mark Completed</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "no_show")}>No-show</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "cancelled")}>Cancel</Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>Delete</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Calendar className="h-5 w-5" /> Sessions</h2>
          <p className="text-sm text-muted-foreground">Schedule, recurring sessions, recordings, notes & resources — auto-visible to enrolled learners</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Schedule Session</Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {loading ? <p className="text-muted-foreground">Loading...</p> :
            upcoming.length === 0 ? <div className="text-center py-12 border border-dashed rounded-xl"><p className="text-muted-foreground">No upcoming sessions.</p></div>
            : upcoming.map(renderRow)}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 ? <p className="text-muted-foreground text-center py-8">No past sessions.</p> : past.map(renderRow)}
        </TabsContent>
      </Tabs>

      {/* Schedule / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Session" : "Schedule Session"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Week 3 Live Q&A" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Topic</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="AI Automation" /></div>
              <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="n8n, prompts" /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Course *</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder={courses.length ? "Select a course" : "No courses yet — create one first"} /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-6 w-6 rounded object-cover" />}
                        <span>{c.title}</span>
                        <span className="text-xs text-muted-foreground">· {c.enrolled_count} enrolled</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">All enrolled learners of this course are notified by email + in-app.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.session_type} onValueChange={(v) => setForm({ ...form, session_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client</Label>
                <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date & Time *</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Meeting URL</Label><Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="Zoom / Google Meet link" /></div>
            <div><Label>Agenda</Label><Textarea rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></div>

            {!editing && (
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <div>
                  <Label>Repeat</Label>
                  <Select value={form.recurrence_type} onValueChange={(v: any) => setForm({ ...form, recurrence_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does Not Repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.recurrence_type !== "none" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Every</Label>
                        <Input type="number" min={1} value={form.rec_interval} onChange={(e) => setForm({ ...form, rec_interval: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>End</Label>
                        <Select value={form.rec_end_type} onValueChange={(v: any) => setForm({ ...form, rec_end_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="after">After N occurrences</SelectItem>
                            <SelectItem value="on">On specific date</SelectItem>
                            <SelectItem value="never">Never (max 10)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {form.recurrence_type === "weekly" && (
                      <div>
                        <Label>Days of week</Label>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {WEEKDAYS.map((d, i) => (
                            <button key={i} type="button" onClick={() => toggleDay(i)}
                              className={`px-2 py-1 rounded text-xs border ${form.rec_days.includes(i) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {form.rec_end_type === "after" && (
                      <div><Label>Number of occurrences</Label><Input type="number" min={1} max={10} value={form.rec_end_after} onChange={(e) => setForm({ ...form, rec_end_after: Number(e.target.value) })} /></div>
                    )}
                    {form.rec_end_type === "on" && (
                      <div><Label>End date</Label><Input type="date" value={form.rec_end_on} onChange={(e) => setForm({ ...form, rec_end_on: e.target.value })} /></div>
                    )}
                    <p className="text-[11px] text-muted-foreground">Up to 10 instances are pre-generated; you can edit/cancel each individually.</p>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Schedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesOpen} onOpenChange={(o) => !o && setNotesOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Session Notes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={notesForm.title} onChange={(e) => setNotesForm({ ...notesForm, title: e.target.value })} placeholder="Session recap" /></div>
            <div><Label>External Link (preferred — Google Docs, Notion, etc.)</Label><Input value={notesForm.external_url} onChange={(e) => setNotesForm({ ...notesForm, external_url: e.target.value })} placeholder="https://docs.google.com/..." /></div>
            <div><Label>Or File URL</Label><Input value={notesForm.file_url} onChange={(e) => setNotesForm({ ...notesForm, file_url: e.target.value })} placeholder="https://...pdf" /></div>
            <div><Label>Summary (shown to learners)</Label><Textarea rows={4} value={notesForm.summary} onChange={(e) => setNotesForm({ ...notesForm, summary: e.target.value })} /></div>
            <div><Label>Private Notes (internal)</Label><Textarea rows={3} value={notesForm.private_notes} onChange={(e) => setNotesForm({ ...notesForm, private_notes: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={notesForm.client_visible} onCheckedChange={(v) => setNotesForm({ ...notesForm, client_visible: !!v })} />
              Visible to enrolled learners
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(null)}>Cancel</Button>
            <Button onClick={saveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recordings & Resources Dialog */}
      {mediaOpen && (
        <MediaDialog session={mediaOpen} onClose={() => setMediaOpen(null)} coachId={user!.id} />
      )}
    </div>
  );
}

function MediaDialog({ session, onClose, coachId }: { session: Session; onClose: () => void; coachId: string; }) {
  const [recs, setRecs] = useState<any[]>([]);
  const [res, setRes] = useState<any[]>([]);
  const [recForm, setRecForm] = useState({ title: "", recording_url: "", provider: "youtube" });
  const [resForm, setResForm] = useState({ title: "", resource_type: "link", external_url: "", file_url: "" });

  const reload = async () => {
    const [r1, r2] = await Promise.all([
      supabase.from("session_recordings").select("*").eq("session_id", session.id).order("created_at"),
      supabase.from("session_resources").select("*").eq("session_id", session.id).order("created_at"),
    ]);
    setRecs(r1.data || []); setRes(r2.data || []);
  };
  useEffect(() => { reload(); }, [session.id]);

  const detectProvider = (url: string) => {
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
    if (u.includes("vimeo")) return "vimeo";
    if (u.includes("loom")) return "loom";
    if (u.includes("zoom")) return "zoom";
    if (u.includes("drive.google")) return "drive";
    if (u.includes("onedrive") || u.includes("sharepoint")) return "onedrive";
    if (u.includes("dropbox")) return "dropbox";
    return "other";
  };

  const addRec = async () => {
    if (!recForm.title.trim() || !recForm.recording_url.trim()) { toast.error("Title and URL required"); return; }
    if (!/^https?:\/\//i.test(recForm.recording_url)) { toast.error("URL must start with http(s)://"); return; }
    const { error } = await supabase.from("session_recordings").insert({
      session_id: session.id, coach_id: coachId,
      title: recForm.title, recording_url: recForm.recording_url,
      provider: detectProvider(recForm.recording_url),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Recording added");
    setRecForm({ title: "", recording_url: "", provider: "youtube" });
    reload();
  };
  const removeRec = async (id: string) => {
    await supabase.from("session_recordings").delete().eq("id", id);
    reload();
  };

  const addRes = async () => {
    if (!resForm.title.trim() || (!resForm.external_url && !resForm.file_url)) { toast.error("Title and at least one URL required"); return; }
    const { error } = await supabase.from("session_resources").insert({
      session_id: session.id, coach_id: coachId,
      title: resForm.title, resource_type: resForm.resource_type,
      external_url: resForm.external_url || null, file_url: resForm.file_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Resource added");
    setResForm({ title: "", resource_type: "link", external_url: "", file_url: "" });
    reload();
  };
  const removeRes = async (id: string) => {
    await supabase.from("session_resources").delete().eq("id", id);
    reload();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Recordings & Resources · {session.title}</DialogTitle></DialogHeader>
        <Tabs defaultValue="recordings">
          <TabsList>
            <TabsTrigger value="recordings"><PlayCircle className="h-3 w-3 mr-1" />Recordings ({recs.length})</TabsTrigger>
            <TabsTrigger value="resources"><Paperclip className="h-3 w-3 mr-1" />Resources ({res.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="recordings" className="space-y-3 mt-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Title" value={recForm.title} onChange={(e) => setRecForm({ ...recForm, title: e.target.value })} />
                <Input placeholder="https:// (YouTube, Vimeo, Loom, Zoom, Drive, etc.)" value={recForm.recording_url} onChange={(e) => setRecForm({ ...recForm, recording_url: e.target.value })} />
              </div>
              <Button size="sm" onClick={addRec}><Plus className="h-3 w-3 mr-1" />Add Recording</Button>
            </div>
            {recs.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <PlayCircle className="h-4 w-4 text-primary" />
                <a href={r.recording_url} target="_blank" rel="noreferrer" className="flex-1 text-sm hover:underline">{r.title}</a>
                <Badge variant="outline" className="text-[10px]">{r.provider}</Badge>
                <Button size="sm" variant="ghost" onClick={() => removeRec(r.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="resources" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">External links are recommended for performance and storage. File URLs supported for small PDFs/DOCX/XLSX (&lt;1 MB).</p>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Title" value={resForm.title} onChange={(e) => setResForm({ ...resForm, title: e.target.value })} />
                <Select value={resForm.resource_type} onValueChange={(v) => setResForm({ ...resForm, resource_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">External Link</SelectItem>
                    <SelectItem value="file">File URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="External URL (Drive, Notion, GitHub…)" value={resForm.external_url} onChange={(e) => setResForm({ ...resForm, external_url: e.target.value })} />
              <Input placeholder="Or file URL (hosted PDF/DOCX/XLSX)" value={resForm.file_url} onChange={(e) => setResForm({ ...resForm, file_url: e.target.value })} />
              <Button size="sm" onClick={addRes}><Plus className="h-3 w-3 mr-1" />Add Resource</Button>
            </div>
            {res.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <a href={r.external_url || r.file_url} target="_blank" rel="noreferrer" className="flex-1 text-sm hover:underline">{r.title}</a>
                <Badge variant="outline" className="text-[10px]">{r.resource_type}</Badge>
                <Button size="sm" variant="ghost" onClick={() => removeRes(r.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
