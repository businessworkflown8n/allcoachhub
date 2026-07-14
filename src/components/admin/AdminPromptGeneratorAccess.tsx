import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface Row {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  approval_status: string;
  is_suspended: boolean;
  pg_enabled: boolean | null; // override value; null = inherits global
}

const AdminPromptGeneratorAccess = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [globalEnabled, setGlobalEnabled] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: overrides }, { data: fc }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, approval_status, is_suspended").limit(500),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("coach_feature_override").select("coach_id, enabled").eq("feature_key", "prompt_generator"),
      supabase.from("feature_controls").select("global_enabled").eq("feature_key", "prompt_generator").maybeSingle(),
    ]);
    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    const ovMap = new Map((overrides || []).map((o: any) => [o.coach_id, o.enabled]));
    setGlobalEnabled(!!fc?.global_enabled);
    setRows(
      (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        role: roleMap.get(p.user_id) ?? null,
        approval_status: p.approval_status ?? "pending",
        is_suspended: !!p.is_suspended,
        pg_enabled: ovMap.has(p.user_id) ? ovMap.get(p.user_id) : null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (user_id: string, approval_status: string) => {
    const { error } = await supabase.from("profiles").update({ approval_status }).eq("user_id", user_id);
    if (error) return toast.error(error.message);
    toast.success(`Status set to ${approval_status}`);
    load();
  };

  const setSuspended = async (user_id: string, is_suspended: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_suspended }).eq("user_id", user_id);
    if (error) return toast.error(error.message);
    toast.success(is_suspended ? "User suspended" : "User un-suspended");
    load();
  };

  const setPromptAccess = async (user_id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("coach_feature_override")
      .upsert({ coach_id: user_id, feature_key: "prompt_generator", enabled }, { onConflict: "coach_id,feature_key" });
    if (error) return toast.error(error.message);
    toast.success(enabled ? "Prompt Generator enabled" : "Prompt Generator disabled");
    load();
  };

  const toggleGlobal = async (enabled: boolean) => {
    const { error } = await supabase.from("feature_controls").update({ global_enabled: enabled }).eq("feature_key", "prompt_generator");
    if (error) return toast.error(error.message);
    setGlobalEnabled(enabled);
    toast.success(`Prompt Generator globally ${enabled ? "enabled" : "disabled"}`);
  };

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.email?.toLowerCase().includes(q) || r.full_name?.toLowerCase().includes(q));
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-500",
      approved: "bg-green-500/20 text-green-500",
      rejected: "bg-red-500/20 text-red-500",
      suspended: "bg-orange-500/20 text-orange-500",
    };
    return <Badge className={`${map[s] || ""} border-0`}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Prompt Generator — Global toggle</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">When off, no non-admin user can access the Prompt Generator.</p>
          </div>
          <Switch checked={globalEnabled} onCheckedChange={toggleGlobal} />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User approvals & Prompt Generator access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prompt Gen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map(r => (
                  <TableRow key={r.user_id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell>{r.role || "—"}</TableCell>
                    <TableCell>{statusBadge(r.is_suspended ? "suspended" : r.approval_status)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.pg_enabled === null ? globalEnabled : !!r.pg_enabled}
                        onCheckedChange={(v) => setPromptAccess(r.user_id, v)}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.user_id, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.user_id, "rejected")}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => setSuspended(r.user_id, !r.is_suspended)}>
                        {r.is_suspended ? "Unsuspend" : "Suspend"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPromptGeneratorAccess;
