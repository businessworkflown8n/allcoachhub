import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const listForLearner = (learnerId: string) =>
  safeQuery(() => supabase.from("learner_notifications").select("*").eq("learner_id", learnerId).order("created_at", { ascending: false }).limit(50), "notification.listForLearner");

export const markRead = (id: string) =>
  safeQuery(() => supabase.from("learner_notifications").update({ is_read: true }).eq("id", id).select().maybeSingle(), "notification.markRead");
