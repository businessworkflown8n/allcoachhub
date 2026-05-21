import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CommSettings {
  chatbot_enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  whatsapp_message: string;
  call_enabled: boolean;
  call_number: string;
  show_to_learners: boolean;
  show_to_coaches: boolean;
}

const defaults: CommSettings = {
  chatbot_enabled: true,
  whatsapp_enabled: true,
  whatsapp_number: "919852411280",
  whatsapp_message: "Hi, I would like to know more about AI Coach Portal",
  call_enabled: true,
  call_number: "+919852411280",
  show_to_learners: true,
  show_to_coaches: true,
};

export const useCommunicationSettings = () => {
  const [settings, setSettings] = useState<CommSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [commRes, platformRes] = await Promise.all([
        supabase.from("communication_settings" as any).select("key, value"),
        supabase.from("platform_settings").select("key, value").in("key", ["show_comm_buttons_learners", "show_comm_buttons_coaches"]),
      ]);
      const map: Record<string, string> = {};
      if (commRes.data) {
        (commRes.data as any[]).forEach(d => { map[d.key] = d.value; });
      }
      const platformMap: Record<string, string> = {};
      if (platformRes.data) {
        platformRes.data.forEach((d: any) => { platformMap[d.key] = d.value; });
      }
      setSettings({
        chatbot_enabled: map.chatbot_enabled !== "false",
        whatsapp_enabled: map.whatsapp_enabled !== "false",
        whatsapp_number: map.whatsapp_number || defaults.whatsapp_number,
        whatsapp_message: map.whatsapp_message || defaults.whatsapp_message,
        call_enabled: map.call_enabled !== "false",
        call_number: map.call_number || defaults.call_number,
        show_to_learners: platformMap.show_comm_buttons_learners !== "false",
        show_to_coaches: platformMap.show_comm_buttons_coaches !== "false",
      });
      setLoading(false);
    };
    fetch();
  }, []);

  return { settings, loading };
};
