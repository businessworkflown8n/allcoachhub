import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const listForUser = (userId: string) =>
  safeQuery(() => supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }), "payment.listForUser");

export const listForCoach = (coachId: string) =>
  safeQuery(() => supabase.from("payments").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }), "payment.listForCoach");
