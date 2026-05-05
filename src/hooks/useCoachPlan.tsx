import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { PlanTier } from "./useFeatureControl";

/**
 * Resolves the active coach plan tier from coach_subscriptions → feature_bundles.
 * Falls back to "free" when no active subscription exists.
 */
export const useCoachPlan = (): { plan: PlanTier; loading: boolean } => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("coach_subscriptions")
        .select("bundle_id, status, feature_bundles!inner(slug)")
        .eq("coach_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();
      const slug = (data as any)?.feature_bundles?.slug?.toLowerCase() ?? "free";
      const tier: PlanTier = slug.includes("premium") || slug.includes("enterprise")
        ? "premium"
        : slug.includes("pro") ? "pro" : "free";
      setPlan(tier);
      setLoading(false);
    })();
  }, [user]);

  return { plan, loading };
};
