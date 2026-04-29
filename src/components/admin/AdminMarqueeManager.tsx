import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Eye, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarqueeMessage {
  id: string;
  segment: string;
  message: string;
  is_active: boolean;
  text_color: string;
  bg_color: string;
  scroll_speed: number;
  sort_order: number;
  scheduled_at: string | null;
  expires_at: string | null;
  position: string;
}

const SEGMENTS = [
  { value: "website", label: "Main Website" },
  { value: "learner", label: "Learner Dashboard" },
  { value: "coach", label: "Coach Dashboard" },
];

const POSITIONS = [
  { value: "header", label: "Header (below menu)" },
  { value: "footer", label: "Footer" },
];

const defaultForm = {
  segment: "website",
  message: "",
  is_active: false,
  text_color: "#ffffff",
  bg_color: "#0B0F1A",
  scroll_speed: 50,
  sort_order: 0,
  scheduled_at: "",
  expires_at: "",
  position: "header",
};

const AdminMarqueeManager = () => {
  const [messages, setMessages] = useState<MarqueeMessage[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("website");

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("marquee_messages")
      .select("*")
      .order("sort_order");
    if (data) setMessages(data);
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleSave = async () => {
    if (!form.message.trim()) { toast.error("Message is required"); return; }
    setLoading(true);
    const payload = {
      segment: form.segment,
      message: form.message,
      is_active: form.is_active,
      text_color: form.text_color,
      bg_color: form.bg_color,
      scroll_speed: form.scroll_speed,
      sort_order: form.sort_order,
      scheduled_at: form.scheduled_at || null,
      expires_at: form.expires_at || null,
      position: form.position,
    };

    if (editingId) {
      const { error } = await supabase.from("marquee_messages").update(payload).eq("id", editingId);
      if (error) toast.error("Update failed"); else toast.success("Message updated");
    } else {
      const { error } = await supabase.from("marquee_messages").insert(payload);
      if (error) toast.error("Create failed"); else toast.success("Message created");
    }
    setForm(defaultForm);
    setEditingId(null);
    setLoading(false);
    fetchMessages();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("marquee_messages").delete().eq("id", id);
    toast.success("Deleted");
    fetchMessages();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("marquee_messages").update({ is_active: active }).eq("id", id);
    fetchMessages();
  };

  const startEdit = (m: MarqueeMessage) => {
    setEditingId(m.id);
    setForm({
      segment: m.segment,
      message: m.message,
      is_active: m.is_active,
      text_color: m.text_color,
      bg_color: m.bg_color,
      scroll_speed: m.scroll_speed,
      sort_order: m.sort_order,
      scheduled_at: m.scheduled_at || "",
      expires_at: m.expires_at || "",
      position: (m as any).position || "header",
    });
    setActiveTab(m.segment);
  };

  const filtered = messages.filter((m) => m.segment === activeTab);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Marquee / Announcement Manager</h2>
          <p className="text-sm text-muted-foreground">Create scrolling announcements for different segments</p>
        </div>
      </div>

      {/* Form */}
      <Card className="card-premium">
        <CardHeader><CardTitle className="text-base">{editingId ? "Edit Message" : "Create New Message"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Segment</label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Position</label>
              <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sort Order</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Message</label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Enter announcement text..." />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Text Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
                <Input value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Background Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
                <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Scroll Speed</label>
              <Input type="number" min={10} max={200} value={form.scroll_speed} onChange={(e) => setForm({ ...form, scroll_speed: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Schedule Start (optional)</label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Expires At (optional)</label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>

          {/* Live Preview */}
          {form.message && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Eye className="h-4 w-4" /> Live Preview</div>
              <div className="overflow-hidden rounded-lg border border-border" style={{ backgroundColor: form.bg_color }}>
                <div className="marquee-scroll whitespace-nowrap py-2 text-sm font-medium" style={{ color: form.text_color, animationDuration: `${Math.max(10, form.message.length * (100 / form.scroll_speed))}s` }}>
                  <span className="inline-block px-8">{form.message}</span>
                  <span className="inline-block px-8">{form.message}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading}>{editingId ? "Update" : "Create"}</Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(defaultForm); }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Messages by segment */}
      <Card className="card-premium">
        <CardHeader><CardTitle className="text-base">All Messages</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {SEGMENTS.map((s) => (
                <TabsTrigger key={s.value} value={s.value}>{s.label} ({messages.filter((m) => m.segment === s.value).length})</TabsTrigger>
              ))}
            </TabsList>
            {SEGMENTS.map((s) => (
              <TabsContent key={s.value} value={s.value} className="space-y-3 mt-4">
                {filtered.length === 0 && <p className="text-sm text-muted-foreground">No messages for this segment.</p>}
                {filtered.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.message}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: m.bg_color }} /> BG</span>
                        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: m.text_color }} /> Text</span>
                        <span>Speed: {m.scroll_speed}</span>
                        <span>Order: {m.sort_order}</span>
                        <span className="rounded-full border border-border px-2 py-0.5 capitalize">{(m as any).position || "header"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch checked={m.is_active} onCheckedChange={(v) => handleToggle(m.id, v)} />
                      <Button size="icon" variant="ghost" onClick={() => startEdit(m)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMarqueeManager;
