import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/compatClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Check, X, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AccessRequest {
  id: string;
  coach_id: string;
  user_id: string;
  user_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  coach_name?: string;
  user_name?: string;
  user_email?: string;
}

const AdminContactRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contact_access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const allUserIds = [...new Set(data.flatMap((r: any) => [r.coach_id, r.user_id]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", allUserIds);

      const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

      setRequests(data.map((r: any) => ({
        ...r,
        coach_name: profileMap.get(r.coach_id)?.full_name || "Unknown",
        user_name: profileMap.get(r.user_id)?.full_name || "Unknown",
        user_email: profileMap.get(r.user_id)?.email || "—",
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessingId(id);
    const { error } = await supabase
      .from("contact_access_requests")
      .update({ status, approved_by: user?.id, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Request ${status}` });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    }
    setProcessingId(null);
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.coach_name?.toLowerCase().includes(q) || r.user_name?.toLowerCase().includes(q) || r.user_email?.toLowerCase().includes(q);
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🟢 Approved</Badge>;
      case "rejected": return <Badge className="bg-destructive/20 text-destructive border-destructive/30">🔴 Rejected</Badge>;
      default: return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">🟡 Pending</Badge>;
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-foreground">Contact Access Requests</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-64" />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <KeyRound className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Requests</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Clock className="h-5 w-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Check className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <X className="h-5 w-5 text-destructive mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <KeyRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No contact access requests yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coach</TableHead>
                <TableHead>User</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-foreground font-medium whitespace-nowrap">{r.coach_name}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">{r.user_name}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{r.user_email}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{r.user_type}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => handleAction(r.id, "approved")} disabled={processingId === r.id}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleAction(r.id, "rejected")} disabled={processingId === r.id}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminContactRequests;
