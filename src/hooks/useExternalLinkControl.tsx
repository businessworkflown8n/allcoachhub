import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useExternalLinkControl = (featureKey: string) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("external_link_controls")
        .select("is_enabled")
        .eq("feature_key", featureKey)
        .maybeSingle();
      if (!cancelled) {
        setEnabled(!!data?.is_enabled);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [featureKey]);

  return { enabled, loading };
};
