import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, IndianRupee, TrendingUp, Clock, ArrowUpRight, Users, RefreshCw, BookOpen, Video, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import GlobalDateRangePicker, { useDateRange } from "@/components/shared/GlobalDateRangePicker";

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
      // Count webinar registrations
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">My Earnings & Performance</h2>
        <GlobalDateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <Users className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{paidEnrollments.length}</p>
          <p className="text-xs text-muted-foreground">Paid Enrollments</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <IndianRupee className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">₹{combinedTotalINR.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Total Earnings</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <TrendingUp className="h-5 w-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">₹{totalCommissionINR.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Commission Deducted</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <IndianRupee className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-green-400">₹{netDueINR.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Net Due to You</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-card p-4">
          <RefreshCw className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-lg font-bold text-foreground">1 USD = ₹{usdToInr.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Live Exchange Rate</p>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Commission Breakdown</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Course Commission ({activeCommission}%)</p>
                <p className="text-xs text-muted-foreground">{commissionPercent !== null ? "Custom rate" : "Default rate"}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">₹{((courseCommUSD * usdToInr) + courseCommINR).toFixed(0)}</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-foreground">Webinar Commission ({activeWebinarComm}%)</p>
                <p className="text-xs text-muted-foreground">{webinarCommPercent !== null ? "Custom rate" : "Default rate"}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">₹{((webCommUSD * usdToInr) + webCommINR).toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Performance Split */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <BookOpen className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-lg font-bold text-foreground">{paidEnrollments.length}</p>
          <p className="text-xs text-muted-foreground">Course Enrollments</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Video className="h-5 w-5 text-blue-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-foreground">{webinarRegCount}</p>
          <p className="text-xs text-muted-foreground">Webinar Registrations</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Clock className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-foreground">${totalPaidOut.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Total Paid Out</p>
        </div>
      </div>

      {/* Payment Status Notice */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-3">
        <Lock className="h-5 w-5 text-yellow-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Payment status is managed by admin</p>
          <p className="text-xs text-muted-foreground">You cannot edit payment status once updated. Contact admin for changes.</p>
        </div>
      </div>

      {/* Course-wise breakdown */}
      {paidEnrollments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Earnings by Course</h3>
          {Object.entries(
            paidEnrollments.reduce((acc: Record<string, { usd: number; inr: number; count: number }>, e) => {
              const course = e.courses as any;
              const title = course?.title || "Unknown";
              if (!acc[title]) acc[title] = { usd: 0, inr: 0, count: 0 };
              acc[title].count++;
              if (e.currency === "USD") acc[title].usd += Number(course?.price_usd || 0);
              else acc[title].inr += Number(course?.price_inr || 0);
              return acc;
            }, {})
          ).map(([title, val]) => {
            const data = val as { usd: number; inr: number; count: number };
            return (
            <div key={title} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border bg-card px-4 py-3 gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{data.count} paid enrollment{data.count > 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                {data.usd > 0 && <span className="text-sm font-semibold text-foreground">${data.usd.toFixed(2)}</span>}
                {data.inr > 0 && <span className="text-sm font-semibold text-foreground">₹{data.inr.toFixed(2)}</span>}
              </div>
            </div>
            );})}
        </div>
      )}

      <button onClick={requestPayout} disabled={requesting || combinedTotalINR <= 0} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50">
        <ArrowUpRight className="h-4 w-4" />
        {requesting ? "Requesting..." : "Request Withdrawal"}
      </button>

      {payouts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Payout History</h3>
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-foreground">${Number(p.amount).toFixed(2)}</span>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{p.status}</span>
                <span className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoachEarnings;
