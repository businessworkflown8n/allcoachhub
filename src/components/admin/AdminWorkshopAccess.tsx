import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/compatClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Presentation, Search, Users } from "lucide-react";

interface CoachWorkshopAccess {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  meeting_creation: boolean;
  email_sending: boolean;
  recording_access: boolean;
  analytics_access: boolean;
}

const AdminWorkshopAccess = () => {
  const [coaches, setCoaches] = useState<CoachWorkshopAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCoaches = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email");
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
    const coachIds = new Set((roles || []).map((r) => r.user_id));
    const { data: accessRows } = await supabase.from("workshop_access").select("*");
    const accessMap = new Map<string, any>((accessRows || []).map((a: any) => [a.coach_id, a]));

    const list: CoachWorkshopAccess[] = (profiles || [])
      .filter((p) => coachIds.has(p.user_id))
      .map((p) => {
        const access = accessMap.get(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name || "Unknown",
          email: p.email || "",
          is_active: access?.is_active ?? false,
          meeting_creation: access?.meeting_creation ?? true,
          email_sending: access?.email_sending ?? false,
          recording_access: access?.recording_access ?? true,
          analytics_access: access?.analytics_access ?? true,
        };
      });
    setCoaches(list);
    setLoading(false);
  };

  useEffect(() => { fetchCoaches(); }, []);

  const toggleField = async (coachId: string, field: string, currentValue: boolean) => {
    const newValue = !currentValue;
    const { data: existing } = await supabase.from("workshop_access").select("id").eq("coach_id", coachId).maybeSingle();

    if (existing) {
      await supabase.from("workshop_access").update({ [field]: newValue, updated_at: new Date().toISOString() } as any).eq("coach_id", coachId);
    } else {
      await supabase.from("workshop_access").insert({ coach_id: coachId, [field]: newValue, is_active: field === "is_active" ? newValue : false } as any);
    }

    setCoaches((prev) => prev.map((c) => c.user_id === coachId ? { ...c, [field]: newValue } : c));
    toast({ title: `${field.replace(/_/g, " ")} ${newValue ? "enabled" : "disabled"}` });
  };

  const filtered = coaches.filter(
    (c) => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = coaches.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Presentation className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Workshop Feature Control</h2>
          <p className="text-sm text-muted-foreground">Enable or disable workshop features for coaches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold text-foreground">{coaches.length}</p><p className="text-sm text-muted-foreground">Total Coaches</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Presentation className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold text-primary">{activeCount}</p><p className="text-sm text-muted-foreground">Access Enabled</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold text-foreground">{coaches.length - activeCount}</p><p className="text-sm text-muted-foreground">Access Disabled</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-foreground">Coach Workshop Access</CardTitle>
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
                    <TableHead>Access</TableHead>
                    <TableHead>Meetings</TableHead>
                    <TableHead>Emails</TableHead>
                    <TableHead>Recording</TableHead>
                    <TableHead>Analytics</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((coach) => (
                    <TableRow key={coach.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{coach.full_name}</p>
                          <p className="text-xs text-muted-foreground">{coach.email}</p>
                        </div>
                      </TableCell>
                      <TableCell><Switch checked={coach.is_active} onCheckedChange={() => toggleField(coach.user_id, "is_active", coach.is_active)} /></TableCell>
                      <TableCell><Switch checked={coach.meeting_creation} onCheckedChange={() => toggleField(coach.user_id, "meeting_creation", coach.meeting_creation)} disabled={!coach.is_active} /></TableCell>
                      <TableCell><Switch checked={coach.email_sending} onCheckedChange={() => toggleField(coach.user_id, "email_sending", coach.email_sending)} disabled={!coach.is_active} /></TableCell>
                      <TableCell><Switch checked={coach.recording_access} onCheckedChange={() => toggleField(coach.user_id, "recording_access", coach.recording_access)} disabled={!coach.is_active} /></TableCell>
                      <TableCell><Switch checked={coach.analytics_access} onCheckedChange={() => toggleField(coach.user_id, "analytics_access", coach.analytics_access)} disabled={!coach.is_active} /></TableCell>
                      <TableCell><Badge variant={coach.is_active ? "default" : "secondary"}>{coach.is_active ? "Active" : "Disabled"}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No coaches found</TableCell></TableRow>
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

export default AdminWorkshopAccess;
