import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
  Crown, Sparkles, Lock, Check, X, Infinity as InfinityIcon, Rocket, Zap, TrendingUp,
  Calendar, CreditCard, Gauge, ArrowRight, ShieldCheck, Star, Info, BarChart3, Receipt,
} from "lucide-react";

interface Plan {
  id: string; name: string; slug: string; description: string | null;
  price: number; currency: string; billing_interval: string;
  sort_order: number; is_active: boolean; highlight: boolean;
}
interface Bundle { id: string; name: string; slug: string; plan_id: string | null; feature_flags: any; }
interface Subscription { id?: string; plan_id: string | null; bundle_id: string | null; status: string; starts_at?: string; ends_at?: string | null; }
interface FeatureMaster { id: string; feature_key: string; name: string; description: string | null; category: string | null; sort_order: number; }
interface FeatureControl { feature_key: string; global_enabled: boolean; free_enabled: boolean; pro_enabled: boolean; premium_enabled: boolean; free_usage_limit: number | null; pro_usage_limit: number | null; premium_usage_limit: number | null; }

const TAB_BY_PATH: Record<string, string> = {
  "/coach/subscription": "current",
  "/coach/plan-features": "features",
  "/coach/upgrade-plan": "upgrade",
  "/coach/usage-limits": "usage",
  "/coach/billing-history": "billing",
};

const TIER_FROM_SLUG = (slug: string): "free" | "pro" | "premium" => {
  const s = (slug || "").toLowerCase();
  if (s.includes("premium") || s.includes("enterprise") || s.includes("corporate")) return "premium";
  if (s.includes("pro") || s.includes("starter") || s.includes("growth")) return "pro";
  return "free";
};

const fmtPrice = (p: Plan) =>
  `${p.currency === "USD" ? "$" : p.currency === "INR" ? "₹" : p.currency + " "}${p.price.toLocaleString()}`;

