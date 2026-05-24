import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Copy, Plus, Users, Mail, Calendar, Link2, ShieldCheck, Lock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: { id: string; title: string; access_type?: string; visibility?: string } | null;
  onUpdated?: () => void;
}

type Cohort = { id: string; name: string; starts_at: string | null; ends_at: string | null; max_seats: number | null };
type Grant = { id: string; user_id: string | null; email: string | null; expires_at: string | null; cohort_id: string | null; is_active: boolean; created_at: string };
type Invite = { id: string; token: string; email: string | null; max_uses: number; use_count: number; expires_at: string | null; cohort_id: string | null; created_at: string };

const ACCESS_OPTIONS = [
  { value: "free", label: "Free — anyone can enroll", icon: "🆓" },
  { value: "paid", label: "Paid — requires purchase", icon: "💳" },
  { value: "invite", label: "Invite-only — link/email required", icon: "✉️" },
  { value: "private", label: "Private — manually granted only", icon: "🔒" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public — listed in catalog" },
  { value: "unlisted", label: "Unlisted — link only" },
  { value: "private", label: "Private — hidden everywhere" },
];

const CourseAccessManager = ({ open, onOpenChange, course, onUpdated }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"settings" | "grants" | "cohorts" | "invites">("settings");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [accessType, setAccessType] = useState(course?.access_type || "free");
  const [visibility, setVisibility] = useState(course?.visibility || "public");

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  // Add forms
  const [newCohort, setNewCohort] = useState({ name: "", starts_at: "", ends_at: "", max_seats: "" });
  const [newGrant, setNewGrant] = useState({ email: "", expires_at: "", cohort_id: "" });
  const [newInvite, setNewInvite] = useState({ email: "", max_uses: "1", expires_at: "", cohort_id: "" });

  useEffect(() => {
    if (course) {
      setAccessType(course.access_type || "free");
      setVisibility(course.visibility || "public");
    }
  }, [course]);

  const load = async () => {
    if (!course) return;
    setLoading(true);
    const [co, gr, inv] = await Promise.all([
      supabase.from("course_cohorts").select("*").eq("course_id", course.id).order("sort_order"),
      supabase.from("course_access_grants").select("*").eq("course_id", course.id).order("created_at", { ascending: false }),
      supabase.from("course_invites").select("*").eq("course_id", course.id).order("created_at", { ascending: false }),
    ]);
    setCohorts((co.data as any) || []);
    setGrants((gr.data as any) || []);
    setInvites((inv.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open && course) load(); /* eslint-disable-next-line */ }, [open, course]);

  const saveSettings = async () => {
    if (!course) return;
    setSaving(true);
    const { error } = await supabase.from("courses").update({ access_type: accessType, visibility }).eq("id", course.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Access settings updated" });
    onUpdated?.();
  };

  const addCohort = async () => {
    if (!course || !newCohort.name.trim()) return toast({ title: "Cohort name required", variant: "destructive" });
    const { error } = await supabase.from("course_cohorts").insert({
      course_id: course.id,
      name: newCohort.name.trim(),
      starts_at: newCohort.starts_at || null,
      ends_at: newCohort.ends_at || null,
      max_seats: newCohort.max_seats ? parseInt(newCohort.max_seats) : null,
      sort_order: cohorts.length,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewCohort({ name: "", starts_at: "", ends_at: "", max_seats: "" });
    toast({ title: "Cohort added" });
    load();
  };

  const removeCohort = async (id: string) => {
    if (!confirm("Delete this cohort? Grants/invites in it will lose their cohort link.")) return;
    await supabase.from("course_cohorts").delete().eq("id", id);
    load();
  };

  const addGrant = async () => {
    if (!course || !newGrant.email.trim()) return toast({ title: "Email required", variant: "destructive" });
    const { error } = await supabase.from("course_access_grants").insert({
      course_id: course.id,
      email: newGrant.email.trim().toLowerCase(),
      expires_at: newGrant.expires_at ? new Date(newGrant.expires_at).toISOString() : null,
      cohort_id: newGrant.cohort_id || null,
      granted_by: user?.id,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewGrant({ email: "", expires_at: "", cohort_id: "" });
    toast({ title: "Access granted" });
    load();
  };

  const revokeGrant = async (id: string) => {
    await supabase.from("course_access_grants").delete().eq("id", id);
    load();
  };

  const addInvite = async () => {
    if (!course) return;
    const { error } = await supabase.from("course_invites").insert({
      course_id: course.id,
      email: newInvite.email.trim() ? newInvite.email.trim().toLowerCase() : null,
      max_uses: parseInt(newInvite.max_uses) || 1,
      expires_at: newInvite.expires_at ? new Date(newInvite.expires_at).toISOString() : null,
      cohort_id: newInvite.cohort_id || null,
      created_by: user?.id,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewInvite({ email: "", max_uses: "1", expires_at: "", cohort_id: "" });
    toast({ title: "Invite created" });
    load();
  };

  const revokeInvite = async (id: string) => {
    await supabase.from("course_invites").delete().eq("id", id);
    load();
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/enroll?course=${course?.id}&invite=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Invite link copied" });
  };

  const tabs = useMemo(() => [
    { key: "settings" as const, label: "Settings", icon: ShieldCheck },
    { key: "grants" as const, label: `Learner Access (${grants.length})`, icon: Users },
    { key: "cohorts" as const, label: `Cohorts (${cohorts.length})`, icon: Calendar },
    { key: "invites" as const, label: `Invites (${invites.length})`, icon: Link2 },
  ], [grants.length, cohorts.length, invites.length]);

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Access — {course.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                tab === key ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : tab === "settings" ? (
          <div className="space-y-4 py-2">
            <div>
              <Label>Access Type</Label>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.icon} {o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">How it works:</strong> "Invite" requires a learner to redeem an invite link or be on the grants list.
              "Private" hides the course entirely — only learners you manually grant access can see it.
            </div>
            <Button onClick={saveSettings} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Settings
            </Button>
          </div>
        ) : tab === "grants" ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> Grant access to a learner</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="learner@email.com" value={newGrant.email} onChange={(e) => setNewGrant({ ...newGrant, email: e.target.value })} />
                <Input type="date" placeholder="Expires (optional)" value={newGrant.expires_at} onChange={(e) => setNewGrant({ ...newGrant, expires_at: e.target.value })} />
                <Select value={newGrant.cohort_id || "none"} onValueChange={(v) => setNewGrant({ ...newGrant, cohort_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Cohort (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No cohort</SelectItem>
                    {cohorts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addGrant} className="w-full sm:w-auto"><Mail className="h-3 w-3 mr-1" /> Grant Access</Button>
            </div>

            {grants.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No manual grants yet.</p>
            ) : (
              <div className="space-y-1">
                {grants.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{g.email || g.user_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.cohort_id ? `Cohort: ${cohorts.find((c) => c.id === g.cohort_id)?.name || "—"} · ` : ""}
                        {g.expires_at ? `Expires ${new Date(g.expires_at).toLocaleDateString()}` : "No expiry"}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => revokeGrant(g.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "cohorts" ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> Add a cohort / batch</p>
              <Input placeholder="Cohort name (e.g. January 2026)" value={newCohort.name} onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input type="date" value={newCohort.starts_at} onChange={(e) => setNewCohort({ ...newCohort, starts_at: e.target.value })} placeholder="Starts" />
                <Input type="date" value={newCohort.ends_at} onChange={(e) => setNewCohort({ ...newCohort, ends_at: e.target.value })} placeholder="Ends" />
                <Input type="number" min={0} value={newCohort.max_seats} onChange={(e) => setNewCohort({ ...newCohort, max_seats: e.target.value })} placeholder="Max seats" />
              </div>
              <Button size="sm" onClick={addCohort}>Add Cohort</Button>
            </div>

            {cohorts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No cohorts yet.</p>
            ) : (
              cohorts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : "—"} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "—"}
                      {c.max_seats ? ` · ${c.max_seats} seats` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeCohort(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> Create an invite link</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Email (optional)" value={newInvite.email} onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })} />
                <Input type="number" min={1} placeholder="Max uses" value={newInvite.max_uses} onChange={(e) => setNewInvite({ ...newInvite, max_uses: e.target.value })} />
                <Input type="date" placeholder="Expires" value={newInvite.expires_at} onChange={(e) => setNewInvite({ ...newInvite, expires_at: e.target.value })} />
              </div>
              <Select value={newInvite.cohort_id || "none"} onValueChange={(v) => setNewInvite({ ...newInvite, cohort_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Cohort (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No cohort</SelectItem>
                  {cohorts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addInvite}>Generate Invite</Button>
            </div>

            {invites.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No invites yet.</p>
            ) : (
              invites.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs truncate">{i.token}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {i.email || "Any email"} · {i.use_count}/{i.max_uses} uses
                      {i.expires_at ? ` · exp ${new Date(i.expires_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyInviteLink(i.token)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CourseAccessManager;
