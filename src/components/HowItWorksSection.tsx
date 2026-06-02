import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus, Search, CreditCard, Share2,
  Upload, BarChart3, Globe,
  Users, DollarSign, GraduationCap, Briefcase,
  BookOpen, Star, ChevronRight, ArrowRight,
} from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";

/* ── one-time counter (no blinking, runs once on first view) ── */
const AnimCounter = ({
  end, prefix = "", suffix = "", decimals = 0,
}: { end: number; prefix?: string; suffix?: string; decimals?: number }) => {
  const [val, setVal] = useState(0);
  const ranRef = useRef(false);
  const nodeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || ranRef.current) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !ranRef.current) {
          ranRef.current = true;
          ob.disconnect();
          const duration = 1100;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setVal(end * eased);
            if (t < 1) requestAnimationFrame(tick);
            else setVal(end);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    ob.observe(node);
    return () => ob.disconnect();
  }, [end]);

  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return <span ref={nodeRef}>{prefix}{display}{suffix}</span>;
};

/* ── step card with timeline connector ── */
const StepCard = ({
  num, icon: Icon, title, bullets, onClick, isLast,
}: {
  num: number;
  icon: React.ElementType;
  title: string;
  bullets: string[];
  onClick?: () => void;
  isLast?: boolean;
}) => (
  <div className="relative">
    <div
      onClick={onClick}
      className={`group relative h-full rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-7 transition-all duration-300 hover:border-primary/60 hover:shadow-[0_12px_40px_-12px_hsl(72_100%_50%/0.35)] hover:-translate-y-1 ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* step number */}
      <div className="absolute -top-4 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-extrabold text-primary-foreground shadow-lg ring-4 ring-background">
        {num}
      </div>

      {/* icon */}
      <div className="mb-5 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 transition-transform duration-300 group-hover:scale-105">
        <Icon className="h-7 w-7 text-primary" />
      </div>

      <h4 className="mb-3 text-xl font-bold text-foreground tracking-tight">{title}</h4>
      <ul className="space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[15px] leading-relaxed text-foreground/75">
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>

    {/* connector arrow — desktop only, hide on last */}
    {!isLast && (
      <div className="pointer-events-none absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 sm:block lg:-right-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-background shadow-md">
          <ArrowRight className="h-4 w-4 text-primary" />
        </div>
      </div>
    )}
  </div>
);

/* ── stat card (clean SaaS) ── */
const StatCard = ({
  icon: Icon, label, value, prefix = "", suffix = "", decimals = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) => (
  <div className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-md p-5 transition-all duration-300 hover:border-primary/40 hover:bg-card/90">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
    <p className="text-3xl font-extrabold tracking-tight text-foreground">
      <AnimCounter end={value} prefix={prefix} suffix={suffix} decimals={decimals} />
    </p>
  </div>
);

/* ── mini dashboards (static, no blinking) ── */
const LearnerDashboardPreview = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-border/80 bg-card/50 backdrop-blur-md p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("howItWorks.referralDashboard")}</p>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">LIVE</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon={Users} label={t("howItWorks.totalReferred")} value={48} />
        <StatCard icon={GraduationCap} label={t("howItWorks.totalEnrolled")} value={32} />
        <StatCard icon={DollarSign} label={t("howItWorks.commissionEarned")} value={1250} prefix="$" />
      </div>
      {/* static bars */}
      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        <div className="flex items-end gap-1.5 h-20">
          {[35, 55, 40, 70, 60, 85, 75, 90, 65, 80, 95, 88].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-gradient-to-t from-primary/40 to-primary"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{t("howItWorks.monthlyReferral")}</p>
      </div>
    </div>
  );
};

const CoachDashboardPreview = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-border/80 bg-card/50 backdrop-blur-md p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("howItWorks.coachDashboard")}</p>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={Users} label={t("howItWorks.totalEnrollments")} value={214} />
        <StatCard icon={DollarSign} label={t("howItWorks.revenueGenerated")} value={8420} prefix="$" />
        <StatCard icon={BookOpen} label={t("howItWorks.coursesPublished")} value={6} />
        <StatCard icon={Star} label={t("howItWorks.avgRating")} value={4.8} decimals={1} />
      </div>
      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        <svg viewBox="0 0 200 60" className="w-full h-16" preserveAspectRatio="none">
          <defs>
            <linearGradient id="coachGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(72,100%,50%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(72,100%,50%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,50 Q20,45 40,40 T80,30 T120,25 T160,15 T200,10 V60 H0 Z" fill="url(#coachGrad)" />
          <path d="M0,50 Q20,45 40,40 T80,30 T120,25 T160,15 T200,10" fill="none" stroke="hsl(72,100%,50%)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">{t("howItWorks.revenueGrowth")}</p>
      </div>
    </div>
  );
};

/* ── tab button ── */
const TabButton = ({
  icon: Icon, label, subtitle, active, onClick,
}: {
  icon: React.ElementType;
  label: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`relative flex items-center gap-4 rounded-2xl border-2 px-6 py-4 text-left transition-all duration-300 w-full sm:w-auto sm:min-w-[280px]
      ${active
        ? "border-primary bg-primary/10 shadow-[0_8px_30px_-8px_hsl(72_100%_50%/0.5)]"
        : "border-border bg-card/60 hover:border-primary/50 hover:bg-card"
      }`}
  >
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div className="flex-1">
      <p className="text-lg font-bold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    {active && <div className="absolute -bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-primary" />}
  </button>
);

/* ── main section ── */
const HowItWorksSection = () => {
  const [activeTab, setActiveTab] = useState<"learner" | "coach">("learner");
  const { t } = useTranslation();
  const navigate = useNavigate();

  const learnerSteps = [
    { icon: UserPlus, title: t("howItWorks.learner.step1.title"), bullets: [t("howItWorks.learner.step1.b1"), t("howItWorks.learner.step1.b2"), t("howItWorks.learner.step1.b3")], onClick: () => navigate("/auth?mode=signup") },
    { icon: Search, title: t("howItWorks.learner.step2.title"), bullets: [t("howItWorks.learner.step2.b1"), t("howItWorks.learner.step2.b2"), t("howItWorks.learner.step2.b3")], onClick: () => navigate("/courses") },
    { icon: CreditCard, title: t("howItWorks.learner.step3.title"), bullets: [t("howItWorks.learner.step3.b1"), t("howItWorks.learner.step3.b2"), t("howItWorks.learner.step3.b3")], onClick: () => navigate("/courses") },
    { icon: Share2, title: t("howItWorks.learner.step4.title"), bullets: [t("howItWorks.learner.step4.b1"), t("howItWorks.learner.step4.b2"), t("howItWorks.learner.step4.b3")], onClick: () => navigate("/auth?mode=signup") },
  ];

  const coachSteps = [
    { icon: Briefcase, title: t("howItWorks.coach.step1.title"), bullets: [t("howItWorks.coach.step1.b1"), t("howItWorks.coach.step1.b2"), t("howItWorks.coach.step1.b3")], onClick: () => navigate("/auth?mode=signup&role=coach") },
    { icon: Upload, title: t("howItWorks.coach.step2.title"), bullets: [t("howItWorks.coach.step2.b1"), t("howItWorks.coach.step2.b2"), t("howItWorks.coach.step2.b3")], onClick: () => navigate("/auth?mode=signup&role=coach") },
    { icon: Globe, title: t("howItWorks.coach.step3.title"), bullets: [t("howItWorks.coach.step3.b1"), t("howItWorks.coach.step3.b2"), t("howItWorks.coach.step3.b3")], onClick: () => navigate("/auth?mode=signup&role=coach") },
    { icon: BarChart3, title: t("howItWorks.coach.step4.title"), bullets: [t("howItWorks.coach.step4.b1"), t("howItWorks.coach.step4.b2"), t("howItWorks.coach.step4.b3")], onClick: () => navigate("/auth?mode=signup&role=coach") },
  ];

  const steps = activeTab === "learner" ? learnerSteps : coachSteps;

  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        {/* header */}
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block rounded-full border border-border bg-secondary px-4 py-1 text-xs font-medium text-muted-foreground">
            {t("howItWorks.badge")}
          </span>
          <h2 className="mb-3 text-3xl font-extrabold text-foreground sm:text-5xl tracking-tight">
            {t("howItWorks.title")} <span className="text-gradient-lime">{t("howItWorks.titleHighlight")}</span>
          </h2>
          <p className="mx-auto max-w-xl text-base sm:text-lg text-muted-foreground">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mb-14">
          <TabButton
            icon={GraduationCap}
            label={t("howItWorks.forLearners")}
            subtitle={t("howItWorks.forLearnersSubtitle")}
            active={activeTab === "learner"}
            onClick={() => setActiveTab("learner")}
          />
          <TabButton
            icon={Briefcase}
            label={t("howItWorks.forCoaches")}
            subtitle={t("howItWorks.forCoachesSubtitle")}
            active={activeTab === "coach"}
            onClick={() => setActiveTab("coach")}
          />
        </div>

        {/* steps timeline */}
        <div key={activeTab} className="mx-auto max-w-7xl">
          <div className="relative grid gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <StepCard
                key={s.title}
                num={i + 1}
                icon={s.icon}
                title={s.title}
                bullets={s.bullets}
                onClick={s.onClick}
                isLast={i === steps.length - 1}
              />
            ))}
          </div>

          {/* dashboard preview */}
          <div className="mt-14 mx-auto max-w-4xl">
            {activeTab === "learner" ? <LearnerDashboardPreview /> : <CoachDashboardPreview />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