const CoachSubscription = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>(TAB_BY_PATH[location.pathname] || "current");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [features, setFeatures] = useState<FeatureMaster[]>([]);
  const [controls, setControls] = useState<Record<string, FeatureControl>>({});
  const [usage, setUsage] = useState({ courses: 0, learners: 0, leads: 0, webinars: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTab(TAB_BY_PATH[location.pathname] || "current"); }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: b }, { data: s }, { data: fm }, { data: fc }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("feature_bundles").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("coach_subscriptions").select("*").eq("coach_id", user.id).maybeSingle(),
        supabase.from("features_master").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("feature_controls").select("*"),
      ]);

      const [{ count: cCount }, { count: eCount }, { count: lCount }, { count: wCount }] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("coach_leads").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("webinars").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
      ]);

      setPlans((p as Plan[]) || []);
      setBundles((b as Bundle[]) || []);
      setSub((s as Subscription) || null);
      setFeatures((fm as FeatureMaster[]) || []);
      const map: Record<string, FeatureControl> = {};
      ((fc as FeatureControl[]) || []).forEach((c) => { map[c.feature_key] = c; });
      setControls(map);
      setUsage({ courses: cCount || 0, learners: eCount || 0, leads: lCount || 0, webinars: wCount || 0 });
      setLoading(false);
    })();
  }, [user]);

  const currentPlan = useMemo(() => plans.find((p) => p.id === sub?.plan_id) || null, [plans, sub]);
  const currentBundle = useMemo(() => bundles.find((b) => b.id === sub?.bundle_id) || null, [bundles, sub]);
  const tier = useMemo(() => TIER_FROM_SLUG(currentBundle?.slug || currentPlan?.slug || "free"), [currentBundle, currentPlan]);

  const featuresByCategory = useMemo(() => {
    const g: Record<string, FeatureMaster[]> = {};
    features.forEach((f) => {
      const k = f.category || "General";
      (g[k] ||= []).push(f);
    });
    return g;
  }, [features]);

  const limitsCatalog = useMemo(() => ([
    { key: "courses", label: "Courses Created", used: usage.courses, limit: tier === "premium" ? null : tier === "pro" ? 25 : 5, icon: Rocket },
    { key: "learners", label: "Active Learners", used: usage.learners, limit: tier === "premium" ? null : tier === "pro" ? 5000 : 500, icon: TrendingUp },
    { key: "leads", label: "Leads in Pipeline", used: usage.leads, limit: tier === "premium" ? null : tier === "pro" ? 10000 : 1000, icon: BarChart3 },
    { key: "webinars", label: "Webinars Hosted", used: usage.webinars, limit: tier === "premium" ? null : tier === "pro" ? 50 : 5, icon: Calendar },
  ]), [usage, tier]);

  const onTab = (v: string) => {
    setTab(v);
    const path = Object.entries(TAB_BY_PATH).find(([, t]) => t === v)?.[0];
    if (path && path !== location.pathname) navigate(path);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-card/40 border border-border/40" />)}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Subscription Suite</p>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Crown className="h-7 w-7 text-primary" /> My Plan & Billing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your subscription, track usage, and unlock premium growth tools.
            </p>
          </div>
        </header>

        <Tabs value={tab} onValueChange={onTab}>
          <TabsList className="bg-card/40 border border-border/50 backdrop-blur p-1 h-auto flex-wrap">
            <TabsTrigger value="current" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">My Subscription</TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Plan Features</TabsTrigger>
            <TabsTrigger value="upgrade" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Upgrade Plan</TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Usage & Limits</TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Billing History</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "current" && (
          <CurrentPlanView
            plan={currentPlan} bundle={currentBundle} tier={tier} sub={sub}
            limits={limitsCatalog} onUpgrade={() => onTab("upgrade")}
          />
        )}

        {tab === "features" && (
          <PlanFeaturesView
            featuresByCategory={featuresByCategory} controls={controls} tier={tier}
            onUpgrade={() => onTab("upgrade")}
          />
        )}

        {tab === "upgrade" && (
          <UpgradeView
            plans={plans} bundles={bundles} features={features} controls={controls}
            currentTier={tier} billingCycle={billingCycle} setBillingCycle={setBillingCycle}
          />
        )}

        {tab === "usage" && <UsageView limits={limitsCatalog} tier={tier} onUpgrade={() => onTab("upgrade")} />}

        {tab === "billing" && <BillingView />}
      </div>
    </TooltipProvider>
  );
};

