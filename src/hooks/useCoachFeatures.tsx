import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CoachFeatures {
  workshops_access: boolean;
  courses_access: boolean;
  feed_access: boolean;
  messaging_access: boolean;
  paid_content_access: boolean;
  contact_access: boolean;
  profile_picture_access: boolean;
  blueprint_access: boolean;
  materials_access: boolean;
  crm_access: boolean;
  leads_access: boolean;
  sessions_access: boolean;
  progress_access: boolean;
  packages_access: boolean;
  automations_access: boolean;
  copilot_access: boolean;
  content_studio_access: boolean;
  external_materials_access: boolean;
  assignments_access: boolean;
  status: string;
}

const DEFAULT_FEATURES: CoachFeatures = {
  workshops_access: false,
  courses_access: false,
  feed_access: false,
  messaging_access: false,
  paid_content_access: false,
  contact_access: false,
  profile_picture_access: true,
  blueprint_access: true,
  materials_access: true,
  crm_access: false,
  leads_access: false,
  sessions_access: false,
  progress_access: false,
  packages_access: false,
  automations_access: false,
  copilot_access: false,
  content_studio_access: false,
  external_materials_access: false,
  status: "pending",
};

export const useCoachFeatures = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState<CoachFeatures>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("coach_feature_flags")
      .select("workshops_access, courses_access, feed_access, messaging_access, paid_content_access, contact_access, profile_picture_access, blueprint_access, materials_access, crm_access, leads_access, sessions_access, progress_access, packages_access, automations_access, copilot_access, content_studio_access, external_materials_access, status")
      .eq("coach_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFeatures({ ...DEFAULT_FEATURES, ...(data as any) });
        setLoading(false);
      });
  }, [user]);

  return { ...features, loading, isApproved: features.status === "approved" };
};
