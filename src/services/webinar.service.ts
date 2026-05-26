import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

const sb: any = supabase;

export const listUpcoming = () =>
  safeQuery(() => sb.from("webinars").select("*").gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }), "webinar.listUpcoming");

export const registrationsForUser = (userId: string) =>
  safeQuery(() => sb.from("webinar_registrations").select("*, webinars(*)").eq("user_id", userId), "webinar.registrationsForUser");
