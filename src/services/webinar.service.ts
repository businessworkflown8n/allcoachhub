import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const listUpcoming = () =>
  safeQuery(() => supabase.from("webinars").select("*").gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }), "webinar.listUpcoming");

export const registrationsForUser = (userId: string) =>
  safeQuery(() => supabase.from("webinar_registrations").select("*, webinars(*)").eq("user_id", userId), "webinar.registrationsForUser");