/* ─────────── Current Plan ─────────── */
const CurrentPlanView = ({ plan, bundle, tier, sub, limits, onUpgrade }: any) => {
  const pct = (n: number, d: number | null) => d ? Math.min(100, Math.round((n / d) * 100)) : 0;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 relative overflow-hidden border-primary/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/15 text-primary border border-primary/30">{tier.toUpperCase()}</Badge>
                {plan?.highlight && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> Most Popular</Badge>}
                <Badge variant="outline" className="capitalize">{sub?.status || "Active"}</Badge>
              </div>
              <h2 className="text-2xl font-bold text-foreground">{plan?.name || "Free Starter"}</h2>
              <p className="text-sm text-muted-foreground mt-1">{plan?.description || bundle?.name || "Get started with core coaching features."}</p>
              {plan && (
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {fmtPrice(plan)}
                  <span className="text-sm font-normal text-muted-foreground">/{plan.billing_interval}</span>
                </p>
              )}
              {sub?.ends_at && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Renews {new Date(sub.ends_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button onClick={onUpgrade} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]">
              <Rocket className="h-4 w-4" /> Upgrade Plan
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {limits.map((l: any) => {
              const Icon = l.icon;
              const p = pct(l.used, l.limit);
              return (
                <div key={l.key} className="rounded-xl border border-border/50 bg-background/40 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className="h-3.5 w-3.5" />{l.label}</div>
                  <p className="text-lg font-semibold text-foreground">{l.used}<span className="text-xs text-muted-foreground">/{l.limit ?? "∞"}</span></p>
                  {l.limit && <Progress value={p} className="h-1.5 mt-2" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="font-semibold text-foreground">Why upgrade?</h3></div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Unlimited learners & webinars</li>
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> AI Agents & WhatsApp automation</li>
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> White-label & custom domain</li>
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Priority human + AI support</li>
          </ul>
          <Button variant="outline" className="w-full mt-2 gap-2" onClick={onUpgrade}>
            See plans <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─────────── Plan Features (with locked overlay) ─────────── */
const PlanFeaturesView = ({ featuresByCategory, controls, tier, onUpgrade }: any) => {
  const enabledForTier = (k: string) => {
    const c = controls[k];
    if (!c || !c.global_enabled) return false;
    return tier === "premium" ? c.premium_enabled : tier === "pro" ? c.pro_enabled : c.free_enabled;
  };
  const requiredTier = (k: string): "pro" | "premium" | null => {
    const c = controls[k];
    if (!c) return null;
    if (c.pro_enabled) return "pro";
    if (c.premium_enabled) return "premium";
    return null;
  };

  return (
    <div className="space-y-6">
      {Object.entries(featuresByCategory).map(([cat, items]: any) => (
        <Card key={cat}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground capitalize flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> {cat}
              </h3>
              <Badge variant="outline" className="text-xs">{(items as any[]).length} features</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(items as FeatureMaster[]).map((f) => {
                const enabled = enabledForTier(f.feature_key);
                const need = requiredTier(f.feature_key);
                return (
                  <div key={f.id} className={`relative rounded-xl border p-4 transition group ${enabled ? "border-primary/30 bg-primary/[0.04] hover:border-primary/60" : "border-border/50 bg-card/40"}`}>
                    {!enabled && <div className="absolute inset-0 rounded-xl bg-background/40 backdrop-blur-[1px] pointer-events-none" />}
                    <div className="relative">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {enabled ? <Check className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                          <p className="font-medium text-foreground text-sm">{f.name}</p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs"><p className="text-xs">{f.description || f.name}</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{f.description}</p>
                      {enabled ? (
                        <Badge className="bg-primary/15 text-primary border border-primary/30">Included</Badge>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs capitalize">Available in {need || "Pro"}</Badge>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={onUpgrade}>Upgrade</Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
      {Object.keys(featuresByCategory).length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No features configured yet.</CardContent></Card>
      )}
    </div>
  );
};

/* ─────────── Upgrade / Pricing ─────────── */
const UpgradeView = ({ plans, bundles, features, controls, currentTier, billingCycle, setBillingCycle }: any) => {
  const yearly = billingCycle === "yearly";
  const cell = (k: string, tier: "free" | "pro" | "premium") => {
    const c: FeatureControl | undefined = controls[k];
    if (!c || !c.global_enabled) return <X className="h-4 w-4 text-muted-foreground/50 mx-auto" />;
    const on = tier === "premium" ? c.premium_enabled : tier === "pro" ? c.pro_enabled : c.free_enabled;
    const limit = tier === "premium" ? c.premium_usage_limit : tier === "pro" ? c.pro_usage_limit : c.free_usage_limit;
    if (!on) return <X className="h-4 w-4 text-muted-foreground/50 mx-auto" />;
    if (limit == null) return <InfinityIcon className="h-4 w-4 text-primary mx-auto" />;
    return <span className="text-sm text-foreground">{limit.toLocaleString()}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full border border-border/50 bg-card/40 p-1">
          {(["monthly", "yearly"] as const).map((c) => (
            <button key={c} onClick={() => setBillingCycle(c)}
              className={`px-4 py-1.5 text-sm rounded-full transition ${billingCycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {c[0].toUpperCase() + c.slice(1)} {c === "yearly" && <span className="text-xs ml-1 opacity-80">save 20%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p: Plan) => {
          const tier = TIER_FROM_SLUG(p.slug);
          const isCurrent = currentTier === tier;
          const displayPrice = yearly ? Math.round(p.price * 12 * 0.8) : p.price;
          const interval = yearly ? "yr" : p.billing_interval;
          return (
            <Card key={p.id} className={`relative overflow-hidden transition hover:-translate-y-1 ${p.highlight ? "border-primary shadow-[0_0_40px_-12px_hsl(var(--primary)/0.5)]" : "border-border/50"}`}>
              {p.highlight && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-bl-xl">Most Popular</div>
              )}
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 min-h-[2.5rem]">{p.description}</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {p.currency === "USD" ? "$" : p.currency === "INR" ? "₹" : ""}{displayPrice.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">/{interval}</span>
                  </p>
                  {yearly && <p className="text-xs text-primary mt-1">Save 20% billed yearly</p>}
                </div>
                <Button
                  className={`w-full gap-2 ${p.highlight ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                  variant={p.highlight ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => toast({ title: isCurrent ? "Already on this plan" : "Upgrade request sent", description: isCurrent ? "" : "Our team will contact you shortly to complete your upgrade." })}
                >
                  {isCurrent ? <><ShieldCheck className="h-4 w-4" /> Current Plan</> : <><Rocket className="h-4 w-4" /> Upgrade to {p.name}</>}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-4 font-semibold text-foreground">Compare features</th>
                <th className="p-4 font-semibold text-foreground">Free</th>
                <th className="p-4 font-semibold text-primary">Pro</th>
                <th className="p-4 font-semibold text-foreground">Premium</th>
              </tr>
            </thead>
            <tbody>
              {features.slice(0, 24).map((f: FeatureMaster) => (
                <tr key={f.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-4">
                    <p className="font-medium text-foreground">{f.name}</p>
                    {f.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{f.description}</p>}
                  </td>
                  <td className="p-4 text-center">{cell(f.feature_key, "free")}</td>
                  <td className="p-4 text-center bg-primary/5">{cell(f.feature_key, "pro")}</td>
                  <td className="p-4 text-center">{cell(f.feature_key, "premium")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="text-sm uppercase tracking-wider text-primary">AI Recommendation</p></div>
            <h3 className="text-lg font-bold text-foreground mt-1">Upgrade to Pro and automate learner onboarding — save 40+ hours/month.</h3>
            <p className="text-sm text-muted-foreground mt-1">Based on your current usage, Pro unlocks WhatsApp Automation, AI Agents, and Unlimited Webinars.</p>
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Rocket className="h-4 w-4" /> Recommended: Pro
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─────────── Usage & Limits ─────────── */
const UsageView = ({ limits, tier, onUpgrade }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {limits.map((l: any) => {
      const Icon = l.icon;
      const p = l.limit ? Math.min(100, Math.round((l.used / l.limit) * 100)) : 0;
      const warn = p >= 80;
      return (
        <Card key={l.key} className={warn ? "border-primary/40" : ""}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
                <div><p className="font-medium text-foreground">{l.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tier} plan</p></div>
              </div>
              {warn && <Badge className="bg-primary/15 text-primary border border-primary/30">High usage</Badge>}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{l.used.toLocaleString()} used</span>
                <span className="text-foreground font-medium">{l.limit ? `${l.limit.toLocaleString()} limit` : "Unlimited"}</span>
              </div>
              {l.limit ? <Progress value={p} className="h-2" /> : <div className="h-2 rounded bg-primary/30" />}
            </div>
            {warn && (
              <Button size="sm" variant="outline" className="w-full gap-2" onClick={onUpgrade}>
                <Gauge className="h-4 w-4" /> Upgrade for more
              </Button>
            )}
          </CardContent>
        </Card>
      );
    })}
  </div>
);

/* ─────────── Billing History ─────────── */
const BillingView = () => (
  <Card>
    <CardContent className="p-10 text-center space-y-3">
      <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit"><Receipt className="h-6 w-6 text-primary" /></div>
      <h3 className="font-semibold text-foreground">No invoices yet</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Once you upgrade, all invoices, payment receipts and GST documents will appear here for one-click download.
      </p>
      <Button variant="outline" className="gap-2"><CreditCard className="h-4 w-4" /> Add payment method</Button>
    </CardContent>
  </Card>
);

export default CoachSubscription;
