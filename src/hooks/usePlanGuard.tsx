import { useEffect, useState, useCallback } from "react";
import { useCoachPlan } from "./useCoachPlan";
import type { PlanTier } from "./useFeatureControl";

export interface UpgradeTrigger {
  featureKey?: string;
  featureName?: string;
  reason?: string;
  requiredTier?: PlanTier;
  usage?: { used: number; limit: number; label: string };
}

const EVT = "plan-guard:open-upgrade";

/** Fire the global upgrade modal from anywhere in the app. */
export const openUpgradeModal = (trigger: UpgradeTrigger = {}) => {
  window.dispatchEvent(new CustomEvent(EVT, { detail: trigger }));
};

/** Subscribe to upgrade-modal events (used internally by <PlanUpgradeModal/>). */
export const useUpgradeModalEvents = () => {
  const [trigger, setTrigger] = useState<UpgradeTrigger | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setTrigger((e as CustomEvent<UpgradeTrigger>).detail || {});
    window.addEventListener(EVT, onOpen);
    return () => window.removeEventListener(EVT, onOpen);
  }, []);
  return { trigger, close: () => setTrigger(null) };
};

/**
 * Plan-aware guard helpers. Returns the active tier plus simple checkers
 * that components can call before letting users hit a paywalled limit.
 */
export const usePlanGuard = () => {
  const { plan, loading } = useCoachPlan();

  const tierRank: Record<PlanTier, number> = { free: 0, pro: 1, premium: 2 };
  const meetsTier = useCallback(
    (needed: PlanTier) => tierRank[plan] >= tierRank[needed],
    [plan]
  );

  const checkLimit = useCallback(
    (used: number, limit: number | null, label: string, requiredTier: PlanTier = "pro") => {
      if (limit == null) return { ok: true, atLimit: false, warning: false };
      const atLimit = used >= limit;
      const warning = used >= Math.floor(limit * 0.8);
      if (atLimit) {
        openUpgradeModal({
          reason: `You've reached your ${label} limit on the ${plan.toUpperCase()} plan.`,
          requiredTier,
          usage: { used, limit, label },
        });
      }
      return { ok: !atLimit, atLimit, warning };
    },
    [plan]
  );

  const requireFeature = useCallback(
    (featureKey: string, featureName: string, requiredTier: PlanTier = "pro") => {
      if (meetsTier(requiredTier)) return true;
      openUpgradeModal({ featureKey, featureName, requiredTier, reason: `${featureName} is available on ${requiredTier.toUpperCase()} plans and above.` });
      return false;
    },
    [meetsTier]
  );

  return { plan, loading, meetsTier, checkLimit, requireFeature, openUpgradeModal };
};
