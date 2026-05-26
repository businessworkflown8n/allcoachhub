import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const create = (lead: Record<string, any>) =>
  safeQuery(() => supabase.from("leads").insert(lead).select().maybeSingle(), "lead.create");

export const listForCoach = (coachId: string) =>
  safeQuery(() => supabase.from("leads").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }), "lead.listForCoach");
