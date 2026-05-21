import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshopAccess } from "@/hooks/useWorkshopAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Video, Users, BarChart3, Calendar, Copy, Trash2, Edit, ExternalLink } from "lucide-react";
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

const CoachWorkshops = () => {
  const { user } = useAuth();
  const { meetingCreation, analyticsAccess } = useWorkshopAccess();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const totalRegs = workshops.reduce((s, w) => s + (w.registrations || 0), 0);
  const totalAttended = workshops.reduce((s, w) => s + (w.attended || 0), 0);

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-emerald-500/5 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/20 p-3"><Video className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold mb-2">Live Sessions</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-display tracking-tight">Workshops</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">Create, schedule, and manage your live workshops with built-in attendance tracking.</p>
            </div>
          </div>
          {meetingCreation && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.6)] hover:shadow-[0_12px_40px_-10px_hsl(var(--primary)/0.8)] transition-all hover:-translate-y-0.5">
                  <Plus className="h-4 w-4 mr-2" />Create Workshop
                </Button>
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

      {analyticsAccess && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Workshops", value: workshops.length, icon: Calendar },
            { label: "Total Registrations", value: totalRegs, icon: Users },
            { label: "Attendance Rate", value: `${totalRegs > 0 ? Math.round((totalAttended / totalRegs) * 100) : 0}%`, icon: BarChart3 },
          ].map((s) => (
            <div key={s.label} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.4)]">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground font-display tracking-tight mt-2">{s.value}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      <Card>
        <CardHeader><CardTitle className="text-foreground">Your Workshops</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Attended</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workshops.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium text-foreground">{w.title}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(w.scheduled_at), "MMM dd, yyyy HH:mm")}</TableCell>
                      <TableCell className="text-muted-foreground">{w.duration_minutes}m</TableCell>
                      <TableCell className="text-foreground">{w.registrations}</TableCell>
                      <TableCell className="text-foreground">{w.attended}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === "live" ? "default" : w.status === "completed" ? "secondary" : "outline"}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {w.meeting_url && <Button variant="ghost" size="icon" onClick={() => copyLink(w.meeting_url!)}><Copy className="h-4 w-4" /></Button>}
                          {w.meeting_url && <Button variant="ghost" size="icon" asChild><a href={w.meeting_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(w)}><Edit className="h-4 w-4" /></Button>
                          {w.status === "scheduled" && <Button variant="ghost" size="icon" className="text-primary" onClick={() => handleStatusChange(w.id, "live")}>▶</Button>}
                          {w.status === "live" && <Button variant="ghost" size="icon" onClick={() => handleStatusChange(w.id, "completed")}>⏹</Button>}
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(w.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workshops.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No workshops yet. Create your first one!</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachWorkshops;
