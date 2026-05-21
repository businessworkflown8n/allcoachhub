import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { resolvePrimaryRole, retryOnce, withTimeout } from "@/lib/authNetwork";

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data } = await withTimeout(
          retryOnce(() =>
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
          ),
          8000,
        );

        setRole(resolvePrimaryRole((data ?? []).map((item) => item.role)));
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return { role, loading, isCoach: role === "coach", isLearner: role === "learner", isAdmin: role === "admin" };
};
