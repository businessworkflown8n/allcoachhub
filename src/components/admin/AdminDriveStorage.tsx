import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, HardDrive, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Settings = { id: string; is_enabled: boolean; max_upload_size_mb: number; require_admin_approval: boolean };
type Conn = {
  id: string; coach_id: string; google_account_email: string | null; status: string;
  quota_used: number | null; quota_total: number | null; connected_at: string | null;
};

function formatBytes(n: number | null) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function AdminDriveStorage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [connections, setConnections] = useState<Conn[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("drive_access_settings" as any).select("*").limit(1).maybeSingle(),
      supabase.from("drive_connections" as any).select("*").order("connected_at", { ascending: false }),
    ]);
    setSettings(s as any);
    setConnections((c as any) ?? []);
    if (c && (c as any[]).length) {
      const ids = (c as any[]).map((x) => x.coach_id);
      const { data: profs } = await supabase.from("profiles").select("user_id,full_name,email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email || p.user_id; });
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async (patch: Partial<Settings>) => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("drive_access_settings" as any).update(patch).eq("id", settings.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setSettings({ ...settings, ...patch });
    toast.success("Settings saved");
  };

  const suspendCoach = async (coachId: string, suspend: boolean) => {
    const { error } = await supabase.from("drive_coach_overrides" as any).upsert({
      coach_id: coachId, is_suspended: suspend,
    }, { onConflict: "coach_id" });
    if (error) return toast.error(error.message);
    toast.success(suspend ? "Coach suspended" : "Coach reinstated");
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Google Drive Storage</h2>
        <p className="text-sm text-muted-foreground">Control which coaches can connect their Drive and how much they can upload.</p>
      </div>

      <Card className="border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Global Settings</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <Label className="text-foreground">Drive Integration</Label>
              <p className="text-xs text-muted-foreground">Master enable/disable</p>
            </div>
            <Switch checked={settings?.is_enabled ?? false} onCheckedChange={(v) => saveSettings({ is_enabled: v })} disabled={saving} />
          </div>
          <div className="rounded-lg border border-border p-3">
            <Label className="text-foreground">Max Upload Size (MB)</Label>
            <Input
              type="number"
              min={1}
              defaultValue={settings?.max_upload_size_mb}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v && v !== settings?.max_upload_size_mb) saveSettings({ max_upload_size_mb: v });
              }}
              className="mt-2"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <Label className="text-foreground">Require Approval</Label>
              <p className="text-xs text-muted-foreground">Admin approves before coach uploads</p>
            </div>
            <Switch checked={settings?.require_admin_approval ?? false} onCheckedChange={(v) => saveSettings({ require_admin_approval: v })} disabled={saving} />
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Connected Coaches ({connections.length})</h3>
        {connections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No coaches have connected Google Drive yet.</p>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => {
              const pct = c.quota_total ? ((c.quota_used ?? 0) / c.quota_total) * 100 : 0;
              return (
                <div key={c.id} className="flex items-center gap-4 rounded-lg border border-border bg-background p-3">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{profiles[c.coach_id] ?? c.coach_id}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.google_account_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatBytes(c.quota_used)} / {formatBytes(c.quota_total)}</p>
                    <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <Badge variant={c.status === "connected" ? "default" : "destructive"}>{c.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => suspendCoach(c.coach_id, true)}>
                    <AlertTriangle className="mr-1 h-3 w-3" /> Suspend
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
