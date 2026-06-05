import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Eye, Pencil, Search } from "lucide-react";

const STATUSES = ["NEW", "CONTACTED", "ENROLLED", "REJECTED"];

const statusColor = (s: string) =>
  s === "ENROLLED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
    : s === "CONTACTED" ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
    : s === "REJECTED" ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
    : "bg-sky-500/20 text-sky-400 border-sky-500/40";

const CoachAIKidsLeads = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any).from("ai_kids_enrollments").select("*").eq("assigned_coach_id", user.id).order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.lead_status !== status) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.reference_id, r.student_name, r.parent_name, r.email].some((v) => (v || "").toString().toLowerCase().includes(s));
  }), [rows, q, status]);

  const updateRow = async (id: string, patch: any) => {
    const { error } = await (supabase as any).from("ai_kids_enrollments").update(patch).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Kids Leads</h2>
        <p className="text-sm text-muted-foreground">Enrollment leads assigned to you.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>{["Ref", "Student", "Class", "Parent", "Mobile", "Email", "Course", "Status", "Enrolled", "Actions"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No leads assigned yet.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs text-primary">{r.reference_id}</td>
                  <td className="px-3 py-2 font-medium">{r.student_name}</td>
                  <td className="px-3 py-2">{r.student_class}</td>
                  <td className="px-3 py-2">{r.parent_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.mobile_country_code} {r.mobile_number}</td>
                  <td className="px-3 py-2">{r.email}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate">{r.interested_course}</td>
                  <td className="px-3 py-2">
                    <Select value={r.lead_status} onValueChange={(v) => updateRow(r.id, { lead_status: v, last_contacted_date: v === "CONTACTED" ? new Date().toISOString() : r.last_contacted_date })}>
                      <SelectTrigger className={`h-8 w-32 border ${statusColor(r.lead_status)}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(r)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Lead {viewing?.reference_id}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ["Student Name", viewing.student_name], ["Class", viewing.student_class],
                ["School", viewing.school_name], ["City", viewing.city],
                ["Parent", viewing.parent_name], ["Mobile", `${viewing.mobile_country_code} ${viewing.mobile_number}`],
                ["WhatsApp", `${viewing.whatsapp_country_code || ""} ${viewing.whatsapp_number || ""}`],
                ["Email", viewing.email], ["Course", viewing.interested_course],
                ["Status", viewing.lead_status], ["Created", new Date(viewing.created_at).toLocaleString()],
              ].map(([k, v]) => <div key={k as string}><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v as string}</div></div>)}
              {viewing.notes && <div className="sm:col-span-2"><div className="text-xs text-muted-foreground">Notes</div><div>{viewing.notes}</div></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Update {editing?.reference_id}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Status</label>
                <Select value={editing.lead_status} onValueChange={(v) => setEditing({ ...editing, lead_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Follow-up date</label>
                <Input type="datetime-local" value={editing.last_contacted_date ? new Date(editing.last_contacted_date).toISOString().slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, last_contacted_date: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
                <Textarea rows={5} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={async () => { await updateRow(editing.id, { lead_status: editing.lead_status, last_contacted_date: editing.last_contacted_date, notes: editing.notes }); setEditing(null); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoachAIKidsLeads;
