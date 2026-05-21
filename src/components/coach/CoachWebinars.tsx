import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContactAccess } from "@/hooks/useContactAccess";
import { Video, Plus, Edit, Trash2, Users, Calendar, Clock, Download, Lock, KeyRound, DollarSign, BarChart3, Globe } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  webinar_date: string;
  webinar_time: string;
  duration_minutes: number;
  webinar_link: string;
  webinar_link_status: string;
  is_published: boolean;
  is_paid: boolean;
  price_usd: number;
  price_inr: number;
  max_attendees: number | null;
  timezone: string;
  is_recurring: boolean;
  recurring_pattern: string | null;
  registration_required: boolean;
  waiting_room: boolean;
  auto_record: boolean;
  meeting_type: string;
  webinar_type: string;
  total_revenue: number;
  created_at: string;
}

interface Registrant {
  id: string;
  learner_id: string;
  registered_at: string;
  attended: boolean;
  watch_duration_minutes: number;
  converted: boolean;
  amount_paid: number;
  registrant_name: string | null;
  registrant_email: string | null;
  registrant_phone: string | null;
  profiles: { full_name: string | null; email: string | null; contact_number: string | null; country: string | null; city: string | null; industry: string | null; current_job_title: string | null; whatsapp_number: string | null } | null;
}

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland",
];

