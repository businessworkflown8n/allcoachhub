import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccessMode = "public" | "private";

export interface ExternalLinkControlData {
  enabled: boolean;
  accessMode: AccessMode;
  expiresAt: string | null;
  urlTemplate: string | null;
  publicUrl: string | null;
  loading: boolean;
  expired: boolean;
}

export const useExternalLinkControl = (featureKey: string): ExternalLinkControlData => {
  const [state, setState] = useState<ExternalLinkControlData>({
    enabled: false,
    accessMode: "public",
    expiresAt: null,
    urlTemplate: null,
    publicUrl: null,
    loading: true,
    expired: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("external_link_controls")
        .select("is_enabled, access_mode, expires_at, url_template, public_url")
        .eq("feature_key", featureKey)
        .maybeSingle();
      if (cancelled) return;
      const expired = !!data?.expires_at && new Date(data.expires_at as string) < new Date();
      setState({
        enabled: !!data?.is_enabled && !expired,
        accessMode: ((data as any)?.access_mode || "public") as AccessMode,
        expiresAt: (data as any)?.expires_at ?? null,
        urlTemplate: (data as any)?.url_template ?? null,
        publicUrl: (data as any)?.public_url ?? null,
        loading: false,
        expired,
      });
    })();
    return () => { cancelled = true; };
  }, [featureKey]);

  return state;
};
