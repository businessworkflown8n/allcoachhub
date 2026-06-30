import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Crown, Calendar, CreditCard, Download, XCircle, RefreshCcw } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  yearly_price: number | null;
  currency: string | null;
  payment_method: string | null;
  payment_link_url: string | null;
  highlight: boolean | null;
  feature_summary: Record<string, unknown> | null;
  is_active: boolean | null;
};

type Subscription = {
  id: string;
  coach_id: string;
  plan_id: string | null;
  status: string;
  starts_at: string;
  ends_at: string | null;
  billing_interval: string | null;
  auto_renewal: boolean | null;
  grace_until: string | null;
  cancelled_at: string | null;
};

type HistoryRow = {
  id: string;
  event_type: string;
  billing_interval: string | null;
  amount: number | null;
  currency: string | null;
  invoice_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  to_plan_id: string | null;
};

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
const money = (n?: number | null, c?: string | null) =>
  n == null ? "—" : `${c === "USD" ? "$" : "₹"}${Number(n).toLocaleString()}`;

export default function CoachSubscription() {
  const { user } = useAuth();
  const { openCheckout, loading: checkoutLoading } = useRazorpayCheckout();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const sb: any = supabase;
    const [{ data: p }, { data: s }, { data: h }] = await Promise.all([
      sb.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      sb.from("coach_subscriptions").select("*").eq("coach_id", user.id).maybeSingle(),
      sb.from("subscription_history").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setPlans((p ?? []) as Plan[]);
    setSub((s ?? null) as Subscription | null);
    setHistory((h ?? []) as HistoryRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const currentPlan = useMemo(
    () => plans.find((p) => p.id === sub?.plan_id) ?? null,
    [plans, sub]
  );

  const handleUpgrade = async (plan: Plan) => {
    if (!user) return;
    const method = plan.payment_method ?? "razorpay_api";
    if (method === "free") {
      toast({ title: "Free plan", description: "You can switch to free by cancelling your current paid plan." });
      return;
    }
    if (method === "payment_link" || method === "external") {
      if (!plan.payment_link_url) {
        toast({ title: "Not configured", description: "Admin has not set a payment link for this plan.", variant: "destructive" });
        return;
      }
      window.open(plan.payment_link_url, "_blank");
      return;
    }
    if (method === "manual" || method === "bank_transfer") {
      toast({ title: "Manual payment", description: "Please contact admin to complete payment for this plan." });
      return;
    }
    // razorpay_api / razorpay_subscription / stripe / paypal — currently route through Razorpay checkout
    const amt = interval === "yearly" ? plan.yearly_price : plan.price;
    if (!amt || amt <= 0) {
      toast({ title: "Price not set", description: `No ${interval} price configured for this plan.`, variant: "destructive" });
      return;
    }
    await openCheckout({
      kind: "subscription",
      planId: plan.id,
      billingInterval: interval,
      currency: "INR",
      prefill: { email: user.email ?? "" },
      onSuccess: () => load(),
    });
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your current subscription? You will keep access until the end of the billing period.")) return;
    const sb: any = supabase;
    const { error } = await sb.rpc("cancel_my_subscription");
    if (error) return toast({ title: "Cancellation failed", description: error.message, variant: "destructive" });
    toast({ title: "Subscription cancelled" });
    load();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default", trialing: "secondary", canceled: "outline", expired: "destructive", suspended: "destructive",
    };
    return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">Loading subscription...</div>;

  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Current Plan: {currentPlan?.name ?? "Free"}
            </CardTitle>
            <CardDescription className="flex items-center gap-3 mt-2 flex-wrap">
              {sub && statusBadge(sub.status)}
              {sub?.billing_interval && <span className="text-xs"><CreditCard className="h-3 w-3 inline mr-1" />{sub.billing_interval}</span>}
              {sub?.ends_at && <span className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />Renews / Ends: {fmtDate(sub.ends_at)}</span>}
              {sub?.auto_renewal != null && <span className="text-xs">Auto-renew: {sub.auto_renewal ? "On" : "Off"}</span>}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {sub && sub.status === "active" && currentPlan && currentPlan.slug !== "free" && (
              <Button variant="outline" size="sm" onClick={handleCancel}><XCircle className="h-4 w-4 mr-1" /> Cancel</Button>
            )}
            <Button size="sm" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
              <RefreshCcw className="h-4 w-4 mr-1" /> Upgrade / Change Plan
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Plans grid */}
      <Card id="plans-section">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Choose a plan that fits your coaching business.</CardDescription>
          </div>
          <Tabs value={interval} onValueChange={(v) => setInterval(v as any)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id;
              const price = interval === "yearly" ? plan.yearly_price : plan.price;
              const fs = (plan.feature_summary ?? {}) as Record<string, any>;
              return (
                <Card key={plan.id} className={`relative ${plan.highlight ? "border-primary shadow-md" : ""}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">Popular</div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{plan.name}</span>
                      {isCurrent && <Badge>Current</Badge>}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="text-3xl font-bold pt-2">
                      {price == null || price === 0 ? "Free" : money(price, plan.currency)}
                      {price ? <span className="text-sm text-muted-foreground font-normal">/{interval === "yearly" ? "yr" : "mo"}</span> : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5 text-sm mb-4">
                      {fs.ai_credits != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.ai_credits)} AI credits</li>}
                      {fs.storage != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.storage)} storage</li>}
                      {fs.whatsapp_credits != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.whatsapp_credits)} WhatsApp credits</li>}
                      {fs.courses_limit != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.courses_limit)} courses</li>}
                      {fs.website != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Website / funnel: {String(fs.website)}</li>}
                      {fs.automations != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Automations: {String(fs.automations)}</li>}
                      {fs.certificates != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Certificates: {String(fs.certificates)}</li>}
                      {fs.community != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Community: {String(fs.community)}</li>}
                      {fs.support != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Support: {String(fs.support)}</li>}
                    </ul>
                    <Button
                      className="w-full"
                      disabled={isCurrent || checkoutLoading}
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan)}
                    >
                      {isCurrent ? "Current Plan" : checkoutLoading ? "Please wait..." : (price == null || price === 0) ? "Switch to Free" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All subscription events and invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">No subscription history yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => {
                    const planName = plans.find((p) => p.id === h.to_plan_id)?.name ?? "—";
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">{fmtDate(h.created_at)}</TableCell>
                        <TableCell><Badge variant="outline">{h.event_type}</Badge></TableCell>
                        <TableCell>{planName}</TableCell>
                        <TableCell>{h.billing_interval ?? "—"}</TableCell>
                        <TableCell>{money(h.amount, h.currency)}</TableCell>
                        <TableCell>
                          {h.razorpay_payment_id ? (
                            <a href={`/invoice/${h.razorpay_payment_id}`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="ghost"><Download className="h-4 w-4 mr-1" />{h.invoice_id ?? "Invoice"}</Button>
                            </a>
                          ) : h.invoice_id ?? "—"}
                        </TableCell>
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
