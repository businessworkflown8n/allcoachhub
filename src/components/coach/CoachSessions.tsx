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
import { Plus, Calendar, Clock, Video, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: string;
  client_id: string | null;
  client_name: string | null;
  title: string;
  session_type: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: string;
  agenda: string | null;
  outcome: string | null;
}

interface Client { id: string; full_name: string; }
interface CourseOpt { id: string; title: string; thumbnail_url: string | null; enrolled_count: number; }

const TYPES = ["one_on_one", "group", "workshop", "discovery"];

export default function CoachSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [notesOpen, setNotesOpen] = useState<Session | null>(null);
  const [notesForm, setNotesForm] = useState({ summary: "", private_notes: "" });
  const [form, setForm] = useState({
    title: "", course_id: "", client_id: "", client_name: "", session_type: "one_on_one",
    scheduled_at: "", duration_minutes: 60, meeting_url: "", agenda: "",
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
    // Enrollment counts per course
    const courseList = (coRes.data || []) as any[];
    const counts: Record<string, number> = {};
    if (courseList.length) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courseList.map((c) => c.id));
      for (const e of enr || []) counts[(e as any).course_id] = (counts[(e as any).course_id] || 0) + 1;
    }
    setCourses(courseList.map((c) => ({ ...c, enrolled_count: counts[c.id] || 0 })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    const now = new Date(); now.setMinutes(0); now.setSeconds(0);
    setForm({ title: "", course_id: "", client_id: "", client_name: "", session_type: "one_on_one", scheduled_at: now.toISOString().slice(0, 16), duration_minutes: 60, meeting_url: "", agenda: "" });
    setOpen(true);
  };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({
      title: s.title, course_id: (s as any).course_id || "", client_id: s.client_id || "", client_name: s.client_name || "",
      session_type: s.session_type, scheduled_at: new Date(s.scheduled_at).toISOString().slice(0, 16),
      duration_minutes: s.duration_minutes, meeting_url: s.meeting_url || "", agenda: s.agenda || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.title.trim() || !form.scheduled_at) { toast.error("Title and date required"); return; }
    if (!form.course_id) { toast.error("Please select a course for this session"); return; }
    if (form.meeting_url && !/^https?:\/\//i.test(form.meeting_url)) { toast.error("Meeting URL must start with http(s)://"); return; }
    const client = clients.find((c) => c.id === form.client_id);
    const payload: any = {
      coach_id: user.id, title: form.title,
      course_id: form.course_id,
      client_id: form.client_id || null,
      client_name: client?.full_name || form.client_name || null,
      session_type: form.session_type,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      meeting_url: form.meeting_url || null,
      agenda: form.agenda || null,
    };
    const res = editing
      ? await supabase.from("coach_sessions").update(payload).eq("id", editing.id).select("id").maybeSingle()
      : await supabase.from("coach_sessions").insert(payload).select("id").maybeSingle();
    if (res.error) { toast.error(res.error.message); return; }
    const sessionId = (res.data as any)?.id || editing?.id;
    toast.success(editing ? "Session updated · learners notified" : "Session scheduled · learners notified");
    // Fire-and-forget emails to enrolled learners (in-app notif handled by DB trigger)
    if (sessionId) {
      supabase.functions.invoke("notify-course-session", {
        body: { sessionId, kind: editing ? "updated" : "scheduled" },
      }).catch(() => {});
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
    setNotesForm({ summary: data?.summary || "", private_notes: data?.private_notes || "" });
  };
  const saveNotes = async () => {
    if (!user || !notesOpen) return;
    const { data: existing } = await supabase.from("coach_session_notes").select("id").eq("session_id", notesOpen.id).maybeSingle();
    const payload = { session_id: notesOpen.id, coach_id: user.id, ...notesForm };
    const { error } = existing
      ? await supabase.from("coach_session_notes").update(payload).eq("id", existing.id)
      : await supabase.from("coach_session_notes").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Notes saved");
    setNotesOpen(null);
  };

  const now = Date.now();
  const upcoming = sessions.filter((s) => new Date(s.scheduled_at).getTime() >= now && s.status === "scheduled");
  const past = sessions.filter((s) => new Date(s.scheduled_at).getTime() < now || s.status !== "scheduled");

  const renderRow = (s: Session) => (
    <div key={s.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-foreground">{s.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(s.scheduled_at).toLocaleString()}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
            {s.client_name && <span>· {s.client_name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{s.session_type.replace("_", " ")}</Badge>
          <Badge variant={s.status === "completed" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>{s.status}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap pt-2">
        {s.meeting_url && (
          <a href={s.meeting_url} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline"><Video className="h-3 w-3 mr-1" /> Join <ExternalLink className="h-3 w-3 ml-1" /></Button>
          </a>
        )}
        <Button size="sm" variant="outline" onClick={() => openNotes(s)}>Notes</Button>
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
          <p className="text-sm text-muted-foreground">Schedule, track, and document 1:1 and group sessions</p>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Session" : "Schedule Session"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Discovery call with Priya" /></div>
            <div>
              <Label>Course *</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder={courses.length ? "Select a course" : "No courses yet — create one first"} /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-6 w-6 rounded object-cover" />}
                        <span className="flex-1">{c.title}</span>
                        <span className="text-xs text-muted-foreground">· {c.enrolled_count} enrolled</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">All enrolled learners of this course will be notified by email + in-app.</p>
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
            <div><Label>Agenda</Label><Textarea rows={3} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Schedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notesOpen} onOpenChange={(o) => !o && setNotesOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Session Notes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Summary</Label><Textarea rows={4} value={notesForm.summary} onChange={(e) => setNotesForm({ ...notesForm, summary: e.target.value })} placeholder="What was discussed?" /></div>
            <div><Label>Private Notes</Label><Textarea rows={4} value={notesForm.private_notes} onChange={(e) => setNotesForm({ ...notesForm, private_notes: e.target.value })} placeholder="Internal notes (not shared with client)" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(null)}>Cancel</Button>
            <Button onClick={saveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
