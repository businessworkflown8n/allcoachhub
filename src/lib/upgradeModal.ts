import type { PlanTier } from "@/hooks/useFeatureControl";

export interface UpgradeTrigger {
  reason: string;
  detail?: string;
  used?: number;
  limit?: number;
  label?: string;
  featureKey?: string;
  featureName?: string;
  recommended?: PlanTier;
}

export const UPGRADE_EVENT = "lovable:open-upgrade-modal";

/** Fire from anywhere — `<PlanUpgradeModal />` mounted at app root will react. */
export const openUpgradeModal = (trigger: UpgradeTrigger) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UpgradeTrigger>(UPGRADE_EVENT, { detail: trigger }));
};
