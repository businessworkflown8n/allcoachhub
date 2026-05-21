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
import { Plus, TrendingUp, Mail, Phone, ArrowRight, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import LeadsCSVDialog from "./LeadsCSVDialog";

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string | null;
  estimated_value: number;
  notes: string | null;
  next_action: string | null;
  next_action_at: string | null;
  created_at: string;
}

const STAGES = [
  { key: "new", label: "New", color: "bg-blue-500/10 text-blue-600" },
  { key: "contacted", label: "Contacted", color: "bg-purple-500/10 text-purple-600" },
  { key: "call_booked", label: "Call Booked", color: "bg-amber-500/10 text-amber-600" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-orange-500/10 text-orange-600" },
  { key: "converted", label: "Converted", color: "bg-emerald-500/10 text-emerald-600" },
  { key: "lost", label: "Lost", color: "bg-rose-500/10 text-rose-600" },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

export default function CoachLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", stage: "new", source: "manual", estimated_value: 0, notes: "", next_action: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("coach_leads").select("*").eq("coach_id", user.id).order("created_at", { ascending: false });
    setLeads((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ full_name: "", email: "", phone: "", stage: "new", source: "manual", estimated_value: 0, notes: "", next_action: "" });
    setOpen(true);
  };
  const openEdit = (l: Lead) => {
    setEditing(l);
    setForm({ full_name: l.full_name, email: l.email || "", phone: l.phone || "", stage: l.stage, source: l.source || "manual", estimated_value: Number(l.estimated_value || 0), notes: l.notes || "", next_action: l.next_action || "" });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.full_name.trim()) { toast.error("Name required"); return; }
    const payload = { ...form, coach_id: user.id, estimated_value: Number(form.estimated_value) };
    const { error } = editing
      ? await supabase.from("coach_leads").update(payload).eq("id", editing.id)
      : await supabase.from("coach_leads").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Lead updated" : "Lead added");
    setOpen(false); load();
  };

  const moveStage = async (lead: Lead, direction: 1 | -1) => {
    const idx = STAGE_ORDER.indexOf(lead.stage);
    const next = STAGE_ORDER[Math.max(0, Math.min(STAGE_ORDER.length - 1, idx + direction))];
    if (next === lead.stage) return;

    if (next === "converted" && user) {
      const { data: client } = await supabase.from("coach_clients").insert({
        coach_id: user.id, full_name: lead.full_name, email: lead.email, phone: lead.phone, status: "active", source: "lead",
      }).select("id").single();
      await supabase.from("coach_leads").update({ stage: next, converted_client_id: client?.id }).eq("id", lead.id);
      toast.success("Converted to client!");
    } else {
      await supabase.from("coach_leads").update({ stage: next }).eq("id", lead.id);
    }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await supabase.from("coach_leads").delete().eq("id", id);
    load();
  };

  const totalValue = leads.filter((l) => !["converted", "lost"].includes(l.stage)).reduce((s, l) => s + Number(l.estimated_value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Lead Pipeline</h2>
          <p className="text-sm text-muted-foreground">{leads.length} leads · ₹{totalValue.toLocaleString()} pipeline value</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4 mr-1" /> Import / Export</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Lead</Button>
        </div>
      </div>

      {user && <LeadsCSVDialog open={csvOpen} onOpenChange={setCsvOpen} coachId={user.id} leads={leads} onImported={load} />}

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage.key);
            return (
              <div key={stage.key} className="rounded-xl border border-border bg-card/50 p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-xs font-semibold px-2 py-1 rounded ${stage.color}`}>{stage.label}</div>
                  <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="rounded-lg border border-border bg-background p-3 hover:shadow-sm transition cursor-pointer" onClick={() => openEdit(lead)}>
                      <div className="font-medium text-sm">{lead.full_name}</div>
                      {lead.email && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Mail className="h-3 w-3" />{lead.email}</div>}
                      {lead.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{lead.phone}</div>}
                      {lead.estimated_value > 0 && <Badge variant="outline" className="mt-2 text-xs">₹{Number(lead.estimated_value).toLocaleString()}</Badge>}
                      <div className="flex items-center justify-between mt-2 gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); moveStage(lead, 1); }}>
                          Next <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); remove(lead.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Lead" : "Add Lead"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["website", "referral", "ads", "organic", "manual"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Estimated Value</Label><Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: Number(e.target.value) })} /></div>
            <div><Label>Next Action</Label><Input value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} placeholder="e.g. Send proposal" /></div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Add Lead"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
