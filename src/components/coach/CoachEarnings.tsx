import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  IndianRupee, TrendingUp, Clock, ArrowUpRight, Users, RefreshCw,
  BookOpen, Video, Lock, Wallet, Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import GlobalDateRangePicker, { useDateRange } from "@/components/shared/GlobalDateRangePicker";
import { Button } from "@/components/ui/button";

const USD_TO_INR_FALLBACK = 83.5;

const useExchangeRate = () => {
  const [rate, setRate] = useState<number>(USD_TO_INR_FALLBACK);
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => { if (data?.rates?.INR) setRate(data.rates.INR); })
      .catch(() => {});
  }, []);
  return { rate };
};

const CoachEarnings = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [commissionPercent, setCommissionPercent] = useState<number | null>(null);
  const [defaultCommission, setDefaultCommission] = useState<number>(20);
  const [webinarCommPercent, setWebinarCommPercent] = useState<number | null>(null);
  const [defaultWebinarComm, setDefaultWebinarComm] = useState<number>(1);
  const [webinarRegCount, setWebinarRegCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { rate: usdToInr } = useExchangeRate();
  const { dateRange, setDateRange } = useDateRange("last30");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("enrollments").select("*, courses(title, price_usd, price_inr)").eq("coach_id", user.id),
      supabase.from("payouts").select("*").eq("coach_id", user.id).order("requested_at", { ascending: false }),
      supabase.from("coach_commissions").select("commission_percent").eq("coach_id", user.id).maybeSingle(),
      supabase.from("platform_settings").select("value").eq("key", "commission_percent").single(),
      supabase.from("coach_webinar_commissions").select("commission_percent").eq("coach_id", user.id).maybeSingle(),
      supabase.from("platform_settings").select("value").eq("key", "webinar_commission_percent").single(),
      supabase.from("webinars").select("id").eq("coach_id", user.id),
    ]).then(async ([e, po, cc, ps, wcc, wps, wbs]) => {
      setEnrollments(e.data || []);
      setPayouts(po.data || []);
      if (cc.data) setCommissionPercent(cc.data.commission_percent);
      if (ps.data) setDefaultCommission(Number(ps.data.value) || 20);
      if (wcc.data) setWebinarCommPercent(wcc.data.commission_percent);
      if (wps.data) setDefaultWebinarComm(Number(wps.data.value) || 1);
      if (wbs.data?.length) {
        const { count } = await supabase.from("webinar_registrations").select("id", { count: "exact", head: true }).in("webinar_id", wbs.data.map(w => w.id));
        setWebinarRegCount(count || 0);
      }
      setLoading(false);
    });
  }, [user]);

  const activeCommission = commissionPercent ?? defaultCommission;
  const activeWebinarComm = webinarCommPercent ?? defaultWebinarComm;

  const paidEnrollments = enrollments.filter((e) => e.payment_status === "paid");

  let rawUSD = 0, rawINR = 0;
  let courseCommUSD = 0, courseCommINR = 0;
  let webCommUSD = 0, webCommINR = 0;

  paidEnrollments.forEach((e) => {
    const course = e.courses as any;
    if (e.currency === "USD") {
      const price = Number(course?.price_usd || 0);
      rawUSD += price;
      courseCommUSD += price * (activeCommission / 100);
      webCommUSD += price * (activeWebinarComm / 100);
    } else {
      const price = Number(course?.price_inr || 0);
      rawINR += price;
      courseCommINR += price * (activeCommission / 100);
      webCommINR += price * (activeWebinarComm / 100);
    }
  });

  const combinedTotalINR = (rawUSD * usdToInr) + rawINR;
  const totalCommissionINR = (courseCommUSD + webCommUSD) * usdToInr + courseCommINR + webCommINR;
  const netDueINR = combinedTotalINR - totalCommissionINR;

  const totalPaidOut = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);

  const requestPayout = async () => {
    if (!user || combinedTotalINR <= 0) return;
    setRequesting(true);
    const { error } = await supabase.from("payouts").insert({ coach_id: user.id, amount: combinedTotalINR });
    setRequesting(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Payout requested" });
      const { data } = await supabase.from("payouts").select("*").eq("coach_id", user.id).order("requested_at", { ascending: false });
      setPayouts(data || []);
    }
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  const earningsByCourse = Object.entries(
    paidEnrollments.reduce((acc: Record<string, { usd: number; inr: number; count: number }>, e) => {
      const course = e.courses as any;
      const title = course?.title || "Unknown";
      if (!acc[title]) acc[title] = { usd: 0, inr: 0, count: 0 };
      acc[title].count++;
      if (e.currency === "USD") acc[title].usd += Number(course?.price_usd || 0);
      else acc[title].inr += Number(course?.price_inr || 0);
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-6">
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/30">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Earnings & Billing</h2>
              <p className="text-sm text-muted-foreground">Track revenue, commissions, and request withdrawals</p>
            </div>
          </div>
          <GlobalDateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>

      {/* Net Due Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_55%)] pointer-events-none" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Net Due to You
            </div>
            <p className="text-5xl font-bold text-foreground tabular-nums">₹{netDueINR.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              From ₹{combinedTotalINR.toFixed(0)} gross • ₹{totalCommissionINR.toFixed(0)} platform fee
            </p>
          </div>
          <div className="flex md:justify-end">
            <Button
              onClick={requestPayout}
              disabled={requesting || combinedTotalINR <= 0}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <ArrowUpRight className="h-4 w-4" />
              {requesting ? "Requesting..." : "Request Withdrawal"}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Paid Enrollments", value: paidEnrollments.length, icon: Users, color: "text-primary", accent: "from-primary/20 to-transparent" },
          { label: "Total Earnings", value: `₹${combinedTotalINR.toFixed(0)}`, icon: IndianRupee, color: "text-emerald-400", accent: "from-emerald-500/20 to-transparent" },
          { label: "Commission", value: `₹${totalCommissionINR.toFixed(0)}`, icon: TrendingUp, color: "text-yellow-400", accent: "from-yellow-500/20 to-transparent" },
          { label: "Net Due", value: `₹${netDueINR.toFixed(0)}`, icon: Wallet, color: "text-emerald-400", accent: "from-emerald-500/20 to-transparent" },
          { label: "1 USD = INR", value: `₹${usdToInr.toFixed(2)}`, icon: RefreshCw, color: "text-muted-foreground", accent: "from-muted/40 to-transparent" },
        ].map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
              <div className={`absolute inset-0 bg-gradient-to-br ${m.accent} opacity-50 pointer-events-none`} />
              <div className="relative">
                <Icon className={`h-5 w-5 ${m.color} mb-2`} />
                <p className={`text-xl font-bold text-foreground tabular-nums`}>{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Commission Breakdown */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Commission Breakdown</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/15 border border-primary/30 p-2"><BookOpen className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Course Commission</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{commissionPercent !== null ? "Custom rate" : "Default rate"} • {activeCommission}%</p>
                </div>
              </div>
              <p className="text-base font-bold text-foreground tabular-nums">₹{((courseCommUSD * usdToInr) + courseCommINR).toFixed(0)}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/15 border border-blue-500/30 p-2"><Video className="h-4 w-4 text-blue-400" /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Webinar Commission</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{webinarCommPercent !== null ? "Custom rate" : "Default rate"} • {activeWebinarComm}%</p>
                </div>
              </div>
              <p className="text-base font-bold text-foreground tabular-nums">₹{((webCommUSD * usdToInr) + webCommINR).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Split */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Course Enrollments", value: paidEnrollments.length, icon: BookOpen, color: "text-primary" },
          { label: "Webinar Registrations", value: webinarRegCount, icon: Video, color: "text-blue-400" },
          { label: "Total Paid Out", value: `$${totalPaidOut.toFixed(0)}`, icon: Clock, color: "text-yellow-400" },
        ].map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <Icon className={`h-5 w-5 ${m.color} mx-auto mb-2`} />
              <p className="text-lg font-bold text-foreground tabular-nums">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Payment Notice */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-3">
        <Lock className="h-5 w-5 text-yellow-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Payment status is managed by admin</p>
          <p className="text-xs text-muted-foreground">You cannot edit payment status once updated. Contact admin for changes.</p>
        </div>
      </div>

      {/* Course-wise breakdown */}
      {earningsByCourse.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Earnings by Course</h3>
          <div className="space-y-2">
            {earningsByCourse.map(([title, val]) => {
              const data = val as { usd: number; inr: number; count: number };
              return (
                <div key={title} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3 gap-2 hover:border-primary/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{data.count} paid enrollment{data.count > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {data.usd > 0 && <span className="text-sm font-semibold text-foreground tabular-nums">${data.usd.toFixed(2)}</span>}
                    {data.inr > 0 && <span className="text-sm font-semibold text-foreground tabular-nums">₹{data.inr.toFixed(2)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payout History */}
      {payouts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Payout History</h3>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
                <span className="text-sm font-semibold text-foreground tabular-nums">${Number(p.amount).toFixed(2)}</span>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>{p.status}</span>
                  <span className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachEarnings;
