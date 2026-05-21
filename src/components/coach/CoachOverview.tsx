import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Users, Video, UserCheck, DollarSign, IndianRupee, ChevronDown, ChevronUp, Rocket, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useCoachFeatures } from "@/hooks/useCoachFeatures";
import GrowthTools from "./GrowthTools";
import ProfileStrengthMeter from "./ProfileStrengthMeter";
import AIClientMatching from "./AIClientMatching";
import CoachLockedFeatures from "./CoachLockedFeatures";
import CoachCategoryCounts from "./CoachCategoryCounts";

const USD_TO_INR_FALLBACK = 83.5;

const CoachOverview = () => {
  const { user } = useAuth();
  const features: any = useCoachFeatures();
  const [stats, setStats] = useState({ courses: 0, enrollments: 0, webinars: 0, registrations: 0 });
  const [loading, setLoading] = useState(true);

  // Payable state
  const [payableData, setPayableData] = useState({
    courseCommissionUSD: 0,
    courseCommissionINR: 0,
    webinarCommissionUSD: 0,
    webinarCommissionINR: 0,
    courseCommissionPercent: 20,
    webinarCommissionPercent: 1,
  });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [usdToInr, setUsdToInr] = useState(USD_TO_INR_FALLBACK);

  useEffect(() => {
    if (!user) return;

    // Fetch exchange rate
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => { if (data?.rates?.INR) setUsdToInr(data.rates.INR); })
      .catch(() => {});

    const fetchAll = async () => {
      // Stats
      const [coursesRes, enrollmentsRes, webinarsRes, regsRes] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("webinars").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("webinars").select("id").eq("coach_id", user.id).then(async ({ data: wbs }) => {
          if (!wbs?.length) return { count: 0 };
          const { count } = await supabase
            .from("webinar_registrations")
            .select("id", { count: "exact", head: true })
            .in("webinar_id", wbs.map((w) => w.id));
          return { count: count || 0 };
        }),
      ]);
      setStats({
        courses: coursesRes.count || 0,
        enrollments: enrollmentsRes.count || 0,
        webinars: webinarsRes.count || 0,
        registrations: regsRes.count || 0,
      });

      // Payable calculation
      const [enrollData, courseCommRes, defaultCommRes, webinarCommCoachRes, defaultWebinarCommRes] = await Promise.all([
        supabase.from("enrollments").select("*, courses(price_usd, price_inr)").eq("coach_id", user.id).eq("payment_status", "paid"),
        supabase.from("coach_commissions").select("commission_percent").eq("coach_id", user.id).maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "commission_percent").single(),
        supabase.from("coach_webinar_commissions").select("commission_percent").eq("coach_id", user.id).maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "webinar_commission_percent").single(),
      ]);

      const courseComm = courseCommRes.data?.commission_percent ?? Number(defaultCommRes.data?.value || 20);
      const webinarComm = webinarCommCoachRes.data?.commission_percent ?? Number(defaultWebinarCommRes.data?.value || 1);

      // Course commission
      let cUSD = 0, cINR = 0;
      (enrollData.data || []).forEach((e: any) => {
        const course = e.courses as any;
        if (e.currency === "USD") {
          cUSD += Number(course?.price_usd || 0) * (courseComm / 100);
        } else {
          cINR += Number(course?.price_inr || 0) * (courseComm / 100);
        }
      });

      // Webinar commission calculated based on course fees
      let wUSD = 0, wINR = 0;
      (enrollData.data || []).forEach((e: any) => {
        const course = e.courses as any;
        if (e.currency === "USD") {
          wUSD += Number(course?.price_usd || 0) * (webinarComm / 100);
        } else {
          wINR += Number(course?.price_inr || 0) * (webinarComm / 100);
        }
      });

      setPayableData({
        courseCommissionUSD: cUSD,
        courseCommissionINR: cINR,
        webinarCommissionUSD: wUSD,
        webinarCommissionINR: wINR,
        courseCommissionPercent: courseComm,
        webinarCommissionPercent: webinarComm,
      });

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const cards = [
    { label: "Total Courses", value: stats.courses, icon: BookOpen, color: "text-primary" },
    { label: "Students Enrolled", value: stats.enrollments, icon: Users, color: "text-green-500" },
    { label: "Total Webinars", value: stats.webinars, icon: Video, color: "text-blue-500" },
    { label: "Webinar Registrations", value: stats.registrations, icon: UserCheck, color: "text-orange-500" },
  ];

  const totalPayableUSD = payableData.courseCommissionUSD + payableData.webinarCommissionUSD + (payableData.courseCommissionINR + payableData.webinarCommissionINR) / usdToInr;
  const totalPayableINR = (payableData.courseCommissionUSD + payableData.webinarCommissionUSD) * usdToInr + payableData.courseCommissionINR + payableData.webinarCommissionINR;

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-emerald-500/5 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold mb-2">Coach Workspace</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-display tracking-tight">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">Your business at a glance — students, content, earnings, and AI-powered growth tools.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold text-primary">Live</span>
          </div>
        </div>
      </div>

      {features.blueprint_access !== false && (
        <Link to="/coach/blueprint" className="group block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-emerald-500/5 p-6 hover:border-primary/60 transition-all hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/20 p-3 group-hover:scale-110 transition-transform"><Rocket className="h-6 w-6 text-primary" /></div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-display">Coach Blueprint Super App ✨</h3>
                <p className="text-sm text-muted-foreground mt-1">From idea → validated, revenue-generating coaching business in 10 AI-powered steps.</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* Premium Stat Cards with hover-lift */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.4)]"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</span>
                <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground font-display tracking-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total Payable to Admin */}
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground font-display text-lg">Total Payable to Admin (AiCoach Portal)</h3>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showBreakdown ? "Hide" : "View"} Breakdown
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Grand Total (USD)</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-display">${totalPayableUSD.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Grand Total (INR)</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-display">₹{totalPayableINR.toFixed(2)}</p>
          </div>
        </div>

        {showBreakdown && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Course Commission ({payableData.courseCommissionPercent}%)</p>
                <p className="text-xs text-muted-foreground">From paid course enrollments</p>
              </div>
              <div className="text-right">
                {payableData.courseCommissionUSD > 0 && <p className="text-sm font-semibold text-foreground">${payableData.courseCommissionUSD.toFixed(2)}</p>}
                {payableData.courseCommissionINR > 0 && <p className="text-sm font-semibold text-foreground">₹{payableData.courseCommissionINR.toFixed(2)}</p>}
                {payableData.courseCommissionUSD === 0 && payableData.courseCommissionINR === 0 && <p className="text-sm text-muted-foreground">$0.00</p>}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Webinar Commission ({payableData.webinarCommissionPercent}%)</p>
                <p className="text-xs text-muted-foreground">From paid webinar registrations</p>
              </div>
              <div className="text-right">
                {payableData.webinarCommissionUSD > 0 && <p className="text-sm font-semibold text-foreground">${payableData.webinarCommissionUSD.toFixed(2)}</p>}
                {payableData.webinarCommissionINR > 0 && <p className="text-sm font-semibold text-foreground">₹{payableData.webinarCommissionINR.toFixed(2)}</p>}
                {payableData.webinarCommissionUSD === 0 && payableData.webinarCommissionINR === 0 && <p className="text-sm text-muted-foreground">$0.00</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Courses by Category (includes Others fallback) */}
      <CoachCategoryCounts />

      {/* Profile Strength & AI Matching */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileStrengthMeter />
        <AIClientMatching />
      </div>

      <CoachLockedFeatures />

      <GrowthTools />
    </div>
  );
};

export default CoachOverview;
