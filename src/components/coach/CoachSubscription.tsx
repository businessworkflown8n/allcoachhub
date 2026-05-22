import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, Zap, ShieldCheck, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachPlan } from "@/hooks/useCoachPlan";
import { Button } from "@/components/ui/button";
import { openUpgradeModal } from "@/lib/upgradeModal";
import { format } from "date-fns";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  highlight: boolean;
  sort_order: number;
}

interface Sub {
  status: string;
  starts_at: string;
  ends_at: string | null;
  feature_bundles: { name: string; slug: string; feature_flags: Record<string, boolean> } | null;
  subscription_plans: { name: string; slug: string; price: number; currency: string } | null;
}

const FEATURE_LABELS: Record<string, string> = {
  courses_access: "Course Builder",
  workshops_access: "Webinars & Workshops",
  blueprint_access: "Blueprint Workspace",
  materials_access: "Materials Library",
  feed_access: "Social Feed",
  contact_access: "Learner Contacts",
  messaging_access: "Email & WhatsApp Campaigns",
  paid_content_access: "Paid Content",
  profile_picture_access: "Branded Profile",
  crm_access: "CRM & Clients",
  automations_access: "Automations",
  copilot_access: "AI Copilot",
};

const CoachSubscription = () => {
  const { user } = useAuth();
  const { plan } = useCoachPlan();
  const [sub, setSub] = useState<Sub | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tab, setTab] = useState<"plan" | "billing">("plan");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("coach_subscriptions")
        .select(
          "status, starts_at, ends_at, feature_bundles(name, slug, feature_flags), subscription_plans(name, slug, price, currency)"
        )
        .eq("coach_id", user.id)
        .maybeSingle();
      setSub(data as any);
      const { data: pdata } = await supabase
        .from("subscription_plans")
        .select("id, name, slug, price, currency, highlight, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      setPlans((pdata as Plan[]) || []);
    })();
  }, [user]);

  const flags = sub?.feature_bundles?.feature_flags || {};
  const unlocked = Object.entries(FEATURE_LABELS).filter(([k]) => flags[k]);
  const locked = Object.entries(FEATURE_LABELS).filter(([k]) => !flags[k]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold text-foreground">My Subscription</h2>
        <p className="text-sm text-muted-foreground">Manage your plan, view usage, and unlock premium capabilities.</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-full border border-border bg-card/40 p-1 text-xs">
        {(["plan", "billing"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 font-medium capitalize transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "plan" ? "My Plan" : "Billing"}
          </button>
        ))}
      </div>

      {tab === "plan" ? (
        <>
          {/* Current plan card */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground capitalize">{sub?.subscription_plans?.name || plan}</p>
                {sub?.starts_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Active since {format(new Date(sub.starts_at), "MMM d, yyyy")}
                    {sub.ends_at && ` · Renews ${format(new Date(sub.ends_at), "MMM d, yyyy")}`}
                  </p>
                )}
              </div>
              <Button
                onClick={() => openUpgradeModal({ reason: "Explore upgrade options", recommended: plan === "free" ? "pro" : "premium" })}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Upgrade
              </Button>
            </div>
          </div>

          {/* Unlocked features */}
          <div>
            <p className="mb-3 font-display text-sm font-semibold text-foreground">Included in your plan</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unlocked.map(([k, label]) => (
                <div key={k} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">{label}</span>
                </div>
              ))}
              {unlocked.length === 0 && (
                <p className="text-sm text-muted-foreground">No features unlocked yet.</p>
              )}
            </div>
          </div>

          {/* Locked features */}
          {locked.length > 0 && (
            <div>
              <p className="mb-3 font-display text-sm font-semibold text-foreground">Unlock with an upgrade</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {locked.map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => openUpgradeModal({ reason: `${label} is locked`, featureKey: k, featureName: label, recommended: "pro" })}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/30 p-3 text-left text-sm transition-colors hover:border-primary/30 hover:bg-card/60"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Plan comparison */}
          <div>
            <p className="mb-3 font-display text-sm font-semibold text-foreground">Available plans</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {plans.filter((p) => p.slug !== "free").map((p) => {
                const isCurrent = p.slug === sub?.subscription_plans?.slug;
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-2xl border p-4 ${
                      p.highlight ? "border-primary/50 bg-primary/[0.04]" : "border-border/60 bg-card/40"
                    }`}
                  >
                    <p className="font-display text-base font-semibold text-foreground">{p.name}</p>
                    <p className="mt-2 font-display text-xl font-bold text-foreground">
                      ₹{Number(p.price).toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </p>
                    {isCurrent ? (
                      <Button variant="outline" disabled size="sm" className="mt-3">Current</Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={p.highlight ? "default" : "outline"}
                        className="mt-3 gap-1.5"
                        onClick={() => openUpgradeModal({ reason: `Switch to ${p.name}`, recommended: p.slug as any })}
                      >
                        <Zap className="h-3 w-3" /> Choose
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-semibold text-foreground">Billing & invoices</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Subscriptions are managed by our team. Reach out to billing@aicoachportal.com for invoices, upgrades or refunds.
              </p>
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-muted-foreground">Status</p>
                  <p className="mt-0.5 font-medium text-foreground capitalize">{sub?.status || "free"}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-muted-foreground">Next renewal</p>
                  <p className="mt-0.5 font-medium text-foreground">
                    {sub?.ends_at ? format(new Date(sub.ends_at), "MMM d, yyyy") : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachSubscription;
