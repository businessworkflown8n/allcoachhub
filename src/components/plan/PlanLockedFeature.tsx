import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openUpgradeModal } from "@/lib/upgradeModal";
import type { PlanTier } from "@/hooks/useFeatureControl";

interface Props {
  featureName: string;
  description?: string;
  recommended?: PlanTier;
  variant?: "card" | "pill";
  children?: React.ReactNode;
}

/**
 * Drop-in blurred premium teaser. Renders children behind a blur with an
 * upgrade CTA, or as an inline pill when `variant="pill"`.
 */
export const PlanLockedFeature = ({
  featureName,
  description,
  recommended = "pro",
  variant = "card",
  children,
}: Props) => {
  const trigger = () =>
    openUpgradeModal({
      reason: `${featureName} is locked`,
      detail: description,
      featureName,
      recommended,
    });

  if (variant === "pill") {
    return (
      <button
        onClick={trigger}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <Lock className="h-3 w-3" /> Upgrade to unlock
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
      {children && (
        <div aria-hidden className="pointer-events-none select-none opacity-30 blur-md">
          {children}
        </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-background/30 via-background/60 to-background/80 p-6 text-center backdrop-blur-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-base font-semibold text-foreground">{featureName}</p>
          {description && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button onClick={trigger} size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Upgrade to {recommended}
        </Button>
      </div>
    </div>
  );
};

export default PlanLockedFeature;
