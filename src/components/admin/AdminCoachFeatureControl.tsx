import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Search, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import AdminCoachProfilePictures from "./AdminCoachProfilePictures";

interface CoachFlags {
  coach_id: string;
  full_name: string;
  email: string;
  status: string;
  workshops_access: boolean;
  courses_access: boolean;
  feed_access: boolean;
  messaging_access: boolean;
  paid_content_access: boolean;
  contact_access: boolean;
  profile_picture_access: boolean;
  blueprint_access: boolean;
  materials_access: boolean;
  crm_access: boolean;
  leads_access: boolean;
  sessions_access: boolean;
  progress_access: boolean;
  packages_access: boolean;
  automations_access: boolean;
  copilot_access: boolean;
  content_studio_access: boolean;
  external_materials_access: boolean;
  kids_courses_access: boolean;
  whatsapp_dashboard_access: boolean;
}

const FEATURES = [
  { key: "workshops_access", label: "Workshops" },
  { key: "courses_access", label: "Courses" },
  { key: "feed_access", label: "Feed" },
  { key: "messaging_access", label: "Messaging" },
  { key: "paid_content_access", label: "Paid Content" },
  { key: "contact_access", label: "Contact Access" },
  { key: "profile_picture_access", label: "Profile Picture" },
  { key: "blueprint_access", label: "Blueprint App" },
  { key: "materials_access", label: "Materials" },
  { key: "crm_access", label: "Client CRM" },
  { key: "leads_access", label: "Lead Pipeline" },
  { key: "sessions_access", label: "Sessions" },
  { key: "progress_access", label: "Progress Tracker" },
  { key: "packages_access", label: "Packages" },
  { key: "automations_access", label: "Automations" },
  { key: "copilot_access", label: "AI Copilot" },
  { key: "content_studio_access", label: "Content Studio" },
  { key: "external_materials_access", label: "Material Links (External Only)" },
  { key: "kids_courses_access", label: "🚀 AI Kids Pro Courses" },
  { key: "whatsapp_dashboard_access", label: "📱 WhatsApp Dashboard" },
] as const;

