import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export type ActivityInput = {
  user_id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, any>;
};

export const log = (a: ActivityInput) =>
  safeQuery(() => (supabase as any).from("activity_logs").insert(a), "activity.log");

export const listMine = (userId: string, limit = 100) =>
  safeQuery(() => (supabase as any).from("activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit), "activity.listMine");
