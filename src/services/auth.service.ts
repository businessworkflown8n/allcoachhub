import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const getSession = () => safeQuery(async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data: data.session, error };
}, "auth.getSession");

export const getUser = () => safeQuery(async () => {
  const { data, error } = await supabase.auth.getUser();
  return { data: data.user, error };
}, "auth.getUser");

export const signOut = () => safeQuery(async () => {
  const { error } = await supabase.auth.signOut();
  return { data: null, error };
}, "auth.signOut");