const CoachWebinars = () => {
  const { user } = useAuth();
  const { hasAccess, isPending, requestAccess } = useContactAccess();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Webinar | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [showRegistrants, setShowRegistrants] = useState<string | null>(null);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [webinarDate, setWebinarDate] = useState("");
  const [webinarTime, setWebinarTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [webinarLink, setWebinarLink] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [priceUsd, setPriceUsd] = useState("0");
  const [priceInr, setPriceInr] = useState("0");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState("weekly");
  const [registrationRequired, setRegistrationRequired] = useState(true);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchWebinars = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("webinars")
      .select("*")
      .eq("coach_id", user.id)
      .order("webinar_date", { ascending: false });
    setWebinars((data as any[]) || []);

    if (data && data.length > 0) {
      const { data: regs } = await supabase
        .from("webinar_registrations")
        .select("webinar_id")
        .in("webinar_id", data.map((w: any) => w.id));
      const counts: Record<string, number> = {};
      (regs || []).forEach((r: any) => {
        counts[r.webinar_id] = (counts[r.webinar_id] || 0) + 1;
      });
      setRegCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchWebinars(); }, [user]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setWebinarDate(""); setWebinarTime("");
    setDuration("60"); setWebinarLink(""); setIsPaid(false); setPriceUsd("0");
    setPriceInr("0"); setMaxAttendees(""); setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
    setIsRecurring(false); setRecurringPattern("weekly"); setRegistrationRequired(true);
    setWaitingRoom(false); setAutoRecord(false); setEditing(null);
  };

  const openEdit = (w: Webinar) => {
    setEditing(w);
    setTitle(w.title);
    setDescription(w.description || "");
    setWebinarDate(w.webinar_date);
    setWebinarTime(w.webinar_time);
    setDuration(String(w.duration_minutes));
    setWebinarLink(w.webinar_link);
    setIsPaid(w.is_paid);
    setPriceUsd(String(w.price_usd));
    setPriceInr(String(w.price_inr));
    setMaxAttendees(w.max_attendees ? String(w.max_attendees) : "");
    setTimezone(w.timezone || "Asia/Kolkata");
    setIsRecurring(w.is_recurring);
    setRecurringPattern(w.recurring_pattern || "weekly");
    setRegistrationRequired(w.registration_required);
    setWaitingRoom(w.waiting_room);
    setAutoRecord(w.auto_record);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const payload = {
      coach_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      webinar_date: webinarDate,
      webinar_time: webinarTime,
      duration_minutes: parseInt(duration),
      webinar_link: webinarLink.trim(),
      is_paid: isPaid,
      price_usd: isPaid ? parseFloat(priceUsd) : 0,
      price_inr: isPaid ? parseFloat(priceInr) : 0,
      max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      timezone,
      is_recurring: isRecurring,
      recurring_pattern: isRecurring ? recurringPattern : null,
      registration_required: registrationRequired,
      waiting_room: waitingRoom,
      auto_record: autoRecord,
      webinar_type: isPaid ? "paid" : "free",
    };

    if (editing) {
      const { error } = await supabase.from("webinars").update(payload as any).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Webinar updated" });
    } else {
      const { error } = await supabase.from("webinars").insert(payload as any);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Webinar created" });
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
    fetchWebinars();
  };

  const deleteWebinar = async (id: string) => {
    if (!confirm("Delete this webinar? All registrations will be removed.")) return;
    const { error } = await supabase.from("webinars").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Webinar deleted" });
      setWebinars(webinars.filter((w) => w.id !== id));
    }
  };

  const viewRegistrants = async (webinarId: string) => {
    setShowRegistrants(webinarId);
    const { data } = await supabase
      .from("webinar_registrations")
      .select("id, learner_id, registered_at, attended, watch_duration_minutes, converted, amount_paid, registrant_name, registrant_email, registrant_phone")
      .eq("webinar_id", webinarId)
      .order("registered_at", { ascending: false });

    if (data && data.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, contact_number, country, city, industry, current_job_title, whatsapp_number")
        .in("user_id", data.map((r: any) => r.learner_id));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setRegistrants(data.map((r: any) => ({ ...r, profiles: profileMap.get(r.learner_id) || null })));
    } else {
      setRegistrants([]);
    }
  };

  const viewAnalytics = async (webinarId: string) => {
    setShowAnalytics(webinarId);
    const { data: regs } = await supabase
      .from("webinar_registrations")
      .select("*")
      .eq("webinar_id", webinarId);
    const regsList = regs || [];
    const totalRegs = regsList.length;
    const attended = regsList.filter((r: any) => r.attended).length;
    const converted = regsList.filter((r: any) => r.converted).length;
    const totalRevenue = regsList.reduce((s: number, r: any) => s + (r.amount_paid || 0), 0);
    const avgWatchTime = totalRegs > 0 ? Math.round(regsList.reduce((s: number, r: any) => s + (r.watch_duration_minutes || 0), 0) / totalRegs) : 0;
    setAnalyticsData({ totalRegs, attended, converted, totalRevenue, avgWatchTime, attendanceRate: totalRegs > 0 ? Math.round((attended / totalRegs) * 100) : 0, conversionRate: totalRegs > 0 ? Math.round((converted / totalRegs) * 100) : 0 });
  };

  const handleRequestWebinarAccess = async (learnerId: string) => {
    const { error } = await requestAccess(learnerId, "webinar");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Access requested", description: "Admin will review your request." });
  };

  const downloadCSV = () => {
    const webinar = webinars.find((w) => w.id === showRegistrants);
    const headers = ["Name", "Email", "Phone", "WhatsApp", "Country", "City", "Industry", "Job Title", "Attended", "Watch Time (min)", "Converted", "Amount Paid", "Registered At"];
    const rows: string[][] = [headers];
    registrants.forEach((r) => {
      const name = r.profiles?.full_name || r.registrant_name || "Unknown";
      const email = hasAccess(r.learner_id) ? (r.profiles?.email || r.registrant_email || "—") : "Hidden";
      const phone = hasAccess(r.learner_id) ? (r.profiles?.contact_number || r.registrant_phone || "—") : "Hidden";
      const whatsapp = hasAccess(r.learner_id) ? (r.profiles?.whatsapp_number || "—") : "Hidden";
      rows.push([
        name, email, phone, whatsapp,
        r.profiles?.country || "—",
        r.profiles?.city || "—",
        r.profiles?.industry || "—",
        r.profiles?.current_job_title || "—",
        r.attended ? "Yes" : "No",
        String(r.watch_duration_minutes || 0),
        r.converted ? "Yes" : "No",
        String(r.amount_paid || 0),
        format(new Date(r.registered_at), "yyyy-MM-dd HH:mm"),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${webinar?.title || "webinar"}-registrants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const now = new Date();
  const upcoming = webinars.filter(w => new Date(`${w.webinar_date}T${w.webinar_time}`) >= now);
  const past = webinars.filter(w => new Date(`${w.webinar_date}T${w.webinar_time}`) < now);
  const totalRevenue = webinars.reduce((s, w) => s + (w.total_revenue || 0), 0);

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">My Webinars</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Webinar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <Video className="h-4 w-4 text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{webinars.length}</p>
          <p className="text-xs text-muted-foreground">Total Webinars</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Calendar className="h-4 w-4 text-blue-400 mb-1" />
          <p className="text-2xl font-bold text-foreground">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Users className="h-4 w-4 text-green-400 mb-1" />
          <p className="text-2xl font-bold text-foreground">{Object.values(regCounts).reduce((s, c) => s + c, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Registrations</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <DollarSign className="h-4 w-4 text-yellow-400 mb-1" />
          <p className="text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </div>
      </div>

      {/* Webinar Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Webinar" : "Create Webinar"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
              <div><Label>Webinar Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., AI for Business Leaders" /></div>
              <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe what attendees will learn..." /></div>
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date *</Label><Input type="date" value={webinarDate} onChange={(e) => setWebinarDate(e.target.value)} required /></div>
                <div><Label>Time *</Label><Input type="time" value={webinarTime} onChange={(e) => setWebinarTime(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration (minutes) *</Label><Input type="number" min="15" max="480" value={duration} onChange={(e) => setDuration(e.target.value)} required /></div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                <Label>Recurring Webinar</Label>
                {isRecurring && (
                  <Select value={recurringPattern} onValueChange={setRecurringPattern}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Meeting Link */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Meeting Link</h3>
              <div><Label>Webinar Link (Zoom / Google Meet) *</Label><Input type="url" placeholder="https://zoom.us/j/..." value={webinarLink} onChange={(e) => setWebinarLink(e.target.value)} required /></div>
            </div>

            {/* Monetization */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Monetization</h3>
              <div className="flex items-center gap-3">
                <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                <Label>Paid Webinar</Label>
              </div>
              {isPaid && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price (USD)</Label><Input type="number" min="0" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} /></div>
                  <div><Label>Price (INR)</Label><Input type="number" min="0" step="1" value={priceInr} onChange={(e) => setPriceInr(e.target.value)} /></div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Settings</h3>
              <div><Label>Max Attendees (optional)</Label><Input type="number" min="1" placeholder="Unlimited" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3"><Switch checked={registrationRequired} onCheckedChange={setRegistrationRequired} /><Label>Registration Required</Label></div>
                <div className="flex items-center gap-3"><Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} /><Label>Waiting Room</Label></div>
                <div className="flex items-center gap-3"><Switch checked={autoRecord} onCheckedChange={setAutoRecord} /><Label>Auto Record</Label></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create Webinar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!showAnalytics} onOpenChange={(o) => { if (!o) setShowAnalytics(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Webinar Analytics</DialogTitle>
          </DialogHeader>
          {analyticsData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-xl font-bold text-foreground">{analyticsData.totalRegs}</p><p className="text-xs text-muted-foreground">Registrations</p></div>
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-xl font-bold text-foreground">{analyticsData.attended}</p><p className="text-xs text-muted-foreground">Attended</p></div>
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-xl font-bold text-foreground">{analyticsData.attendanceRate}%</p><p className="text-xs text-muted-foreground">Attendance Rate</p></div>
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-xl font-bold text-foreground">{analyticsData.avgWatchTime} min</p><p className="text-xs text-muted-foreground">Avg Watch Time</p></div>
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-xl font-bold text-foreground">{analyticsData.converted}</p><p className="text-xs text-muted-foreground">Converted</p></div>
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-xl font-bold text-foreground">{analyticsData.conversionRate}%</p><p className="text-xs text-muted-foreground">Conversion Rate</p></div>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <DollarSign className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">₹{analyticsData.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Revenue Generated</p>
              </div>
              {/* Conversion Funnel */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Conversion Funnel</p>
                {[
                  { label: "Registered", value: analyticsData.totalRegs, pct: 100 },
                  { label: "Attended", value: analyticsData.attended, pct: analyticsData.attendanceRate },
                  { label: "Converted", value: analyticsData.converted, pct: analyticsData.conversionRate },
                ].map((step, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{step.label}</span>
                      <span>{step.value} ({step.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registrants Dialog */}
      <Dialog open={!!showRegistrants} onOpenChange={(o) => { if (!o) setShowRegistrants(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Registered Learners ({registrants.length})</DialogTitle>
              {registrants.length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadCSV} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
              )}
            </div>
          </DialogHeader>
          {registrants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No registrations yet</p>
          ) : (
            <div className="rounded-xl border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrants.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-foreground font-medium whitespace-nowrap">{r.profiles?.full_name || r.registrant_name || "Unknown"}</TableCell>
                      {hasAccess(r.learner_id) ? (
                        <>
                          <TableCell className="text-foreground whitespace-nowrap">{r.profiles?.email || r.registrant_email || "—"}</TableCell>
                          <TableCell className="text-foreground whitespace-nowrap">{r.profiles?.contact_number || r.registrant_phone || "—"}</TableCell>
                          <TableCell className="text-foreground whitespace-nowrap">{r.profiles?.whatsapp_number || "—"}</TableCell>
                        </>
                      ) : (
                        <TableCell colSpan={3} className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Hidden</span>
                            {isPending(r.learner_id) ? (
                              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 text-xs">Pending</Badge>
                            ) : (
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-6" onClick={() => handleRequestWebinarAccess(r.learner_id)}>
                                <KeyRound className="h-3 w-3" /> Request
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground">{r.profiles?.country || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.profiles?.city || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.profiles?.industry || "—"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{r.profiles?.current_job_title || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.attended && <Badge variant="outline" className="text-green-400 border-green-500/30 text-[10px]">Attended</Badge>}
                          {r.converted && <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Converted</Badge>}
                          {!r.attended && !r.converted && <span className="text-xs text-muted-foreground">Registered</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{r.amount_paid ? `₹${r.amount_paid}` : "Free"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{format(new Date(r.registered_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Webinar Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        {["upcoming", "past"].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {(tab === "upcoming" ? upcoming : past).length === 0 ? (
              <div className="text-center py-16">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No {tab} webinars</h3>
                <p className="text-sm text-muted-foreground">{tab === "upcoming" ? "Create your first webinar" : "Your completed webinars will appear here"}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(tab === "upcoming" ? upcoming : past).map((w) => (
                  <div key={w.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${tab === "past" ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
                          {tab === "past" ? "Past" : "Upcoming"}
                        </span>
                        {w.is_paid && <span className="rounded-full px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400">Paid</span>}
                        {w.is_recurring && <span className="rounded-full px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400">Recurring</span>}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        w.webinar_link_status === "approved" ? "bg-green-500/20 text-green-400" :
                        w.webinar_link_status === "rejected" ? "bg-destructive/20 text-destructive" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        Link: {w.webinar_link_status === "approved" ? "✓" : w.webinar_link_status === "rejected" ? "✗" : "⏳"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{w.title}</h3>
                    {w.description && <p className="text-xs text-muted-foreground line-clamp-2">{w.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(w.webinar_date), "MMM d, yyyy")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{w.webinar_time.slice(0, 5)}</span>
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{w.timezone?.split("/")[1] || w.timezone}</span>
                    </div>
                    {w.is_paid && (
                      <div className="flex gap-2 text-xs">
                        <span className="text-yellow-400">₹{w.price_inr}</span>
                        <span className="text-muted-foreground">/ ${w.price_usd}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button onClick={() => viewRegistrants(w.id)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Users className="h-3.5 w-3.5" /> {regCounts[w.id] || 0}
                        {w.max_attendees && <span className="text-muted-foreground">/ {w.max_attendees}</span>}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={() => viewAnalytics(w.id)} className="rounded p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10" title="Analytics">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(w)} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteWebinar(w.id)} className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CoachWebinars;
