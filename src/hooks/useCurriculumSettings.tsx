import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurriculumLinkType =
  | "youtube" | "vimeo" | "google_drive" | "zoom" | "loom" | "website" | "other";

export interface CurriculumSettings {
  allowed_link_types: CurriculumLinkType[];
  domain_whitelist: string[];
  max_links_per_lesson: number;
  allow_preview: boolean;
  allow_downloadable: boolean;
  allow_embed: boolean;
  allow_open_new_tab: boolean;
  require_admin_approval: boolean;
  uploads_disabled: boolean;
}

const DEFAULTS: CurriculumSettings = {
  allowed_link_types: ["youtube", "vimeo", "google_drive", "zoom", "loom", "website", "other"],
  domain_whitelist: [],
  max_links_per_lesson: 10,
  allow_preview: true,
  allow_downloadable: true,
  allow_embed: true,
  allow_open_new_tab: true,
  require_admin_approval: false,
  uploads_disabled: true,
};

export const useCurriculumSettings = () => {
  const [settings, setSettings] = useState<CurriculumSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("curriculum_link_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        if (data) setSettings({ ...DEFAULTS, ...(data as any) });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { settings, loading };
};

export const LINK_TYPE_LABELS: Record<CurriculumLinkType, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  google_drive: "Google Drive",
  zoom: "Zoom Recording",
  loom: "Loom",
  website: "Website",
  other: "Other",
};

export function detectLinkType(url: string): CurriculumLinkType {
  const u = (url || "").toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return "google_drive";
  if (u.includes("zoom.us") || u.includes("zoom.com")) return "zoom";
  if (u.includes("loom.com")) return "loom";
  if (u.startsWith("http")) return "website";
  return "other";
}

export function validateLessonUrl(url: string, settings: CurriculumSettings): string | null {
  if (!url?.trim()) return "URL is required";
  let parsed: URL;
  try { parsed = new URL(url); } catch { return "Invalid URL"; }
  if (!["http:", "https:"].includes(parsed.protocol)) return "URL must start with http(s)://";
  const type = detectLinkType(url);
  if (!settings.allowed_link_types.includes(type)) {
    return `${LINK_TYPE_LABELS[type]} links are not allowed by admin`;
  }
  if (settings.domain_whitelist.length > 0) {
    const host = parsed.hostname.replace(/^www\./, "");
    const ok = settings.domain_whitelist.some((d) => {
      const dd = d.trim().toLowerCase().replace(/^www\./, "");
      return host === dd || host.endsWith("." + dd);
    });
    if (!ok) return `Domain "${host}" is not in the admin-approved whitelist`;
  }
  return null;
}