const AdminCoachFeatureControl = () => {
  const [coaches, setCoaches] = useState<CoachFlags[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCoaches = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email");
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
    const coachIds = new Set((roles || []).map((r) => r.user_id));
    const { data: flags } = await supabase.from("coach_feature_flags").select("*");
    const flagMap = new Map((flags || []).map((f: any) => [f.coach_id, f]));
    const { data: waRows } = await supabase.from("whatsapp_access").select("coach_id, is_active");
    const waMap = new Map((waRows || []).map((w: any) => [w.coach_id, !!w.is_active]));

    const list: CoachFlags[] = (profiles || [])
      .filter((p) => coachIds.has(p.user_id))
      .map((p) => {
        const f = flagMap.get(p.user_id);
        return {
          coach_id: p.user_id,
          full_name: p.full_name || "Unknown",
          email: p.email || "",
          status: f?.status ?? "pending",
          workshops_access: f?.workshops_access ?? false,
          courses_access: f?.courses_access ?? false,
          feed_access: f?.feed_access ?? false,
          messaging_access: f?.messaging_access ?? false,
          paid_content_access: f?.paid_content_access ?? false,
          contact_access: f?.contact_access ?? false,
          profile_picture_access: f?.profile_picture_access ?? true,
          blueprint_access: f?.blueprint_access ?? true,
          materials_access: f?.materials_access ?? true,
          crm_access: f?.crm_access ?? false,
          leads_access: f?.leads_access ?? false,
          sessions_access: f?.sessions_access ?? false,
          progress_access: f?.progress_access ?? false,
          packages_access: f?.packages_access ?? false,
          automations_access: f?.automations_access ?? false,
          copilot_access: f?.copilot_access ?? false,
          content_studio_access: f?.content_studio_access ?? false,
          external_materials_access: f?.external_materials_access ?? false,
          kids_courses_access: f?.kids_courses_access ?? false,
          whatsapp_dashboard_access: waMap.get(p.user_id) ?? false,
        };
      });
    setCoaches(list);
    setLoading(false);
  };

  useEffect(() => { fetchCoaches(); }, []);

  const toggleFeature = async (coachId: string, field: string, current: boolean) => {
    const { data: existing } = await supabase.from("coach_feature_flags").select("id").eq("coach_id", coachId).maybeSingle();
    if (existing) {
      await supabase.from("coach_feature_flags").update({ [field]: !current, updated_at: new Date().toISOString() }).eq("coach_id", coachId);
    } else {
      await supabase.from("coach_feature_flags").insert({ coach_id: coachId, [field]: !current });
    }
    setCoaches((prev) => prev.map((c) => c.coach_id === coachId ? { ...c, [field]: !current } : c));
    toast({ title: `${field.replace(/_/g, " ")} ${!current ? "enabled" : "disabled"}` });
  };

  const setStatus = async (coachId: string, status: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "approved") {
      updates.approved_at = new Date().toISOString();
      updates.workshops_access = true;
      updates.courses_access = true;
      updates.feed_access = true;
      updates.messaging_access = true;
      updates.paid_content_access = true;
      updates.contact_access = true;
      updates.profile_picture_access = true;
      updates.blueprint_access = true;
      updates.materials_access = true;
      updates.crm_access = true;
      updates.leads_access = true;
      updates.sessions_access = true;
      updates.progress_access = true;
      updates.packages_access = true;
      updates.automations_access = true;
      updates.copilot_access = true;
      updates.content_studio_access = true;
    } else if (status === "rejected") {
      updates.workshops_access = false;
      updates.courses_access = false;
      updates.feed_access = false;
      updates.messaging_access = false;
      updates.paid_content_access = false;
      updates.contact_access = false;
      updates.profile_picture_access = false;
      updates.blueprint_access = false;
      updates.materials_access = false;
      updates.crm_access = false;
      updates.leads_access = false;
      updates.sessions_access = false;
      updates.progress_access = false;
      updates.packages_access = false;
      updates.automations_access = false;
      updates.copilot_access = false;
      updates.content_studio_access = false;
    }

    const { data: existing } = await supabase.from("coach_feature_flags").select("id").eq("coach_id", coachId).maybeSingle();
    if (existing) {
      await supabase.from("coach_feature_flags").update(updates).eq("coach_id", coachId);
    } else {
      await supabase.from("coach_feature_flags").insert({ coach_id: coachId, ...updates });
    }
    setCoaches((prev) => prev.map((c) => c.coach_id === coachId ? { ...c, ...updates } : c));
    toast({ title: `Coach ${status}` });
  };

  const filtered = coaches.filter(
    (c) => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total: coaches.length,
    approved: coaches.filter((c) => c.status === "approved").length,
    pending: coaches.filter((c) => c.status === "pending").length,
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Coach Feature Access Control</h2>
          <p className="text-sm text-muted-foreground">Approve coaches and manage feature-level permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold text-foreground">{counts.total}</p><p className="text-sm text-muted-foreground">Total Coaches</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-emerald-500" /><div><p className="text-2xl font-bold text-emerald-600">{counts.approved}</p><p className="text-sm text-muted-foreground">Approved</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-amber-500" /><div><p className="text-2xl font-bold text-amber-600">{counts.pending}</p><p className="text-sm text-muted-foreground">Pending</p></div></div></CardContent></Card>
      </div>

      <AdminCoachProfilePictures />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-foreground">Feature Permissions</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search coaches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading coaches...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    {FEATURES.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((coach) => (
                    <TableRow key={coach.coach_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{coach.full_name}</p>
                          <p className="text-xs text-muted-foreground">{coach.email}</p>
                        </div>
                      </TableCell>
                      {FEATURES.map((f) => (
                        <TableCell key={f.key}>
                          <Switch
                            checked={coach[f.key as keyof CoachFlags] as boolean}
                            onCheckedChange={() => toggleFeature(coach.coach_id, f.key, coach[f.key as keyof CoachFlags] as boolean)}
                          />
                        </TableCell>
                      ))}
                      <TableCell>{statusBadge(coach.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {coach.status !== "approved" && (
                            <Button size="sm" variant="default" onClick={() => setStatus(coach.coach_id, "approved")}>Approve</Button>
                          )}
                          {coach.status !== "rejected" && (
                            <Button size="sm" variant="destructive" onClick={() => setStatus(coach.coach_id, "rejected")}>Reject</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No coaches found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCoachFeatureControl;
