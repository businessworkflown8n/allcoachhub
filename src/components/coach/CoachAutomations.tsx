import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, Trash2 } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Zap className="h-5 w-5" /> Automation Center</h2>
          <p className="text-sm text-muted-foreground">Auto-send reminders, follow-ups, and reflection prompts</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Automation</Button>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : autos.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl"><Zap className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">No automations yet.</p></div>
      ) : (
        <div className="space-y-3">
          {autos.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-foreground">{a.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{TRIGGERS.find((t) => t.key === a.trigger_type)?.label || a.trigger_type}</Badge>
                    <Badge variant="secondary" className="text-xs">{a.channel}</Badge>
                    <span className="text-xs text-muted-foreground">Delay: {a.delay_hours}h</span>
                    <span className="text-xs text-muted-foreground">Sent: {a.trigger_count}</span>
                  </div>
                </div>
                <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
              </div>
              <p className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">{a.message_template}</p>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3" /></Button></div>
            </div>
          ))}
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
