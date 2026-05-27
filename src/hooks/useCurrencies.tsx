import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Currency {
  id: string;
  currency_name: string;
  currency_code: string;
  currency_symbol: string;
  country: string | null;
  exchange_rate: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachCurrencyRequest {
  id: string;
  coach_id: string;
  requested_currency: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachCurrencySettings {
  coach_id: string;
  primary_currency: string;
  allowed_currencies: string[];
  currency_updated_at: string;
}

const TABLE_CUR: any = "currencies";
const TABLE_REQ: any = "coach_currency_requests";
const TABLE_SET: any = "coach_currency_settings";

export const useActiveCurrencies = () =>
  useQuery({
    queryKey: ["currencies", "active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_CUR)
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("currency_code");
      if (error) throw error;
      return (data ?? []) as Currency[];
    },
  });

export const useAllCurrencies = () =>
  useQuery({
    queryKey: ["currencies", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_CUR)
        .select("*")
        .order("is_default", { ascending: false })
        .order("currency_code");
      if (error) throw error;
      return (data ?? []) as Currency[];
    },
  });

export const useCurrencyMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["currencies"] });

  const add = useMutation({
    mutationFn: async (payload: Partial<Currency>) => {
      const { error } = await (supabase as any).from(TABLE_CUR).insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Currency> }) => {
      const { error } = await (supabase as any).from(TABLE_CUR).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE_CUR).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
};

export const useCoachCurrencyRequests = (coachId?: string) =>
  useQuery({
    queryKey: ["coach_currency_requests", coachId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any).from(TABLE_REQ).select("*").order("created_at", { ascending: false });
      if (coachId) q = q.eq("coach_id", coachId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CoachCurrencyRequest[];
    },
  });

export const useCoachCurrencySettings = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach_currency_settings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_SET)
        .select("*")
        .eq("coach_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CoachCurrencySettings | null;
    },
  });
};

export const useRequestCurrency = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (currency_code: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from(TABLE_REQ)
        .insert({ coach_id: user.id, requested_currency: currency_code, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach_currency_requests"] }),
  });
};

export const useReviewRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      coach_id,
      requested_currency,
      action,
      notes,
    }: {
      id: string;
      coach_id: string;
      requested_currency: string;
      action: "approve" | "reject";
      notes?: string;
    }) => {
      const status = action === "approve" ? "approved" : "rejected";
      const { error } = await (supabase as any)
        .from(TABLE_REQ)
        .update({ status, admin_notes: notes ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      if (action === "approve") {
        // Upsert coach settings adding currency to allowed list
        const { data: existing } = await (supabase as any)
          .from(TABLE_SET)
          .select("*")
          .eq("coach_id", coach_id)
          .maybeSingle();
        const allowed = new Set<string>(existing?.allowed_currencies ?? ["INR"]);
        allowed.add(requested_currency);
        if (existing) {
          await (supabase as any)
            .from(TABLE_SET)
            .update({ allowed_currencies: Array.from(allowed) })
            .eq("coach_id", coach_id);
        } else {
          await (supabase as any).from(TABLE_SET).insert({
            coach_id,
            primary_currency: "INR",
            allowed_currencies: Array.from(allowed),
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach_currency_requests"] });
      qc.invalidateQueries({ queryKey: ["coach_currency_settings"] });
    },
  });
};

export const useUpdateCoachPrimaryCurrency = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (currency_code: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await (supabase as any)
        .from(TABLE_SET)
        .select("*")
        .eq("coach_id", user.id)
        .maybeSingle();
      if (existing) {
        const { error } = await (supabase as any)
          .from(TABLE_SET)
          .update({ primary_currency: currency_code })
          .eq("coach_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(TABLE_SET).insert({
          coach_id: user.id,
          primary_currency: currency_code,
          allowed_currencies: [currency_code, "INR"],
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach_currency_settings"] }),
  });
};
