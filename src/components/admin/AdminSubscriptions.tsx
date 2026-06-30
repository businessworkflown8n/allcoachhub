import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Users, IndianRupee, TrendingUp, AlertTriangle, RefreshCcw } from "lucide-react";

type Sub = {
  id: string;
  coach_id: string;
  plan_id: string | null;
  status: string;
  starts_at: string;
  ends_at: string | null;
  billing_interval: string | null;
  auto_renewal: boolean | null;
  grace_until: string | null;
};

type Plan = { id: string; name: string; slug: string; price: number | null; yearly_price: number | null; currency: string | null };

type History = { amount: number | null; currency: string | null; event_type: string; created_at: string; billing_interval: string | null };

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
const money = (n?: number | null) => (n == null ? "—" : `₹${Number(n).toLocaleString()}`);

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; email: string | null }>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const [{ data: s }, { data: p }, { data: h }] = await Promise.all([
      sb.from("coach_subscriptions").select("*").order("created_at", { ascending: false }),
      sb.from("subscription_plans").select("id,name,slug,price,yearly_price,currency").order("sort_order"),
      sb.from("subscription_history").select("amount,currency,event_type,created_at,billing_interval").order("created_at", { ascending: false }).limit(2000),
    ]);
    setSubs((s ?? []) as Sub[]);
    setPlans((p ?? []) as Plan[]);
    setHistory((h ?? []) as History[]);
    const ids = (s ?? []).map((x: Sub) => x.coach_id);
    if (ids.length) {
      const { data: profs } = await sb.from("profiles").select("id,full_name,email").in("id", ids);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = { full_name: p.full_name, email: p.email }; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const planById = (id?: string | null) => plans.find((p) => p.id === id);

  const total = subs.length;
  const free = subs.filter((s) => planById(s.plan_id)?.slug === "free").length;
  const paid = total - free;
  const active = subs.filter((s) => s.status === "active").length;
  const expired = subs.filter((s) => s.status === "expired").length;
  const suspended = subs.filter((s) => s.status === "suspended").length;
  const renewalsDue = subs.filter((s) => s.ends_at && new Date(s.ends_at) <= new Date(Date.now() + 7 * 86400000) && s.status === "active").length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const sumPaid = (rows: History[]) => rows.filter((h) => ["upgraded", "renewed"].includes(h.event_type)).reduce((acc, h) => acc + Number(h.amount ?? 0), 0);
  const monthly = sumPaid(history.filter((h) => new Date(h.created_at) >= monthStart));
  const annual = sumPaid(history.filter((h) => new Date(h.created_at) >= yearStart));
  const lifetime = sumPaid(history);
  const mrr = subs.reduce((acc, s) => {
    const p = planById(s.plan_id);
    if (!p || s.status !== "active") return acc;
    const amt = s.billing_interval === "yearly" ? Number(p.yearly_price ?? 0) / 12 : Number(p.price ?? 0);
    return acc + amt;
  }, 0);
  const arr = mrr * 12;

  const visible = subs.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const p = profiles[s.coach_id];
    return (p?.full_name ?? "").toLowerCase().includes(q) || (p?.email ?? "").toLowerCase().includes(q);
  });

  const sweep = async () => {
    setSweeping(true);
    const sb: any = supabase;
    const { error } = await sb.rpc("sweep_expired_subscriptions");
    setSweeping(false);
    if (error) return toast({ title: "Sweep failed", description: error.message, variant: "destructive" });
    toast({ title: "Sweep complete", description: "Expired subscriptions processed." });
    load();
  };

  const stat = (label: string, value: string | number, Icon: any) => (
    <Card><CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Subscription Management</h2>
          <p className="text-sm text-muted-foreground">Monitor MRR, renewals, and subscriber lifecycle.</p>
        </div>
        <Button variant="outline" size="sm" onClick={sweep} disabled={sweeping}>
          <RefreshCcw className="h-4 w-4 mr-1" /> {sweeping ? "Running..." : "Run expiry sweep"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {stat("Active Subscribers", active, Users)}
        {stat("Free Users", free, Users)}
        {stat("Paid Users", paid, Users)}
        {stat("Renewals Due (7d)", renewalsDue, TrendingUp)}
        {stat("Expired / Suspended", expired + suspended, AlertTriangle)}
        {stat("MRR", money(Math.round(mrr)), IndianRupee)}
        {stat("ARR", money(Math.round(arr)), IndianRupee)}
        {stat("Monthly Revenue", money(monthly), IndianRupee)}
        {stat("Annual Revenue", money(annual), IndianRupee)}
        {stat("Lifetime Revenue", money(lifetime), IndianRupee)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscribers</CardTitle>
          <CardDescription>Filter by coach name or email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search coach..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />
          {loading ? <div className="text-center text-muted-foreground py-8">Loading...</div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Starts</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead>Auto-renew</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((s) => {
                    const p = planById(s.plan_id);
                    const prof = profiles[s.coach_id];
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{prof?.full_name ?? s.coach_id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">{prof?.email ?? "—"}</div>
                        </TableCell>
                        <TableCell>{p?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                        <TableCell>{s.billing_interval ?? "—"}</TableCell>
                        <TableCell className="text-sm">{fmtDate(s.starts_at)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(s.ends_at)}</TableCell>
                        <TableCell>{s.auto_renewal ? "On" : "Off"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
