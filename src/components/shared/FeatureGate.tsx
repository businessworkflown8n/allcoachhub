import { ReactNode } from "react";
import { useFeatureControl, PlanTier } from "@/hooks/useFeatureControl";
import FeatureLockedScreen from "./FeatureLockedScreen";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  featureKey: string;
  featureName?: string;
  plan?: PlanTier;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wraps any content in a feature flag check resolved server-side via
 * get_effective_feature(): override → plan → global.
 */
export const FeatureGate = ({ featureKey, featureName, plan = "free", children, fallback }: Props) => {
  const { data, loading } = useFeatureControl(featureKey, plan);
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (data?.enabled) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <FeatureLockedScreen featureName={featureName ?? featureKey} reason={data?.reason} />;
};

export default FeatureGate;
