import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const listPublished = (limit = 50) =>
  safeQuery(() => supabase.from("courses").select("*").eq("is_published", true).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(limit), "course.listPublished");

export const getById = (id: string) =>
  safeQuery(() => supabase.from("courses").select("*").eq("id", id).maybeSingle(), "course.getById");

export const getBySlug = (slug: string) =>
  safeQuery(() => supabase.from("courses").select("*").eq("slug", slug).maybeSingle(), "course.getBySlug");

export const listByCoach = (coachId: string) =>
  safeQuery(() => supabase.from("courses").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }), "course.listByCoach");
