import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/compatClient";
import { useAuth } from "./useAuth";

/**
 * Whether the signed-in coach has Webinar Management access. Kept separate from
 * useCoachFeatures so a missing column (migration not yet applied) only hides
 * this feature instead of breaking the rest of the dashboard. UI gating only:
 * every action is re-authorized server-side.
 */
export const useWebinarManagementAccess = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setHasAccess(false); setLoading(false); return; }
    supabase
      .from("coach_feature_flags")
      .select("webinar_mgmt_access")
      .eq("coach_id", user.id)
      .maybeSingle()
      .then(({ data, error }: { data: any; error: any }) => {
        setHasAccess(!error && !!data?.webinar_mgmt_access);
        setLoading(false);
      });
  }, [user]);

  return { hasAccess, loading };
};
