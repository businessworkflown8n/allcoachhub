import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

// `leads` is not in the generated types union; cast through `any` for the service-layer wrapper.
const sb: any = supabase;

export const create = (lead: Record<string, any>) =>
  safeQuery(() => sb.from("leads").insert(lead).select().maybeSingle(), "lead.create");

export const listForCoach = (coachId: string) =>
  safeQuery(() => sb.from("leads").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }), "lead.listForCoach");
