import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Resolves the feature_flags JSON from the coach's currently active
 * subscription bundle. This is the single source of truth for what
 * a coach can access based on their plan.
 *
 *   const { has, loading } = useBundleFeatures();
 *   if (!has("ai_course_generator")) return <Locked />;
 */
export const useBundleFeatures = () => {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("coach_subscriptions")
        .select("status, feature_bundles!inner(feature_flags, is_active)")
        .eq("coach_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();
      const bundle = (data as any)?.feature_bundles;
      setFlags((bundle?.feature_flags as Record<string, boolean>) || {});
      setLoading(false);
    })();
  }, [user]);

  const has = (key: string) => !!flags[key];

  return { flags, has, loading };
};
