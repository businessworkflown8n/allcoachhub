import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const getByUserId = (userId: string) =>
  safeQuery(() => supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(), "profile.getByUserId");

export const updateOwn = (userId: string, patch: Record<string, any>) =>
  safeQuery(() => supabase.from("profiles").update(patch as any).eq("user_id", userId).select().maybeSingle(), "profile.updateOwn");

export const getRole = (userId: string) =>
  safeQuery(() => supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(), "profile.getRole");
