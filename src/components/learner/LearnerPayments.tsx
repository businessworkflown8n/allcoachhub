import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import GlobalDateRangePicker, { useDateRange } from "@/components/shared/GlobalDateRangePicker";

const LearnerPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { dateRange, setDateRange, dateFrom, dateTo } = useDateRange("last30");

  useEffect(() => {
    if (!user) return;
    supabase.from("payments").select("*, enrollments(courses(title))").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setPayments(data || []);
      setLoading(false);
    });
  }, [user]);

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const d = p.created_at?.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [payments, dateFrom, dateTo]);

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Payment History</h2>
        <GlobalDateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No payments found for this period</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-foreground">{(p.enrollments as any)?.courses?.title || "—"}</TableCell>
                  <TableCell className="text-foreground">{p.currency} {Number(p.amount)}{Number(p.refunded_amount || 0) > 0 && <span className="ml-1 text-xs text-red-400">(−{Number(p.refunded_amount).toFixed(2)})</span>}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.status === "paid" ? "bg-green-500/20 text-green-400"
                      : p.status === "refunded" ? "bg-red-500/20 text-red-400"
                      : p.status === "partially_refunded" ? "bg-orange-500/20 text-orange-400"
                      : "bg-yellow-500/20 text-yellow-400"
                    }`}>{p.status}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {p.razorpay_payment_id ? (
                      <Link to={`/invoice/${p.razorpay_payment_id}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <FileText className="h-3.5 w-3.5" /> View
                      </Link>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
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

export default LearnerPayments;
