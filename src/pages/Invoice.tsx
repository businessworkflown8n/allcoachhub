import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

const Invoice = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [buyer, setBuyer] = useState<any>(null);
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({ title: `Invoice ${paymentId}`, description: "Payment invoice", noIndex: true });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate(`/auth?redirect=/invoice/${paymentId}`); return; }
    if (!paymentId) return;

    (async () => {
      const { data: p, error: pErr } = await supabase
        .from("payments")
        .select("*, enrollments(course_id, full_name, email)")
        .or(`razorpay_payment_id.eq.${paymentId},id.eq.${paymentId}`)
        .maybeSingle();

      if (pErr || !p) { setError("Invoice not found or access denied"); setLoading(false); return; }
      setPayment(p);

      const enr = (p.enrollments as any) || {};
      const courseId = enr.course_id;
      if (courseId) {
        const { data: c } = await supabase.from("courses").select("title, coach_id, price_inr, price_usd").eq("id", courseId).maybeSingle();
        setCourse(c);
        if (c?.coach_id) {
          const { data: coachP } = await supabase.from("profiles").select("full_name, email, contact_number").eq("user_id", c.coach_id).maybeSingle();
          setCoach(coachP);
        }
      }

      const { data: bp } = await supabase.from("profiles").select("full_name, email, contact_number, country, city").eq("user_id", p.user_id).maybeSingle();
      setBuyer(bp);
      setLoading(false);
    })();
  }, [paymentId, user, authLoading, navigate]);

  if (loading || authLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (error || !payment) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-muted-foreground">{error ?? "Not found"}</p></div>;

  const currency = payment.currency || "INR";
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  const amount = Number(payment.amount || 0);
  const refunded = Number(payment.refunded_amount || 0);
  const tax = 0; // Tax-inclusive pricing assumed; adjust if needed
  const subtotal = amount - tax;
  const issuedAt = payment.paid_at || payment.created_at;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 print:bg-white print:pt-0">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
              <Download className="h-4 w-4" /> Save as PDF
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Coach Portal</h1>
              <p className="mt-1 text-sm text-muted-foreground">aicoachportal.com</p>
              <p className="text-sm text-muted-foreground">support@aicoachportal.com</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Invoice</p>
              <p className="mt-1 text-lg font-bold text-foreground">{payment.invoice_id || `INV-${paymentId?.slice(-8).toUpperCase()}`}</p>
              <p className="mt-1 text-xs text-muted-foreground">Issued {new Date(issuedAt).toLocaleDateString()}</p>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                payment.status === "paid" ? "bg-green-500/20 text-green-600"
                : payment.status === "refunded" ? "bg-red-500/20 text-red-600"
                : payment.status === "partially_refunded" ? "bg-yellow-500/20 text-yellow-700"
                : "bg-yellow-500/20 text-yellow-700"
              }`}>{payment.status?.replace("_", " ").toUpperCase()}</span>
            </div>
          </div>

          {/* Parties */}
          <div className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Billed To</p>
              <p className="mt-2 font-semibold text-foreground">{buyer?.full_name || (payment.enrollments as any)?.full_name || "Customer"}</p>
              <p className="text-sm text-muted-foreground">{buyer?.email || (payment.enrollments as any)?.email}</p>
              {buyer?.contact_number && <p className="text-sm text-muted-foreground">{buyer.contact_number}</p>}
              {(buyer?.city || buyer?.country) && <p className="text-sm text-muted-foreground">{[buyer?.city, buyer?.country].filter(Boolean).join(", ")}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Coach</p>
              <p className="mt-2 font-semibold text-foreground">{coach?.full_name || "—"}</p>
              <p className="text-sm text-muted-foreground">{coach?.email}</p>
            </div>
          </div>

          {/* Line items */}
          <div className="py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 text-foreground">{course?.title || "Course enrollment"}</td>
                  <td className="py-3 text-right text-foreground tabular-nums">{symbol}{subtotal.toFixed(2)}</td>
                </tr>
                {tax > 0 && (
                  <tr className="border-b border-border">
                    <td className="py-3 text-muted-foreground">Tax</td>
                    <td className="py-3 text-right text-foreground tabular-nums">{symbol}{tax.toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-4 text-right font-semibold text-foreground">Total</td>
                  <td className="py-4 text-right text-lg font-bold text-foreground tabular-nums">{symbol}{amount.toFixed(2)} {currency}</td>
                </tr>
                {refunded > 0 && (
                  <tr>
                    <td className="py-2 text-right text-sm text-muted-foreground">Refunded</td>
                    <td className="py-2 text-right text-sm text-red-500 tabular-nums">−{symbol}{refunded.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment meta */}
          <div className="grid gap-2 rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground sm:grid-cols-2">
            <div><span className="font-semibold text-foreground">Payment Method:</span> Razorpay</div>
            <div><span className="font-semibold text-foreground">Payment ID:</span> <span className="font-mono">{payment.razorpay_payment_id}</span></div>
            <div><span className="font-semibold text-foreground">Order ID:</span> <span className="font-mono">{payment.razorpay_order_id}</span></div>
            <div><span className="font-semibold text-foreground">Currency:</span> {currency}</div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            This is a system-generated invoice. For any queries, contact support@aicoachportal.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
