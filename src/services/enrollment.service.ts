import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safeQuery";

export const listForLearner = (learnerId: string) =>
  safeQuery(() => supabase.from("enrollments").select("*, courses(*)").eq("learner_id", learnerId).order("created_at", { ascending: false }), "enrollment.listForLearner");

export const listForCourse = (courseId: string) =>
  safeQuery(() => supabase.from("enrollments").select("*").eq("course_id", courseId), "enrollment.listForCourse");

export const isEnrolled = async (learnerId: string, courseId: string) => {
  const res = await safeQuery(() => supabase.from("enrollments").select("id").eq("learner_id", learnerId).eq("course_id", courseId).maybeSingle(), "enrollment.isEnrolled");
  return { data: !!res.data, error: res.error };
};
