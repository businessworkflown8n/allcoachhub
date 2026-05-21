import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, Search, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

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
  full_name: string;
  email: string;
  course_title: string;
  enrolled_at: string;
}

const STATUSES = ["active", "paused", "churned", "prospect"];

export default function CoachClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [enrolled, setEnrolled] = useState<EnrolledLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", status: "active", goals: "", notes: "" });

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
      full_name: e.profiles?.full_name || "Learner",
      email: e.profiles?.email || "",
      course_title: e.courses?.title || "",
      enrolled_at: e.enrolled_at,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Users className="h-5 w-5" /> Client CRM</h2>
          <p className="text-sm text-muted-foreground">Unified view of manual clients and enrolled learners</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Client</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">My Clients ({filtered.length})</TabsTrigger>
          <TabsTrigger value="enrolled">Enrolled Learners ({filteredEnrolled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No clients yet. Add your first 1:1 client.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell>{c.health_score}%</TableCell>
                    <TableCell><Badge variant="outline">{c.source || "manual"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="mt-4">
          {filteredEnrolled.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl">
              <p className="text-muted-foreground">No enrolled learners yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrolled.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.full_name}</TableCell>
                    <TableCell className="text-xs">{e.email}</TableCell>
                    <TableCell className="text-xs">{e.course_title}</TableCell>
                    <TableCell className="text-xs">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => promoteEnrolled(e)}>Add to CRM</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
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
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Goals</Label><Textarea rows={2} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Add Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
