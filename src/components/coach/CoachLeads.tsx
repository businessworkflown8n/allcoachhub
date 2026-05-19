import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, TrendingUp, Mail, Phone, ArrowRight, Trash2, Upload, Target,
  CheckCircle2, IndianRupee, Sparkles,
} from "lucide-react";
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
  { key: "new",            label: "New",           accent: "from-blue-500/30 to-blue-500/0",     dot: "bg-blue-400",    text: "text-blue-300",    ring: "ring-blue-500/30" },
  { key: "contacted",      label: "Contacted",     accent: "from-purple-500/30 to-purple-500/0", dot: "bg-purple-400",  text: "text-purple-300",  ring: "ring-purple-500/30" },
  { key: "call_booked",    label: "Call Booked",   accent: "from-amber-500/30 to-amber-500/0",   dot: "bg-amber-400",   text: "text-amber-300",   ring: "ring-amber-500/30" },
  { key: "proposal_sent",  label: "Proposal Sent", accent: "from-orange-500/30 to-orange-500/0", dot: "bg-orange-400",  text: "text-orange-300",  ring: "ring-orange-500/30" },
  { key: "converted",      label: "Converted",     accent: "from-emerald-500/30 to-emerald-500/0", dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-500/30" },
  { key: "lost",           label: "Lost",          accent: "from-rose-500/30 to-rose-500/0",     dot: "bg-rose-400",    text: "text-rose-300",    ring: "ring-rose-500/30" },
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

  const stats = useMemo(() => {
    const open = leads.filter((l) => !["converted", "lost"].includes(l.stage));
    const totalValue = open.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
    const converted = leads.filter((l) => l.stage === "converted").length;
    const conv = leads.length ? Math.round((converted / leads.length) * 100) : 0;
    return { total: leads.length, open: open.length, totalValue, converted, conv };
  }, [leads]);

  const statCards = [
    { label: "Total Leads", value: stats.total, icon: Target, accent: "text-primary" },
    { label: "Open Pipeline", value: stats.open, icon: TrendingUp, accent: "text-blue-400" },
    { label: "Pipeline Value", value: `₹${stats.totalValue.toLocaleString()}`, icon: IndianRupee, accent: "text-primary" },
    { label: "Conversion", value: `${stats.conv}%`, icon: CheckCircle2, accent: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary icon-glow" /> Lead Pipeline
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Track every lead from first touch to converted client.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button onClick={() => setCsvOpen(true)} className="cta-3d secondary sm">
            <Upload className="h-4 w-4" /> Import / Export
          </button>
          <button onClick={openNew} className="cta-3d primary sm">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      {user && <LeadsCSVDialog open={csvOpen} onOpenChange={setCsvOpen} coachId={user.id} leads={leads} onImported={load} />}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card-premium p-4 hover-lift">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums truncate">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/60 ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-card/50 animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="card-premium relative overflow-hidden text-center py-20 px-6">
          <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(circle at 50% 30%, hsl(72 100% 50% / 0.08), transparent 60%)" }} />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-8 w-8 text-primary icon-glow" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Start your sales pipeline</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Capture leads from your website, ads, or import a CSV. Move them through stages and convert into paying clients.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={openNew} className="cta-3d primary sm"><Plus className="h-4 w-4" /> Add Your First Lead</button>
              <button onClick={() => setCsvOpen(true)} className="cta-3d secondary sm"><Upload className="h-4 w-4" /> Import CSV</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid gap-3 min-w-[1100px] grid-cols-6">
            {STAGES.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage === stage.key);
              const stageValue = stageLeads.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
              return (
                <div key={stage.key} className="card-premium overflow-hidden flex flex-col min-h-[260px]">
                  {/* Stage header w/ gradient accent */}
                  <div className={`relative px-3 py-2.5 border-b border-border/40 bg-gradient-to-b ${stage.accent}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${stage.dot} shadow-[0_0_6px_currentColor]`} />
                        <span className={`text-xs font-semibold ${stage.text}`}>{stage.label}</span>
                      </div>
                      <span className={`tabular-nums rounded-md bg-background/60 px-1.5 py-0.5 text-[10px] font-medium ring-1 ${stage.ring} ${stage.text}`}>
                        {stageLeads.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <div className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                        ₹{stageValue.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => openEdit(lead)}
                        className="group rounded-xl border border-border/40 bg-secondary/30 p-2.5 cursor-pointer transition-all hover:bg-secondary/60 hover:border-primary/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-2">
                          <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {lead.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-xs text-foreground truncate">{lead.full_name}</div>
                            {lead.email && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate mt-0.5">
                                <Mail className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                                <Phone className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{lead.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {(lead.estimated_value > 0 || lead.next_action) && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            {lead.estimated_value > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/20">
                                ₹{Number(lead.estimated_value).toLocaleString()}
                              </span>
                            )}
                            {lead.source && (
                              <span className="rounded-md bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize ring-1 ring-border/40">
                                {lead.source}
                              </span>
                            )}
                          </div>
                        )}

                        {lead.next_action && (
                          <div className="mt-1.5 text-[10px] text-muted-foreground truncate italic">→ {lead.next_action}</div>
                        )}

                        <div className="flex items-center justify-between mt-2 gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStage(lead, 1); }}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                          >
                            Next <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); remove(lead.id); }}
                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border/40">
                        <p className="text-[10px] text-muted-foreground/60">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="card-premium border-border/40">
          <DialogHeader><DialogTitle className="text-lg">{editing ? "Edit Lead" : "Add Lead"}</DialogTitle></DialogHeader>
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
                    {["website", "referral", "ads", "organic", "manual"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
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
            <button onClick={save} className="cta-3d primary sm">{editing ? "Save Changes" : "Add Lead"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
