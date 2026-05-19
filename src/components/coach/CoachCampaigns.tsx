import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Mail, Send, Plus, Pencil, Trash2, Eye, Clock, MessageCircle, Phone,
  Megaphone, Instagram, Facebook, Linkedin, Twitter, Youtube, Globe, UserCheck,
  Search, Sparkles, CheckCircle2
} from "lucide-react";

type Campaign = {
  id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  content: string;
  cta_text: string | null;
  cta_link: string | null;
  audience_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  created_at: string;
  channel: string;
  coach_id: string | null;
};

const CAMPAIGN_PLATFORMS = [
  { value: "email", label: "Email", icon: Mail, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  { value: "sms", label: "SMS", icon: Phone, color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/30" },
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/30" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-500", bg: "bg-blue-600/15", border: "border-blue-600/30" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-400", bg: "bg-blue-700/15", border: "border-blue-700/30" },
  { value: "twitter", label: "Twitter / X", icon: Twitter, color: "text-foreground", bg: "bg-muted/40", border: "border-border" },
  { value: "youtube", label: "YouTube", icon: Youtube, color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30" },
  { value: "push", label: "Push", icon: Megaphone, color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
  { value: "web", label: "Website", icon: Globe, color: "text-teal-400", bg: "bg-teal-500/15", border: "border-teal-500/30" },
];

const emptyForm = {
  subject: "",
  sender_name: "",
  sender_email: "",
  content: "",
  cta_text: "",
  cta_link: "/courses",
  audience_type: "my_learners",
  scheduled_at: "",
  channel: "email",
};

const STATUS_CHIP: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ready: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  draft: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  scheduled: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

const CoachCampaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "assigned" | "sent">("all");
  const [search, setSearch] = useState("");

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [campRes, profRes] = await Promise.all([
      supabase.from("email_campaigns").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, email").eq("user_id", user.id).single(),
    ]);
    if (campRes.data) setCampaigns(campRes.data as unknown as Campaign[]);
    if (profRes.data) setProfile(profRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const openCreate = (channel = "email") => {
    setEditing(null);
    setForm({ ...emptyForm, channel, sender_name: profile?.full_name || "", sender_email: profile?.email || "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c.id);
    setForm({
      subject: c.subject,
      sender_name: c.sender_name || "",
      sender_email: c.sender_email || "",
      content: c.content,
      cta_text: c.cta_text || "",
      cta_link: c.cta_link || "/courses",
      audience_type: c.audience_type,
      scheduled_at: c.scheduled_at?.slice(0, 16) || "",
      channel: c.channel || "email",
    });
    setDialogOpen(true);
  };

  const saveCampaign = async (status: string) => {
    if (!user) return;
    if (!form.content.trim()) { toast.error("Content is required"); return; }
    const payload: any = {
      subject: form.subject.trim() || `${form.channel.toUpperCase()} Campaign`,
      sender_name: form.sender_name,
      sender_email: form.sender_email,
      content: form.content,
      cta_text: form.cta_text || null,
      cta_link: form.cta_link || null,
      audience_type: form.audience_type,
      status,
      channel: form.channel,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      updated_at: new Date().toISOString(),
      coach_id: user.id,
    };
    if (editing) {
      const { error } = await supabase.from("email_campaigns").update(payload).eq("id", editing);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Campaign updated");
    } else {
      const { error } = await supabase.from("email_campaigns").insert(payload);
      if (error) { toast.error("Failed to create: " + error.message); return; }
      toast.success(status === "draft" ? "Draft saved" : "Campaign created");
    }
    setDialogOpen(false);
    fetchAll();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await supabase.from("email_campaigns").delete().eq("id", id);
    toast.success("Campaign deleted");
    fetchAll();
  };

  const sendCampaign = async (campaign: Campaign) => {
    if (!user) return;
    const ch = campaign.channel || "email";
    if (ch === "email") {
      if (!confirm(`Send "${campaign.subject}" to your learners?`)) return;
      setSending(true);
      try {
        const { data: enrollments } = await supabase.from("enrollments").select("email, full_name").eq("coach_id", user.id);
        const recipients = enrollments?.map((e: any) => ({ email: e.email, name: e.full_name })).filter((r: any) => r.email) || [];
        if (!recipients.length) { toast.error("No enrolled learners found"); setSending(false); return; }
        const uniqueRecipients = Array.from(new Map(recipients.map((r: any) => [r.email, r])).values());
        toast.info(`Sending to ${uniqueRecipients.length} learners...`);
        const { data, error } = await supabase.functions.invoke("send-campaign-emails", { body: { campaignId: campaign.id, recipients: uniqueRecipients } });
        if (error) toast.error("Failed: " + error.message);
        else toast.success(`Sent ${data.sent}/${data.total} emails`);
      } catch (e: any) { toast.error(e.message); }
      setSending(false);
    } else {
      await supabase.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaign.id);
      toast.success(`${ch} campaign marked as sent. Use the platform's native tools to publish.`);
    }
    fetchAll();
  };

  const getPlatformInfo = (channel: string) => CAMPAIGN_PLATFORMS.find(p => p.value === channel) || CAMPAIGN_PLATFORMS[0];

  const assignedCampaigns = campaigns.filter(c => c.status === "draft");
  const myCampaigns = campaigns.filter(c => c.status !== "draft");

  const stats = useMemo(() => {
    const sent = campaigns.filter(c => c.status === "sent").length;
    const ready = campaigns.filter(c => c.status === "ready").length;
    const totalRecipients = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
    return { total: campaigns.length, sent, ready, totalRecipients };
  }, [campaigns]);

  const statCards = [
    { label: "Total Campaigns", value: stats.total, icon: Megaphone, accent: "from-primary/20 to-transparent", color: "text-primary" },
    { label: "Sent", value: stats.sent, icon: CheckCircle2, accent: "from-emerald-500/20 to-transparent", color: "text-emerald-400" },
    { label: "Drafts / Assigned", value: assignedCampaigns.length, icon: UserCheck, accent: "from-yellow-500/20 to-transparent", color: "text-yellow-400" },
    { label: "Total Reach", value: stats.totalRecipients, icon: Send, accent: "from-blue-500/20 to-transparent", color: "text-blue-400" },
  ];

  const filtered = (activeTab === "assigned" ? assignedCampaigns : activeTab === "sent" ? myCampaigns : campaigns)
    .filter(c => !search || c.subject.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/30">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Marketing Campaigns</h2>
              <p className="text-sm text-muted-foreground">Reach your audience across every channel — email, social, WhatsApp & more</p>
            </div>
          </div>
          <Button onClick={() => openCreate()} className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> Create Campaign</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-50 pointer-events-none`} />
              <div className="relative">
                <Icon className={`h-5 w-5 ${s.color} mb-2`} />
                <p className="text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform Launcher */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Launch on any platform</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {CAMPAIGN_PLATFORMS.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.value}
                onClick={() => openCreate(p.value)}
                className={`group relative overflow-hidden rounded-xl border ${p.border} ${p.bg} px-3 py-3 flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <Icon className={`h-4 w-4 ${p.color}`} />
                <span className="text-xs font-semibold text-foreground">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..." className="pl-9 bg-background/40 border-border" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all", label: "All", count: campaigns.length },
            { key: "assigned", label: "Drafts / Assigned", count: assignedCampaigns.length },
            { key: "sent", label: "Sent / Ready", count: myCampaigns.length },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => setActiveTab(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                activeTab === p.key
                  ? "bg-primary/15 text-primary border-primary/40 shadow-sm shadow-primary/10"
                  : "bg-background/40 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {p.label} <span className="ml-1 opacity-60">{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Cards */}
      {filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_60%)] pointer-events-none" />
          <Megaphone className="relative h-10 w-10 mx-auto text-primary mb-3" />
          <p className="relative text-foreground font-semibold">No campaigns found</p>
          <p className="relative text-sm text-muted-foreground mt-1">Launch your first campaign to start reaching your audience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(c => {
            const platform = getPlatformInfo(c.channel);
            const PIcon = platform.icon;
            const statusChip = STATUS_CHIP[c.status] || STATUS_CHIP.draft;
            return (
              <div key={c.id} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`rounded-lg ${platform.bg} border ${platform.border} p-2.5`}>
                      <PIcon className={`h-4 w-4 ${platform.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{c.subject}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border ${statusChip}`}>{c.status}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border border-border bg-background/40 rounded-full px-2 py-0.5">{platform.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.content}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Delivered</div>
                    <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{c.total_sent || 0} / {c.total_recipients || 0}</p>
                  </div>
                  <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Created</div>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{format(new Date(c.created_at), "dd MMM")}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setPreviewContent(c.content); setPreviewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteCampaign(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  {c.status !== "sent" && (
                    <Button size="sm" className="h-8 gap-1.5" onClick={() => sendCampaign(c)} disabled={sending}>
                      <Send className="h-3 w-3" /> Send
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => { const p = getPlatformInfo(form.channel); const I = p.icon; return <I className={`h-5 w-5 ${p.color}`} />; })()}
              {editing ? "Edit" : "Create"} Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Platform</Label>
              <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAMPAIGN_PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Campaign Title</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Campaign title..." /></div>
            {form.channel === "email" && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Sender Name</Label><Input value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })} /></div>
                <div><Label>Sender Email</Label><Input value={form.sender_email} onChange={e => setForm({ ...form, sender_email: e.target.value })} /></div>
              </div>
            )}
            <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Write your campaign message..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>CTA Text</Label><Input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} placeholder="e.g., Enroll Now" /></div>
              <div><Label>CTA Link</Label><Input value={form.cta_link} onChange={e => setForm({ ...form, cta_link: e.target.value })} /></div>
            </div>
            <div><Label>Schedule (optional)</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => saveCampaign("draft")}><Clock className="h-4 w-4 mr-2" /> Save Draft</Button>
              <Button onClick={() => saveCampaign("ready")}><Send className="h-4 w-4 mr-2" /> Save & Ready</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Campaign Preview</DialogTitle></DialogHeader>
          <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap text-sm max-h-[60vh] overflow-y-auto">{previewContent}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoachCampaigns;
