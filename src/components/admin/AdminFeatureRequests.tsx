import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/compatClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Inbox, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Req {
  id: string; coach_id: string; feature_key: string; message: string | null;
  status: string; created_at: string; reviewer_note: string | null;
  coach_name?: string; coach_email?: string;
}

const labelOf = (k: string) => k.replace(/_access$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const AdminFeatureRequests = () => {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("feature_access_requests").select("*").order("created_at", { ascending: false });
    const ids = Array.from(new Set((data || []).map((r: any) => r.coach_id)));
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
    const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
    setReqs((data || []).map((r: any) => ({ ...r, coach_name: map.get(r.coach_id)?.full_name, coach_email: map.get(r.coach_id)?.email })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const decide = async (req: Req, status: "approved" | "denied") => {
    const note = window.prompt(status === "approved" ? "Optional note (will be visible to coach):" : "Reason for denial:") || null;
    const updates: any = { status, reviewer_note: note, reviewed_at: new Date().toISOString() };
    await supabase.from("feature_access_requests").update(updates).eq("id", req.id);

    if (status === "approved") {
      const { data: existing } = await supabase.from("coach_feature_flags").select("id").eq("coach_id", req.coach_id).maybeSingle();
      const patch: any = { [req.feature_key]: true };
      if (existing) await supabase.from("coach_feature_flags").update(patch).eq("coach_id", req.coach_id);
      else await supabase.from("coach_feature_flags").insert({ coach_id: req.coach_id, ...patch });
    }
    toast({ title: `Request ${status}` });
    load();
  };

  const pending = reqs.filter((r) => r.status === "pending");
  const others = reqs.filter((r) => r.status !== "pending");

  const badge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
    if (s === "denied") return <Badge variant="destructive">Denied</Badge>;
    if (s === "cancelled") return <Badge variant="secondary">Cancelled</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  const renderTable = (rows: Req[]) => (
    <Table>
      <TableHeader><TableRow><TableHead>Coach</TableHead><TableHead>Feature</TableHead><TableHead>Message</TableHead><TableHead>When</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell><div><p className="font-medium text-foreground">{r.coach_name || "Unknown"}</p><p className="text-xs text-muted-foreground">{r.coach_email}</p></div></TableCell>
            <TableCell><Badge variant="outline">{labelOf(r.feature_key)}</Badge></TableCell>
            <TableCell className="max-w-xs"><p className="text-sm text-foreground line-clamp-2">{r.message || "—"}</p></TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
            <TableCell>{badge(r.status)}</TableCell>
            <TableCell>
              {r.status === "pending" ? (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => decide(r, "approved")}><Check className="h-3 w-3 mr-1" />Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(r, "denied")}><X className="h-3 w-3 mr-1" />Deny</Button>
                </div>
              ) : r.reviewer_note ? <p className="text-xs text-muted-foreground italic">{r.reviewer_note}</p> : <span className="text-xs text-muted-foreground">—</span>}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No requests</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Feature Access Requests</h2>
          <p className="text-sm text-muted-foreground">Coaches request unlocks for locked features. Approving auto-enables the flag.</p>
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-foreground">Pending ({pending.length})</CardTitle></CardHeader>
            <CardContent>{renderTable(pending)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-foreground">History</CardTitle></CardHeader>
            <CardContent>{renderTable(others)}</CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminFeatureRequests;
