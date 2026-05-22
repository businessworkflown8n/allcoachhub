import { useCallback } from "react";
import { useCoachPlan } from "./useCoachPlan";
import { useFeatureControl } from "./useFeatureControl";
import { toast } from "./use-toast";
import { openUpgradeModal } from "@/lib/upgradeModal";
import type { PlanTier } from "./useFeatureControl";

const TIER_RANK: Record<PlanTier, number> = { free: 0, pro: 1, premium: 2 };

/**
 * Tier-aware guard utilities for paywalled actions.
 *
 *   const guard = usePlanGuard();
 *   if (!guard.checkLimit(usedCourses, 5, "courses")) return;
 *   if (!guard.requireFeature("messaging_access", "Email Campaigns", "pro")) return;
 */
export const usePlanGuard = () => {
  const { plan, loading } = useCoachPlan();

  const meetsTier = useCallback(
    (required: PlanTier) => TIER_RANK[plan] >= TIER_RANK[required],
    [plan]
  );

  /** Returns true if action is allowed. Pops upgrade modal if exceeded. */
  const checkLimit = useCallback(
    (used: number, limit: number | null, label: string) => {
      if (limit === null || used < limit) return true;
      openUpgradeModal({
        reason: `${label} limit reached`,
        detail: `You've used ${used} of ${limit} ${label} on the ${plan} plan.`,
        used,
        limit,
        label,
        recommended: plan === "free" ? "pro" : "premium",
      });
      return false;
    },
    [plan]
  );

  /** Returns true if feature is unlocked for this plan. Pops upgrade modal if not. */
  const requireFeature = useCallback(
    (key: string, name: string, requiredTier: PlanTier = "pro") => {
      if (meetsTier(requiredTier)) return true;
      openUpgradeModal({
        reason: `${name} is a ${requiredTier} feature`,
        detail: `Upgrade to ${requiredTier} or higher to unlock ${name}.`,
        featureKey: key,
        featureName: name,
        recommended: requiredTier,
      });
      return false;
    },
    [meetsTier]
  );

  return { plan, loading, meetsTier, checkLimit, requireFeature };
};

/** Hook variant that also resolves the live effective feature (RLS + override + plan). */
export const useFeatureGuard = (featureKey: string, featureName: string, requiredTier: PlanTier = "pro") => {
  const { plan } = useCoachPlan();
  const { data } = useFeatureControl(featureKey, plan);
  const enabled = !!data?.enabled;
  const requireOrPrompt = useCallback(() => {
    if (enabled) return true;
    if (data?.reason === "admin_disabled") {
      toast({ title: `${featureName} disabled`, description: "Contact admin to enable.", variant: "destructive" });
      return false;
    }
    openUpgradeModal({
      reason: `${featureName} is locked`,
      featureKey,
      featureName,
      recommended: requiredTier,
    });
    return false;
  }, [enabled, data, featureKey, featureName, requiredTier]);
  return { enabled, plan, requireOrPrompt, limit: data?.usage_limit ?? null };
};

export { openUpgradeModal };
