import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, Trash2, Mail, MessageCircle, Bell, Sparkles, Activity, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Auto {
  id: string;
  name: string;
  trigger_type: string;
  channel: string;
  message_template: string;
  delay_hours: number;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
}

const TRIGGERS = [
  { key: "missed_session", label: "Missed Session" },
  { key: "inactive_client", label: "Inactive Client (no activity 14d)" },
  { key: "renewal_due", label: "Renewal Due" },
  { key: "lead_followup", label: "Lead Follow-up" },
  { key: "weekly_reflection", label: "Weekly Reflection Prompt" },
  { key: "homework_reminder", label: "Homework Reminder" },
];
const CHANNELS = ["email", "whatsapp", "in_app"];

const CHANNEL_META: Record<string, { icon: any; color: string; chip: string }> = {
  email: { icon: Mail, color: "text-blue-400", chip: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  whatsapp: { icon: MessageCircle, color: "text-emerald-400", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  in_app: { icon: Bell, color: "text-purple-400", chip: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
};

const TEMPLATES: Record<string, string> = {
  missed_session: "Hi {name}, we missed you at our session today. Let's reschedule — reply with a time that works.",
  inactive_client: "Hi {name}, it's been a while! Want to jump on a quick check-in call this week?",
  renewal_due: "Hi {name}, your coaching package is up for renewal. Let's chat about your next chapter.",
  lead_followup: "Hi {name}, thanks for your interest. Want to book a free 15-min discovery call?",
  weekly_reflection: "Hi {name}, take 5 mins to reflect: What went well this week? What's your focus next week?",
  homework_reminder: "Hi {name}, friendly reminder to complete this week's homework before our next session.",
};

export default function CoachAutomations() {
  const { user } = useAuth();
  const [autos, setAutos] = useState<Auto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Auto | null>(null);
  const [form, setForm] = useState({ name: "", trigger_type: "missed_session", channel: "email", message_template: "", delay_hours: 24, is_active: true });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("coach_automations").select("*").eq("coach_id", user.id).order("created_at", { ascending: false });
    setAutos((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", trigger_type: "missed_session", channel: "email", message_template: TEMPLATES.missed_session, delay_hours: 24, is_active: true }); setOpen(true); };
  const openEdit = (a: Auto) => { setEditing(a); setForm({ name: a.name, trigger_type: a.trigger_type, channel: a.channel, message_template: a.message_template, delay_hours: a.delay_hours, is_active: a.is_active }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim() || !form.message_template.trim()) { toast.error("Name and message required"); return; }
    const payload = { ...form, coach_id: user.id, delay_hours: Number(form.delay_hours) };
    const { error } = editing
      ? await supabase.from("coach_automations").update(payload).eq("id", editing.id)
      : await supabase.from("coach_automations").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setOpen(false); load();
  };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("coach_automations").delete().eq("id", id); load(); };
  const toggle = async (a: Auto) => { await supabase.from("coach_automations").update({ is_active: !a.is_active }).eq("id", a.id); load(); };

  const stats = useMemo(() => {
    const total = autos.length;
    const active = autos.filter(a => a.is_active).length;
    const triggered = autos.reduce((s, a) => s + (a.trigger_count || 0), 0);
    return { total, active, triggered };
  }, [autos]);

  const statCards = [
    { label: "Total Workflows", value: stats.total, icon: Zap, accent: "from-primary/20 to-transparent", iconColor: "text-primary" },
    { label: "Active", value: stats.active, icon: Activity, accent: "from-emerald-500/20 to-transparent", iconColor: "text-emerald-400" },
    { label: "Total Triggers", value: stats.triggered, icon: Sparkles, accent: "from-purple-500/20 to-transparent", iconColor: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/30">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Automation Center</h2>
              <p className="text-sm text-muted-foreground">Set-and-forget workflows for reminders, follow-ups, and engagement</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New Automation</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
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

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : autos.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_60%)] pointer-events-none" />
          <Zap className="relative h-10 w-10 mx-auto text-primary mb-3" />
          <p className="relative text-foreground font-semibold">No automations yet</p>
          <p className="relative text-sm text-muted-foreground mt-1">Create your first workflow to engage clients on autopilot.</p>
          <Button onClick={openNew} className="relative mt-4 gap-2"><Plus className="h-4 w-4" /> Create Automation</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {autos.map((a) => {
            const ch = CHANNEL_META[a.channel] || CHANNEL_META.email;
            const ChIcon = ch.icon;
            const triggerLabel = TRIGGERS.find(t => t.key === a.trigger_type)?.label || a.trigger_type;
            return (
              <div key={a.id} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`rounded-lg bg-background/60 border border-border p-2.5 ${ch.color}`}>
                      <ChIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{a.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border border-border bg-background/40 rounded-full px-2 py-0.5">{triggerLabel}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border ${ch.chip}`}>{a.channel}</span>
                      </div>
                    </div>
                  </div>
                  <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
                </div>

                <div className="rounded-lg bg-background/40 border border-border px-3 py-2.5 mb-3">
                  <p className="text-xs text-muted-foreground italic line-clamp-2">"{a.message_template}"</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Delay: <span className="text-foreground font-semibold">{a.delay_hours}h</span></span>
                    <span>•</span>
                    <span>Fired: <span className="text-foreground font-semibold tabular-nums">{a.trigger_count}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Automation" : "New Automation"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Trigger</Label>
                <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v, message_template: TEMPLATES[v] || form.message_template })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Delay (hours)</Label><Input type="number" value={form.delay_hours} onChange={(e) => setForm({ ...form, delay_hours: Number(e.target.value) })} /></div>
            <div><Label>Message Template *</Label><Textarea rows={4} value={form.message_template} onChange={(e) => setForm({ ...form, message_template: e.target.value })} placeholder="Use {name} for client name" /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
