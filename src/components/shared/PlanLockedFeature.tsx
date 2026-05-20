import { ReactNode } from "react";
import { Lock, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openUpgradeModal } from "@/hooks/usePlanGuard";
import type { PlanTier } from "@/hooks/useFeatureControl";

interface Props {
  featureKey?: string;
  featureName: string;
  description?: string;
  requiredTier?: PlanTier;
  icon?: ReactNode;
  /** Visual style: "card" full teaser block, "inline" small badge+button. */
  variant?: "card" | "inline";
}

/**
 * Locked premium feature teaser with blur overlay + upgrade CTA.
 * Fires the global PlanUpgradeModal via openUpgradeModal().
 */
const PlanLockedFeature = ({
  featureKey, featureName, description, requiredTier = "pro", icon, variant = "card",
}: Props) => {
  const onClick = () =>
    openUpgradeModal({
      featureKey, featureName, requiredTier,
      reason: `${featureName} is available on ${requiredTier.toUpperCase()} plans and above.`,
    });

  if (variant === "inline") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
        <Lock className="h-3 w-3 text-primary" />
        <span className="text-xs text-foreground">{featureName}</span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-primary" onClick={onClick}>Upgrade</Button>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_60%)] pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">{icon || <Crown className="h-4 w-4 text-primary" />}</div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                {featureName}
                <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] uppercase tracking-wider gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> {requiredTier}
                </Badge>
              </h3>
              {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
          </div>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <Button size="sm" onClick={onClick} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_-8px_hsl(var(--primary)/0.6)]">
          <Crown className="h-3.5 w-3.5" /> Upgrade to unlock
        </Button>
      </div>
    </div>
  );
};

export default PlanLockedFeature;
