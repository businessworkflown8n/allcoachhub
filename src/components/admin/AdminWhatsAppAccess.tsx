import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Search, Users, KeyRound, Eye, EyeOff, Inbox } from "lucide-react";

interface CoachAccess {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  user_login?: string | null;
  password?: string | null;
  login_url?: string | null;
  cred_updated_at?: string | null;
}

interface CredentialRequest {
  id: string;
  coach_id: string;
  status: string;
  created_at: string;
  coach_name?: string;
  coach_email?: string;
}

const DEFAULT_LOGIN_URL = "https://login.digitalsms.biz/signin.php";

const AdminWhatsAppAccess = () => {
  const [coaches, setCoaches] = useState<CoachAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CoachAccess | null>(null);
  const [form, setForm] = useState({ login_url: DEFAULT_LOGIN_URL, user_id: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<CredentialRequest[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: accessRows }, { data: credRows }, { data: reqRows }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("user_roles").select("user_id").eq("role", "coach"),
      supabase.from("whatsapp_access").select("coach_id, is_active"),
      supabase.from("whatsapp_credentials").select("coach_id, login_url, updated_at"),
      supabase.from("whatsapp_credential_requests").select("id, coach_id, status, created_at").eq("status", "pending").order("created_at", { ascending: false }),
    ]);

    const coachIds = new Set((roles || []).map((r: any) => r.user_id));
    const accessMap = new Map((accessRows || []).map((a: any) => [a.coach_id, a]));
    const credMap = new Map((credRows || []).map((c: any) => [c.coach_id, c]));

    const list: CoachAccess[] = (profiles || [])
      .filter((p: any) => coachIds.has(p.user_id))
      .map((p: any) => {
        const access = accessMap.get(p.user_id);
        const cred: any = credMap.get(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name || "Unknown",
          email: p.email || "",
          is_active: access?.is_active ?? false,
          user_login: null,
          password: null,
          login_url: cred?.login_url ?? DEFAULT_LOGIN_URL,
          cred_updated_at: cred?.updated_at ?? null,
        };
      });

    setCoaches(list);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setRequests(
      (reqRows || []).map((r: any) => {
        const p: any = profileMap.get(r.coach_id);
        return { ...r, coach_name: p?.full_name, coach_email: p?.email };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const toggleAccess = async (coachId: string, currentActive: boolean) => {
    const newActive = !currentActive;
    const { data: existing } = await supabase
      .from("whatsapp_access")
      .select("id")
      .eq("coach_id", coachId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("whatsapp_access")
        .update({ is_active: newActive, updated_at: new Date().toISOString() })
        .eq("coach_id", coachId);
    } else {
      await supabase.from("whatsapp_access").insert({ coach_id: coachId, is_active: newActive });
    }

    setCoaches((prev) => prev.map((c) => (c.user_id === coachId ? { ...c, is_active: newActive } : c)));
    toast({
      title: newActive ? "WhatsApp Access Enabled" : "WhatsApp Access Disabled",
      description: `Access ${newActive ? "granted" : "revoked"} successfully.`,
    });
  };

  const openEditor = (c: CoachAccess) => {
    setEditing(c);
    setForm({
      login_url: c.login_url || DEFAULT_LOGIN_URL,
      user_id: c.user_login || "",
      password: c.password || "",
    });
    setShowPw(false);
  };

  const saveCredentials = async () => {
    if (!editing) return;
    if (!form.user_id.trim() || !form.password.trim()) {
      toast({ title: "Missing fields", description: "User ID and Password are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).rpc("set_whatsapp_credentials", {
      _coach_id: editing.user_id,
      _login_url: form.login_url.trim() || DEFAULT_LOGIN_URL,
      _user_id: form.user_id.trim(),
      _password: form.password,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Credentials saved", description: `Updated for ${editing.full_name}` });
    setEditing(null);
    fetchAll();
  };

  const resolveRequest = async (id: string) => {
    await supabase
      .from("whatsapp_credential_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Request marked resolved" });
  };

  const filtered = coaches.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = coaches.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp Access Control</h2>
          <p className="text-sm text-muted-foreground">Enable access and manage Digital SMS dashboard credentials for coaches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold text-foreground">{coaches.length}</p><p className="text-sm text-muted-foreground">Total Coaches</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold text-primary">{activeCount}</p><p className="text-sm text-muted-foreground">Access Enabled</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Inbox className="h-5 w-5 text-amber-500" /><div><p className="text-2xl font-bold text-foreground">{requests.length}</p><p className="text-sm text-muted-foreground">Pending Credential Requests</p></div></div></CardContent></Card>
      </div>

      {requests.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader><CardTitle className="text-foreground flex items-center gap-2"><Inbox className="h-4 w-4 text-amber-500" /> Credential Requests</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Coach</TableHead><TableHead>Email</TableHead><TableHead>Requested</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">{r.coach_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.coach_email}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => {
                        const coach = coaches.find((c) => c.user_id === r.coach_id);
                        if (coach) openEditor(coach);
                      }}>Set Credentials</Button>
                      <Button size="sm" variant="ghost" className="ml-2" onClick={() => resolveRequest(r.id)}>Mark Resolved</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-foreground">Coach WhatsApp Access</CardTitle>
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
                    <TableHead>Coach Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp Access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((coach) => (
                    <TableRow key={coach.user_id}>
                      <TableCell className="font-medium text-foreground">{coach.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{coach.email}</TableCell>
                      <TableCell>
                        <Switch checked={coach.is_active} onCheckedChange={() => toggleAccess(coach.user_id, coach.is_active)} />
                      </TableCell>
                      <TableCell><Badge variant={coach.is_active ? "default" : "secondary"}>{coach.is_active ? "Active" : "Disabled"}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={coach.user_login ? "default" : "outline"}>
                          {coach.user_login ? "Set" : "Not Set"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {coach.cred_updated_at ? new Date(coach.cred_updated_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEditor(coach)}>
                          <KeyRound className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No coaches found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp Credentials — {editing?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="login_url">Login URL</Label>
              <Input id="login_url" value={form.login_url} onChange={(e) => setForm({ ...form, login_url: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="user_id">User ID</Label>
              <Input id="user_id" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="Digital SMS Login ID" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Digital SMS Login Password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveCredentials} disabled={saving}>{saving ? "Saving..." : "Save Credentials"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWhatsAppAccess;
