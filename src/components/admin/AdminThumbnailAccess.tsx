import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImageIcon, Loader2 } from "lucide-react";

interface CoachRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  has_access: boolean;
}

const AdminThumbnailAccess = () => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [savingAuto, setSavingAuto] = useState(false);

  useEffect(() => { loadCoaches(); loadAutoSetting(); }, []);

  const loadAutoSetting = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "auto_thumbnail_enabled")
      .maybeSingle();
    setAutoEnabled(data?.value !== "false");
  };

  const toggleAuto = async (v: boolean) => {
    setSavingAuto(true);
    const { error } = await (supabase.from("platform_settings") as any).upsert(
      { key: "auto_thumbnail_enabled", value: v ? "true" : "false", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSavingAuto(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setAutoEnabled(v);
    toast({ title: v ? "Auto-generation enabled" : "Auto-generation disabled" });
  };

  const loadCoaches = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
    if (!roles?.length) { setLoading(false); return; }

    const ids = roles.map(r => r.user_id);
    const [profilesRes, accessRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids),
      supabase.from("thumbnail_access" as any).select("coach_id, is_active"),
    ]);

    const accessMap = new Map((accessRes.data || []).map((a: any) => [a.coach_id, a.is_active]));
    setCoaches((profilesRes.data || []).map(p => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      has_access: accessMap.get(p.user_id) === true,
    })));
    setLoading(false);
  };

  const toggle = async (coachId: string, enable: boolean) => {
    if (!user) return;
    setToggling(coachId);
    const existing = coaches.find(c => c.user_id === coachId);
    
    if (enable) {
      // Upsert
      const { error } = await (supabase.from("thumbnail_access" as any) as any).upsert(
        { coach_id: coachId, is_active: true, granted_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "coach_id" }
      );
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setToggling(null); return; }
    } else {
      const { error } = await (supabase.from("thumbnail_access" as any) as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("coach_id", coachId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setToggling(null); return; }
    }

    setCoaches(prev => prev.map(c => c.user_id === coachId ? { ...c, has_access: enable } : c));
    toast({ title: enable ? "Thumbnail access granted" : "Thumbnail access revoked" });
    setToggling(null);
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ImageIcon className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">AI Thumbnail Generator Access</h2>
          <p className="text-sm text-muted-foreground">Control which coaches can generate AI thumbnails for their courses.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold text-foreground">Auto-generate thumbnails on course creation</div>
          <p className="text-xs text-muted-foreground">When enabled, courses created without a thumbnail get one generated automatically.</p>
        </div>
        {savingAuto ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Switch checked={autoEnabled} onCheckedChange={toggleAuto} />}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coach</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches.map(coach => (
              <TableRow key={coach.user_id}>
                <TableCell className="font-medium text-foreground">{coach.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{coach.email || "—"}</TableCell>
                <TableCell className="text-center">
                  {toggling === coach.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" />
                  ) : (
                    <Switch
                      checked={coach.has_access}
                      onCheckedChange={(v) => toggle(coach.user_id, v)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {coaches.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No coaches found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminThumbnailAccess;
