import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Download, Search, DollarSign, CheckCircle, XCircle, RotateCcw, FileText, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*, enrollments(full_name, email, courses(title))")
      .order("created_at", { ascending: false })
      .limit(1000);
    setPayments(data || []);

    const userIds = [...new Set((data || []).map((p: any) => p.user_id).filter(Boolean))];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name, email, contact_number")
        .in("user_id", userIds);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const enr = p.enrollments as any;
      const prof = profiles[p.user_id] || {};
      const matchSearch = !search || [
        p.razorpay_payment_id, p.razorpay_order_id, p.invoice_id,
        prof.email, prof.full_name, prof.contact_number,
        enr?.email, enr?.full_name, enr?.courses?.title,
      ].some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const d = p.created_at?.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return matchSearch && matchStatus;
    });
  }, [payments, profiles, search, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const succ = filtered.filter((p) => p.status === "paid");
    const fail = filtered.filter((p) => p.status === "failed" || p.status === "signature_failed");
    const pend = filtered.filter((p) => p.status === "pending" || p.status === "created");
    const ref = filtered.filter((p) => p.status === "refunded" || p.status === "partially_refunded");
    const revenue = succ.reduce((s, p) => s + Number(p.amount || 0), 0);
    const refunded = filtered.reduce((s, p) => s + Number(p.refunded_amount || 0), 0);
    return {
      successful: succ.length, failed: fail.length, pending: pend.length, refunds: ref.length,
      revenue, refunded,
    };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Date", "Invoice", "Order ID", "Payment ID", "Customer", "Email", "Phone", "Course", "Amount", "Currency", "Status", "Refunded"];
    const rows = filtered.map((p) => {
      const enr = p.enrollments as any;
      const prof = profiles[p.user_id] || {};
      return [
        new Date(p.created_at).toLocaleString(),
        p.invoice_id || "",
        p.razorpay_order_id || "",
        p.razorpay_payment_id || "",
        prof.full_name || enr?.full_name || "",
        prof.email || enr?.email || "",
        prof.contact_number || "",
        enr?.courses?.title || "",
        Number(p.amount || 0).toFixed(2),
        p.currency || "",
        p.status || "",
        Number(p.refunded_amount || 0).toFixed(2),
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const openRefund = (p: any) => {
    setRefundTarget(p);
    const remaining = Number(p.amount || 0) - Number(p.refunded_amount || 0);
    setRefundAmount(remaining.toFixed(2));
    setRefundReason("");
    setRefundOpen(true);
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    const { data, error } = await supabase.functions.invoke("razorpay-refund", {
      body: { payment_id: refundTarget.id, amount: Number(refundAmount), reason: refundReason || undefined },
    });
    setRefunding(false);
    if (error || !data?.success) {
      toast({ title: "Refund failed", description: error?.message || data?.error || "Try again", variant: "destructive" });
      return;
    }
    toast({ title: "Refund issued", description: `Status: ${data.new_status}` });
    setRefundOpen(false);
    fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Payment Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">All Razorpay transactions, refunds, and invoices</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/80 px-3 py-2 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Successful", value: stats.successful, icon: CheckCircle, color: "text-green-400" },
          { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-400" },
          { label: "Pending", value: stats.pending, icon: DollarSign, color: "text-yellow-400" },
          { label: "Refunds", value: stats.refunds, icon: RotateCcw, color: "text-orange-400" },
          { label: "Revenue (paid)", value: stats.revenue.toFixed(2), icon: DollarSign, color: "text-primary" },
          { label: "Refunded total", value: stats.refunded.toFixed(2), icon: RotateCcw, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by Order/Payment ID, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-72 rounded-xl border-border/50 bg-secondary/50 pl-9 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-border/50 bg-secondary/50 px-3 text-sm text-foreground">
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="signature_failed">Signature Failed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially Refunded</option>
        </select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-40 rounded-xl border-border/50 bg-secondary/50 text-sm" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-40 rounded-xl border-border/50 bg-secondary/50 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-16 text-center">
          <DollarSign className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No payments found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const enr = p.enrollments as any;
                const prof = profiles[p.user_id] || {};
                const canRefund = (p.status === "paid" || p.status === "partially_refunded") && p.razorpay_payment_id;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{p.invoice_id || "—"}</TableCell>
                    <TableCell className="text-sm text-foreground">
                      <div>{prof.full_name || enr?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{prof.email || enr?.email}</div>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{enr?.courses?.title || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.razorpay_payment_id || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {p.currency} {Number(p.amount).toFixed(2)}
                      {Number(p.refunded_amount || 0) > 0 && <div className="text-xs text-red-400">−{Number(p.refunded_amount).toFixed(2)}</div>}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === "paid" ? "bg-green-500/20 text-green-400"
                        : p.status === "refunded" ? "bg-red-500/20 text-red-400"
                        : p.status === "partially_refunded" ? "bg-orange-500/20 text-orange-400"
                        : p.status === "failed" || p.status === "signature_failed" ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                      }`}>{p.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.razorpay_payment_id && (
                          <Link to={`/invoice/${p.razorpay_payment_id}`} target="_blank" className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="View invoice">
                            <FileText className="h-4 w-4" />
                          </Link>
                        )}
                        {canRefund && (
                          <button onClick={() => openRefund(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-orange-400" title="Issue refund">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
          </DialogHeader>
          {refundTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <div className="text-muted-foreground">Payment ID</div>
                <div className="font-mono text-xs text-foreground">{refundTarget.razorpay_payment_id}</div>
                <div className="mt-2 text-muted-foreground">Original</div>
                <div className="text-foreground">{refundTarget.currency} {Number(refundTarget.amount).toFixed(2)}</div>
                <div className="mt-2 text-muted-foreground">Already refunded</div>
                <div className="text-foreground">{refundTarget.currency} {Number(refundTarget.refunded_amount || 0).toFixed(2)}</div>
              </div>
              <div className="space-y-1.5">
                <Label>Refund amount ({refundTarget.currency})</Label>
                <Input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Reason (optional)</Label>
                <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} placeholder="Why is this refund being issued?" />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setRefundOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
            <button onClick={submitRefund} disabled={refunding} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {refunding ? "Processing..." : "Confirm refund"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
