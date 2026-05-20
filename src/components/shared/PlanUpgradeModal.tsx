import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Crown, Rocket, Sparkles, X, Infinity as InfinityIcon, ArrowRight, Star } from "lucide-react";
import { useUpgradeModalEvents } from "@/hooks/usePlanGuard";
import { useCoachPlan } from "@/hooks/useCoachPlan";

interface Plan {
  id: string; name: string; slug: string; description: string | null;
  price: number; currency: string; billing_interval: string;
  sort_order: number; highlight: boolean;
}
interface FeatureControl {
  feature_key: string; global_enabled: boolean;
  free_enabled: boolean; pro_enabled: boolean; premium_enabled: boolean;
}
interface FeatureRow { id: string; feature_key: string; name: string; category: string | null; }

const tierFromSlug = (s: string): "free" | "pro" | "premium" => {
  const x = (s || "").toLowerCase();
  if (x.includes("premium") || x.includes("enterprise") || x.includes("scale")) return "premium";
  if (x.includes("pro") || x.includes("growth") || x.includes("starter")) return "pro";
  return "free";
};

const moneyPrefix = (c: string) => (c === "USD" ? "$" : c === "INR" ? "₹" : `${c} `);

/**
 * Global plan-upgrade dialog. Mounted once at app root; listens for events
 * fired by openUpgradeModal() and renders a full plan comparison with
 * contextual reason + smart recommendation.
 */
const PlanUpgradeModal = () => {
  const { trigger, close } = useUpgradeModalEvents();
  const { plan: currentTier } = useCoachPlan();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [controls, setControls] = useState<Record<string, FeatureControl>>({});
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    (async () => {
      const [{ data: p }, { data: fm }, { data: fc }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("features_master").select("id,feature_key,name,category").eq("is_active", true).order("sort_order").limit(12),
        supabase.from("feature_controls").select("feature_key,global_enabled,free_enabled,pro_enabled,premium_enabled"),
      ]);
      setPlans((p as Plan[]) || []);
      setFeatures((fm as FeatureRow[]) || []);
      const m: Record<string, FeatureControl> = {};
      ((fc as FeatureControl[]) || []).forEach((c) => { m[c.feature_key] = c; });
      setControls(m);
    })();
  }, [trigger]);

  const recommended = useMemo(() => {
    if (!plans.length) return null;
    const need = trigger?.requiredTier || "pro";
    return plans.find((p) => tierFromSlug(p.slug) === need) || plans.find((p) => p.highlight) || plans[1] || plans[0];
  }, [plans, trigger]);

  if (!trigger) return null;

  const cell = (k: string, tier: "free" | "pro" | "premium") => {
    const c = controls[k];
    if (!c?.global_enabled) return <X className="h-3.5 w-3.5 text-muted-foreground/50 mx-auto" />;
    const on = tier === "premium" ? c.premium_enabled : tier === "pro" ? c.pro_enabled : c.free_enabled;
    return on ? <Check className="h-3.5 w-3.5 text-primary mx-auto" /> : <X className="h-3.5 w-3.5 text-muted-foreground/50 mx-auto" />;
  };

  const goToUpgrade = () => {
    close();
    navigate("/coach/upgrade-plan");
  };

  return (
    <Dialog open={!!trigger} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2"><Crown className="h-5 w-5 text-primary" /></div>
            <div>
              <DialogTitle className="text-xl">
                {trigger.featureName ? `Unlock ${trigger.featureName}` : "Upgrade your plan"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {trigger.reason || "Choose a plan that fits your growth and unlock premium features instantly."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {trigger.usage && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.05] p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{trigger.usage.label}</span>
              <span className="text-muted-foreground">{trigger.usage.used} / {trigger.usage.limit}</span>
            </div>
            <Progress value={Math.min(100, (trigger.usage.used / trigger.usage.limit) * 100)} className="h-2" />
          </div>
        )}

        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-full border border-border/50 bg-card/40 p-1">
            {(["monthly", "yearly"] as const).map((c) => (
              <button key={c} onClick={() => setYearly(c === "yearly")}
                className={`px-4 py-1.5 text-xs rounded-full transition ${(yearly ? "yearly" : "monthly") === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {c[0].toUpperCase() + c.slice(1)} {c === "yearly" && <span className="ml-1 opacity-80">−20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.slice(0, 3).map((p) => {
            const tier = tierFromSlug(p.slug);
            const isCurrent = tier === currentTier;
            const isRecommended = recommended?.id === p.id;
            const price = yearly ? Math.round(p.price * 12 * 0.8) : p.price;
            return (
              <div key={p.id} className={`relative rounded-2xl border p-4 transition ${isRecommended ? "border-primary shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)] bg-primary/[0.03]" : "border-border/50"}`}>
                {isRecommended && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" /> Recommended
                  </div>
                )}
                <h3 className="font-bold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 min-h-[2rem] line-clamp-2">{p.description}</p>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {moneyPrefix(p.currency)}{price.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground">/{yearly ? "yr" : p.billing_interval}</span>
                </p>
                <Button size="sm" disabled={isCurrent}
                  variant={isRecommended ? "default" : "outline"}
                  className={`w-full mt-3 gap-1 ${isRecommended ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                  onClick={goToUpgrade}>
                  {isCurrent ? "Current Plan" : <><Rocket className="h-3.5 w-3.5" /> Choose {p.name}</>}
                </Button>
              </div>
            );
          })}
        </div>

        {features.length > 0 && (
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-foreground">
                <tr>
                  <th className="text-left p-2.5 font-semibold">Feature</th>
                  <th className="p-2.5 font-semibold">Free</th>
                  <th className="p-2.5 font-semibold text-primary">Pro</th>
                  <th className="p-2.5 font-semibold">Premium</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.id} className="border-t border-border/40">
                    <td className="p-2.5 text-foreground">{f.name}</td>
                    <td className="p-2.5 text-center">{cell(f.feature_key, "free")}</td>
                    <td className="p-2.5 text-center bg-primary/[0.04]">{cell(f.feature_key, "pro")}</td>
                    <td className="p-2.5 text-center">{cell(f.feature_key, "premium")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3 text-primary" /> Limited-time: 20% off annual</Badge>
          <Button onClick={goToUpgrade} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            See all plans <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanUpgradeModal;
