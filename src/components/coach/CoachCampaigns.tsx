import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Mail, Send, Plus, Pencil, Trash2, Eye, Clock, MessageCircle, Phone,
  Megaphone, Instagram, Facebook, Linkedin, Twitter, Youtube, Globe, UserCheck,
  ExternalLink, Copy, Eye as EyeIcon, EyeOff, Lock
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
  { value: "email", label: "Email", icon: Mail, color: "text-blue-500" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-500" },
  { value: "sms", label: "SMS", icon: Phone, color: "text-yellow-500" },
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
  { value: "twitter", label: "Twitter / X", icon: Twitter, color: "text-foreground" },
  { value: "youtube", label: "YouTube", icon: Youtube, color: "text-red-500" },
  { value: "push", label: "Push Notification", icon: Megaphone, color: "text-purple-500" },
  { value: "web", label: "Website Banner", icon: Globe, color: "text-teal-500" },
];

const AUDIENCE_TYPES = [
  { value: "my_learners", label: "My Enrolled Learners" },
  { value: "all_learners", label: "All Learners" },
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
  const [activeTab, setActiveTab] = useState("all");
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waAccess, setWaAccess] = useState(false);
  const [waCreds, setWaCreds] = useState<{ login_url: string; user_id: string; password: string } | null>(null);
  const [waShowPwd, setWaShowPwd] = useState(false);
  const [waRequesting, setWaRequesting] = useState(false);


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

  // Separate assigned (admin-created) vs self-created campaigns
  // Admin assigns by setting coach_id — we detect "assigned" by checking if sender_name is admin default or content differs
  // Simpler: all campaigns with coach_id = user.id are shown; we just show a badge if status is draft (freshly assigned)
  const assignedCampaigns = campaigns.filter(c => c.status === "draft");
  const myCampaigns = campaigns.filter(c => c.status !== "draft");

  const getFilteredCampaigns = () => {
    if (activeTab === "assigned") return assignedCampaigns;
    if (activeTab === "sent") return myCampaigns;
    return campaigns;
  };

  if (loading) return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-emerald-500/5 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/20 p-3"><Megaphone className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold mb-2">Marketing</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-display tracking-tight">My Campaigns</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">Manage your campaigns and admin-assigned campaigns across every channel.</p>
            </div>
          </div>
          <Button onClick={() => openCreate()} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.6)] hover:shadow-[0_12px_40px_-10px_hsl(var(--primary)/0.8)] transition-all hover:-translate-y-0.5">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </div>
      </div>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: campaigns.length, color: "text-primary" },
          { label: "Sent", value: campaigns.filter(c => c.status === "sent").length, color: "text-emerald-400" },
          { label: "Drafts / Assigned", value: assignedCampaigns.length, color: "text-amber-400" },
          { label: "Ready", value: campaigns.filter(c => c.status === "ready").length, color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.4)]">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative text-center">
              <p className={`text-3xl font-bold font-display tracking-tight ${s.color}`}>{s.value}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>


      {/* Quick Create */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Create by Platform</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_PLATFORMS.map(p => {
              const Icon = p.icon;
              return <Button key={p.value} variant="outline" size="sm" onClick={() => openCreate(p.value)} className="gap-2"><Icon className={`h-4 w-4 ${p.color}`} /> {p.label}</Button>;
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="assigned" className="gap-1">
            <UserCheck className="h-3 w-3" /> Drafts / Assigned ({assignedCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="sent">Sent / Ready ({myCampaigns.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredCampaigns().length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No campaigns found</TableCell></TableRow>
              )}
              {getFilteredCampaigns().map(c => {
                const platform = getPlatformInfo(c.channel);
                const PIcon = platform.icon;
                return (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline" className="gap-1"><PIcon className={`h-3 w-3 ${platform.color}`} />{platform.label}</Badge></TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.subject}</TableCell>
                    <TableCell><Badge variant={c.status === "sent" ? "default" : c.status === "ready" ? "outline" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.total_sent || 0}/{c.total_recipients || 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setPreviewContent(c.content); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        {c.status !== "sent" && <Button size="icon" variant="ghost" onClick={() => sendCampaign(c)} disabled={sending}><Send className="h-4 w-4" /></Button>}
                        <Button size="icon" variant="ghost" onClick={() => deleteCampaign(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
