import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DigitalProductAccess {
  enabled: boolean;
  allowed_types: string[];
  allow_paid: boolean;
  require_approval: boolean;
  platform_commission_percent: number;
  min_price: number | null;
  max_price: number | null;
  allow_discount: boolean;
  allow_refunds: boolean;
  max_products: number | null;
  reason: string;
}

const DEFAULT: DigitalProductAccess = {
  enabled: false,
  allowed_types: [],
  allow_paid: false,
  require_approval: true,
  platform_commission_percent: 10,
  min_price: null,
  max_price: null,
  allow_discount: true,
  allow_refunds: false,
  max_products: null,
  reason: "loading",
};

export function useDigitalProductAccess(coachId?: string) {
  const [data, setData] = useState<DigitalProductAccess>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  const refresh = useCallback(async () => {
    let uid = coachId;
    if (!uid) {
      const { data: u } = await supabase.auth.getUser();
      uid = u.user?.id;
    }
    if (!uid) {
      setData({ ...DEFAULT, reason: "no_user" });
      setLoading(false);
      return;
    }
    const { data: res, error } = await supabase.rpc("get_digital_product_access", { _coach_id: uid });
    if (error || !res) {
      setData({ ...DEFAULT, reason: "error" });
    } else {
      setData(res as unknown as DigitalProductAccess);
    }
    setLoading(false);
  }, [coachId]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`dp-access-${instanceId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "digital_product_settings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "digital_product_coach_access" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { access: data, loading, refresh };
}
