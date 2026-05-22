import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles, X, Zap } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCoachPlan } from "@/hooks/useCoachPlan";
import { UPGRADE_EVENT, type UpgradeTrigger } from "@/lib/upgradeModal";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billing_interval: string;
  highlight: boolean;
  sort_order: number;
}

const COMPARE_FEATURES = [
  { key: "courses_access", label: "Course Builder" },
  { key: "workshops_access", label: "Webinars & Workshops" },
  { key: "blueprint_access", label: "Blueprint Workspace" },
  { key: "materials_access", label: "Materials Library" },
  { key: "feed_access", label: "Social Feed" },
  { key: "contact_access", label: "Learner Contacts" },
  { key: "messaging_access", label: "Email & WhatsApp Campaigns" },
  { key: "paid_content_access", label: "Paid Content" },
  { key: "profile_picture_access", label: "Branded Profile" },
  { key: "crm_access", label: "CRM & Clients" },
  { key: "automations_access", label: "Automations" },
  { key: "copilot_access", label: "AI Copilot" },
];

export const PlanUpgradeModal = () => {
  const { plan: currentPlan } = useCoachPlan();
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<UpgradeTrigger | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [bundles, setBundles] = useState<Record<string, Record<string, boolean>>>({});
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<UpgradeTrigger>).detail;
      setTrigger(detail);
      setOpen(true);
    };
    window.addEventListener(UPGRADE_EVENT, handler);
    return () => window.removeEventListener(UPGRADE_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open || plans.length) return;
    (async () => {
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("id, name, slug, price, currency, billing_interval, highlight, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      const { data: bundleData } = await supabase
        .from("feature_bundles")
        .select("slug, feature_flags")
        .eq("is_active", true);
      setPlans((plansData as Plan[]) || []);
      const map: Record<string, Record<string, boolean>> = {};
      (bundleData || []).forEach((b: any) => {
        const planSlug = b.slug.replace(/-bundle$/, "");
        map[planSlug] = b.feature_flags || {};
      });
      setBundles(map);
    })();
  }, [open, plans.length]);

  const recommended = trigger?.recommended || "pro";
  const usagePct = trigger?.used != null && trigger?.limit
    ? Math.min(100, Math.round((trigger.used / trigger.limit) * 100))
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <div className="relative">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-card px-6 pb-6 pt-8">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Upgrade your plan
              </div>
              <h2 className="mt-3 font-display text-2xl font-bold text-foreground">
                {trigger?.reason || "Unlock more on AICoachPortal"}
              </h2>
              {trigger?.detail && (
                <p className="mt-1 text-sm text-muted-foreground">{trigger.detail}</p>
              )}
              {usagePct !== null && (
                <div className="mt-4 max-w-md">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{trigger?.label || "Usage"}</span>
                    <span>{trigger?.used} / {trigger?.limit}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${usagePct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex justify-center pt-5">
            <div className="inline-flex rounded-full border border-border bg-card/40 p-1 text-xs">
              {(["monthly", "yearly"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`rounded-full px-4 py-1.5 font-medium capitalize transition-colors ${
                    cycle === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c} {c === "yearly" && <span className="ml-1 text-[10px] opacity-80">−20%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div className="grid gap-3 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.filter((p) => p.slug !== "free").map((p) => {
              const isRecommended = p.slug === recommended || (p.slug === "pro" && recommended === "pro");
              const isCurrent = p.slug === currentPlan;
              const monthlyPrice = Number(p.price);
              const displayPrice = cycle === "yearly" ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border p-4 transition-all ${
                    isRecommended
                      ? "border-primary/50 bg-primary/[0.04] shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.4)]"
                      : "border-border/60 bg-card/40"
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Recommended
                    </span>
                  )}
                  <p className="font-display text-lg font-bold text-foreground">{p.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.slug === "premium" ? "For scaling coaches" : p.slug === "corporate" ? "Teams & agencies" : "Get started"}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-foreground">₹{displayPrice.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-muted-foreground">/{cycle === "yearly" ? "mo billed yearly" : "mo"}</span>
                  </div>
                  {isCurrent ? (
                    <Button variant="outline" disabled className="mt-4 w-full">Current plan</Button>
                  ) : (
                    <Button asChild className="mt-4 w-full gap-1.5" variant={isRecommended ? "default" : "outline"}>
                      <Link to="/coach/subscription" onClick={() => setOpen(false)}>
                        <Zap className="h-3.5 w-3.5" /> Choose {p.name}
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Compare */}
          <div className="border-t border-border/60 px-6 py-6">
            <p className="mb-3 font-display text-sm font-semibold text-foreground">Compare features</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    {plans.map((p) => (
                      <th key={p.id} className="px-2 py-2 text-center font-medium">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FEATURES.map((f) => (
                    <tr key={f.key} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-foreground">{f.label}</td>
                      {plans.map((p) => {
                        const enabled = bundles[p.slug]?.[f.key];
                        return (
                          <td key={p.id} className="px-2 py-2 text-center">
                            {enabled ? (
                              <Check className="mx-auto h-3.5 w-3.5 text-primary" />
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanUpgradeModal;
