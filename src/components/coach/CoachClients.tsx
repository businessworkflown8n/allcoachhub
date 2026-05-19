import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContactAccess } from "@/hooks/useContactAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Users, Search, Mail, Phone, Lock, KeyRound, Heart, GraduationCap,
  Edit, Trash2, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

const maskName = (name?: string) =>
  !name ? "—" : name.split(" ").filter(Boolean).map((p) => p[0]?.toUpperCase() + "***").join(" ");

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  goals: string | null;
  notes: string | null;
  health_score: number;
  last_interaction_at: string | null;
  created_at: string;
}

interface EnrolledLearner {
  id: string;
  learner_id: string | null;
  full_name: string;
  email: string;
  course_title: string;
  enrolled_at: string;
}

const STATUSES = ["active", "paused", "churned", "prospect"];

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    paused: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30",
    churned: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    prospect: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  };
  return `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1 ${map[status] || "bg-secondary text-muted-foreground ring-border"}`;
};

const healthColor = (h: number) =>
  h >= 75 ? "text-emerald-400" : h >= 50 ? "text-yellow-400" : "text-rose-400";

export default function CoachClients() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasAccess, isPending, requestAccess } = useContactAccess();
  const [clients, setClients] = useState<Client[]>([]);
  const [enrolled, setEnrolled] = useState<EnrolledLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", status: "active", goals: "", notes: "" });

  const canSeeEnrolled = (e: EnrolledLearner) => isAdmin || (e.learner_id ? hasAccess(e.learner_id) : false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [clientsRes, enrollRes] = await Promise.all([
      supabase.from("coach_clients").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
      supabase.from("enrollments").select("id, learner_id, enrolled_at, courses(title), profiles!enrollments_learner_id_fkey(full_name, email)").eq("coach_id", user.id).order("enrolled_at", { ascending: false }).limit(100),
    ]);
    setClients((clientsRes.data || []) as any);
    setEnrolled(((enrollRes.data || []) as any[]).map((e) => ({
      id: e.id,
      learner_id: e.learner_id,
      full_name: e.profiles?.full_name || "Learner",
      email: e.profiles?.email || "",
      course_title: e.courses?.title || "",
      enrolled_at: e.enrolled_at,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleRequest = async (learnerId: string | null) => {
    if (!learnerId) return;
    const res = await requestAccess(learnerId, "learner");
    if (res?.error) toast.error(res.error.message);
    else toast.success("Access requested");
  };

  const openNew = () => {
    setEditing(null);
    setForm({ full_name: "", email: "", phone: "", status: "active", goals: "", notes: "" });
    setOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ full_name: c.full_name, email: c.email || "", phone: c.phone || "", status: c.status, goals: c.goals || "", notes: c.notes || "" });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.full_name.trim()) { toast.error("Name is required"); return; }
    const payload = { ...form, coach_id: user.id, source: editing?.source || "manual" };
    const { error } = editing
      ? await supabase.from("coach_clients").update(payload).eq("id", editing.id)
      : await supabase.from("coach_clients").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Client updated" : "Client added");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    const { error } = await supabase.from("coach_clients").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Client deleted");
    load();
  };

  const promoteEnrolled = async (e: EnrolledLearner) => {
    if (!user) return;
    const { error } = await supabase.from("coach_clients").insert({
      coach_id: user.id, full_name: e.full_name, email: e.email, status: "active", source: "enrollment",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Added to CRM");
    load();
  };

  const filtered = clients.filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase()));
  const filteredEnrolled = enrolled.filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === "active").length;
    const avgHealth = clients.length ? Math.round(clients.reduce((s, c) => s + (c.health_score || 0), 0) / clients.length) : 0;
    return { total: clients.length, active, learners: enrolled.length, avgHealth };
  }, [clients, enrolled]);

  const statCards = [
    { label: "Total Clients", value: stats.total, icon: Users, accent: "text-primary" },
    { label: "Active", value: stats.active, icon: Heart, accent: "text-emerald-400" },
    { label: "Enrolled Learners", value: stats.learners, icon: GraduationCap, accent: "text-primary" },
    { label: "Avg Health", value: `${stats.avgHealth}%`, icon: Heart, accent: healthColor(stats.avgHealth) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary icon-glow" /> Client CRM
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Unified view of manual clients and enrolled learners.</p>
        </div>
        <button onClick={openNew} className="cta-3d primary sm self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Client
        </button>
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

      {/* Search */}
      <div className="card-premium p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10 bg-secondary/50 border-border/40 focus-visible:ring-primary/30"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="bg-secondary/40 border border-border/40 p-1 h-auto">
          <TabsTrigger value="manual" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:nav-active-glow rounded-lg px-4 py-1.5 text-xs font-medium">
            My Clients
            <span className="ml-2 tabular-nums rounded-md bg-background/60 px-1.5 py-0.5 text-[10px]">{filtered.length}</span>
          </TabsTrigger>
          <TabsTrigger value="enrolled" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:nav-active-glow rounded-lg px-4 py-1.5 text-xs font-medium">
            Enrolled Learners
            <span className="ml-2 tabular-nums rounded-md bg-background/60 px-1.5 py-0.5 text-[10px]">{filteredEnrolled.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          {loading ? (
            <div className="card-premium h-48 animate-pulse" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first 1:1 client to start tracking goals, notes, and health."
              cta={<button onClick={openNew} className="cta-3d primary sm"><Plus className="h-4 w-4" /> Add Client</button>}
            />
          ) : (
            <div className="card-premium overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-premium">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/30 border-b border-border/40">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Health</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {c.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-medium text-sm text-foreground">{c.full_name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs space-y-0.5 text-muted-foreground">
                            {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</div>}
                            {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className={statusPill(c.status)}>{c.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-secondary/60 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${c.health_score >= 75 ? "bg-emerald-400" : c.health_score >= 50 ? "bg-yellow-400" : "bg-rose-400"}`}
                                style={{ width: `${Math.max(0, Math.min(100, c.health_score))}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold tabular-nums ${healthColor(c.health_score)}`}>{c.health_score}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] capitalize border-border/60">{c.source || "manual"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors" aria-label="Edit">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrolled">
          {filteredEnrolled.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No enrolled learners yet" description="Learners who enroll in your courses will appear here." />
          ) : (
            <div className="card-premium overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-premium">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/30 border-b border-border/40">
                      <th className="px-4 py-3">Learner</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Enrolled</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrolled.map((e) => {
                      const ok = canSeeEnrolled(e);
                      return (
                        <tr key={e.id} className="border-b border-border/30 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {(ok ? e.full_name : "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm text-foreground">{ok ? e.full_name : maskName(e.full_name)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {ok ? e.email : (
                              <div className="flex items-center gap-1.5">
                                <Lock className="h-3 w-3" />
                                <span>Hidden</span>
                                {e.learner_id && (isPending(e.learner_id) ? (
                                  <Badge variant="outline" className="text-yellow-300 border-yellow-500/30 bg-yellow-500/10 text-[10px]">Pending</Badge>
                                ) : (
                                  <Button size="sm" variant="outline" className="gap-1 text-xs h-6" onClick={() => handleRequest(e.learner_id)}>
                                    <KeyRound className="h-3 w-3" /> Request
                                  </Button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground/80">{e.course_title}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{new Date(e.enrolled_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" disabled={!ok} onClick={() => promoteEnrolled(e)} className="gap-1 h-7 text-xs">
                              <UserPlus className="h-3 w-3" /> Add to CRM
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="card-premium border-border/40">
          <DialogHeader><DialogTitle className="text-lg">{editing ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Goals</Label><Textarea rows={2} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <button onClick={save} className="cta-3d primary sm">{editing ? "Save Changes" : "Add Client"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EmptyState = ({ icon: Icon, title, description, cta }: any) => (
  <div className="card-premium relative overflow-hidden text-center py-16 px-6">
    <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(circle at 50% 30%, hsl(72 100% 50% / 0.08), transparent 60%)" }} />
    <div className="relative">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Icon className="h-7 w-7 text-primary icon-glow" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      {cta && <div className="mt-5 inline-flex">{cta}</div>}
    </div>
  </div>
);
