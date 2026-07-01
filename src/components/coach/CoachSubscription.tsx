import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Crown, Calendar, CreditCard, Download, XCircle, RefreshCcw, ArrowUp, ArrowDown } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  yearly_price: number | null;
  yearly_discount_percent: number | null;
  monthly_billing_enabled: boolean | null;
  yearly_billing_enabled: boolean | null;
  currency: string | null;
  payment_method: string | null;
  payment_link_url: string | null;
  highlight: boolean | null;
  feature_summary: Record<string, unknown> | null;
  is_active: boolean | null;
  sort_order: number | null;
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
  pending_plan_id: string | null;
  pending_billing_interval: string | null;
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
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const money = (n?: number | null, c?: string | null) =>
  n == null ? "—" : `${c === "USD" ? "$" : "₹"}${Number(n).toLocaleString()}`;

const computeYearly = (plan: Plan) => {
  const monthly = Number(plan.price ?? 0);
  const discount = Number(plan.yearly_discount_percent ?? 20);
  if (plan.yearly_price && plan.yearly_price > 0) {
    return { yearly: Number(plan.yearly_price), normalYearly: monthly * 12, discount };
  }
  return { yearly: Math.round(monthly * 12 * (1 - discount / 100)), normalYearly: monthly * 12, discount };
};

export default function CoachSubscription() {
  const { user } = useAuth();
  const { openCheckout, loading: checkoutLoading } = useRazorpayCheckout();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [downgradeTarget, setDowngradeTarget] = useState<Plan | null>(null);

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
  const currentOrder = currentPlan?.sort_order ?? -1;
  const pendingPlan = plans.find((p) => p.id === sub?.pending_plan_id) ?? null;

  const doUpgrade = async (plan: Plan) => {
    if (!user) return;
    const method = plan.payment_method ?? "razorpay_api";
    const { yearly } = computeYearly(plan);
    const amt = interval === "yearly" ? yearly : Number(plan.price ?? 0);

    if (method === "free" || amt <= 0) {
      toast({ title: "Free plan", description: "Cancel your current paid plan to move to Free." });
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
    await openCheckout({
      kind: "subscription",
      planId: plan.id,
      billingInterval: interval,
      currency: "INR",
      prefill: { email: user.email ?? "" },
      onSuccess: () => load(),
    });
  };

  const confirmDowngrade = async () => {
    if (!downgradeTarget) return;
    const sb: any = supabase;
    const { error } = await sb.rpc("schedule_plan_change", {
      _plan_id: downgradeTarget.id,
      _billing_interval: interval,
    });
    setDowngradeTarget(null);
    if (error) return toast({ title: "Downgrade failed", description: error.message, variant: "destructive" });
    toast({
      title: "Downgrade scheduled",
      description: "You'll keep your current plan until the end of the billing cycle.",
    });
    load();
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
              {sub?.ends_at && <span className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />Next billing / Ends: {fmtDate(sub.ends_at)}</span>}
              {sub?.auto_renewal != null && <span className="text-xs">Auto-renew: {sub.auto_renewal ? "On" : "Off"}</span>}
            </CardDescription>
            {pendingPlan && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Scheduled downgrade to <strong>{pendingPlan.name}</strong> at end of current cycle.
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {sub && sub.status === "active" && currentPlan && currentPlan.slug !== "free" && (
              <Button variant="outline" size="sm" onClick={handleCancel}><XCircle className="h-4 w-4 mr-1" /> Cancel</Button>
            )}
            <Button size="sm" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
              <RefreshCcw className="h-4 w-4 mr-1" /> Change Plan
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Plans grid */}
      <Card id="plans-section">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Switch to yearly billing and save 20%.</CardDescription>
          </div>
          <Tabs value={interval} onValueChange={(v) => setInterval(v as any)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly · Save 20%</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id;
              const order = plan.sort_order ?? 0;
              const relation: "current" | "upgrade" | "downgrade" =
                isCurrent ? "current" : order > currentOrder ? "upgrade" : "downgrade";
              const { yearly, normalYearly, discount } = computeYearly(plan);
              const price = interval === "yearly" ? yearly : Number(plan.price ?? 0);
              const savings = normalYearly - yearly;
              const fs = (plan.feature_summary ?? {}) as Record<string, any>;
              const monthlyEnabled = plan.monthly_billing_enabled !== false;
              const yearlyEnabled = plan.yearly_billing_enabled !== false;
              const cycleAllowed = interval === "monthly" ? monthlyEnabled : yearlyEnabled;

              const cta = (() => {
                if (isCurrent) return { label: "Current Plan", variant: "outline" as const, disabled: true };
                if (!cycleAllowed) return { label: `${interval} billing disabled`, variant: "outline" as const, disabled: true };
                if (relation === "upgrade") return { label: "Upgrade", variant: plan.highlight ? "default" as const : "default" as const, disabled: false };
                return { label: "Downgrade", variant: "outline" as const, disabled: false };
              })();

              return (
                <Card key={plan.id} className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-md" : ""}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">Popular</div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs px-2 py-0.5 rounded">Active</div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{plan.name}</span>
                      {relation === "upgrade" && !isCurrent && <ArrowUp className="h-4 w-4 text-primary" />}
                      {relation === "downgrade" && !isCurrent && <ArrowDown className="h-4 w-4 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-2">
                      {price === 0 ? (
                        <div className="text-3xl font-bold">Free</div>
                      ) : (
                        <>
                          {interval === "yearly" && normalYearly > yearly && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="line-through text-muted-foreground">{inr(normalYearly)}</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                                Save {discount}%
                              </Badge>
                            </div>
                          )}
                          <div className="text-3xl font-bold">
                            {money(price, plan.currency)}
                            <span className="text-sm text-muted-foreground font-normal">
                              /{interval === "yearly" ? "yr" : "mo"}
                            </span>
                          </div>
                          {interval === "yearly" && savings > 0 && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              You save {inr(savings)} per year
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-1.5 text-sm mb-4 flex-1">
                      {fs.ai_credits != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.ai_credits)} AI credits</li>}
                      {fs.storage != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.storage)} storage</li>}
                      {fs.whatsapp_credits != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.whatsapp_credits)} WhatsApp credits</li>}
                      {fs.courses_limit != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> {String(fs.courses_limit)} courses</li>}
                      {fs.website != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Website: {String(fs.website)}</li>}
                      {fs.automations != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Automations: {String(fs.automations)}</li>}
                      {fs.certificates != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Certificates: {String(fs.certificates)}</li>}
                      {fs.support != null && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Support: {String(fs.support)}</li>}
                    </ul>
                    <Button
                      className="w-full"
                      disabled={cta.disabled || checkoutLoading}
                      variant={cta.variant}
                      onClick={() => {
                        if (relation === "downgrade") setDowngradeTarget(plan);
                        else doUpgrade(plan);
                      }}
                    >
                      {checkoutLoading ? "Please wait..." : cta.label}
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

      {/* Downgrade confirmation */}
      <AlertDialog open={!!downgradeTarget} onOpenChange={(o) => !o && setDowngradeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Downgrade to {downgradeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will be downgraded at the end of the current billing cycle.
              You will continue to enjoy your current plan ({currentPlan?.name ?? "current"}) until it expires
              {sub?.ends_at ? ` on ${fmtDate(sub.ends_at)}` : ""}.
              No immediate feature changes will happen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade}>Confirm Downgrade</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
