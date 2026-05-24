// Detect provider + build embed URL for external link-based lessons.
export type LessonProvider =
  | "youtube" | "vimeo" | "loom"
  | "google_drive" | "google_docs" | "google_sheets" | "google_slides"
  | "onedrive" | "dropbox"
  | "notion" | "canva"
  | "pdf" | "audio" | "zip" | "website";

export const PROVIDER_LABELS: Record<LessonProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  loom: "Loom",
  google_drive: "Google Drive",
  google_docs: "Google Docs",
  google_sheets: "Google Sheets",
  google_slides: "Google Slides",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  notion: "Notion",
  canva: "Canva",
  pdf: "PDF",
  audio: "Audio",
  zip: "ZIP / Archive",
  website: "External Link",
};

export function detectProvider(url: string): LessonProvider {
  const u = (url || "").toLowerCase();
  if (!u) return "website";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("loom.com")) return "loom";
  if (u.includes("docs.google.com/document")) return "google_docs";
  if (u.includes("docs.google.com/spreadsheets")) return "google_sheets";
  if (u.includes("docs.google.com/presentation")) return "google_slides";
  if (u.includes("drive.google.com")) return "google_drive";
  if (u.includes("1drv.ms") || u.includes("onedrive.live.com") || u.includes("sharepoint.com")) return "onedrive";
  if (u.includes("dropbox.com")) return "dropbox";
  if (u.includes("notion.so") || u.includes("notion.site")) return "notion";
  if (u.includes("canva.com")) return "canva";
  if (u.endsWith(".pdf")) return "pdf";
  if (/\.(mp3|wav|m4a|ogg|aac)$/.test(u)) return "audio";
  if (/\.(zip|rar|7z|tar|gz)$/.test(u)) return "zip";
  return "website";
}

// Best-effort embed URL builder. Returns null if not embeddable (open in new tab).
export function buildEmbedUrl(url: string, provider?: LessonProvider): string | null {
  if (!url) return null;
  const p = provider || detectProvider(url);
  try {
    const parsed = new URL(url);
    switch (p) {
      case "youtube": {
        const id =
          parsed.searchParams.get("v") ||
          parsed.pathname.split("/").filter(Boolean).pop();
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      case "vimeo": {
        const id = parsed.pathname.split("/").filter(Boolean).pop();
        return id ? `https://player.vimeo.com/video/${id}` : url;
      }
      case "loom":
        return url.replace("/share/", "/embed/");
      case "google_drive": {
        const m = url.match(/\/file\/d\/([^/]+)/);
        return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
      }
      case "google_docs":
      case "google_sheets":
      case "google_slides":
        return url.replace(/\/edit.*$/, "/preview");
      case "canva":
        return url.includes("/view") ? url : url + "?embed";
      case "pdf":
        return url;
      case "notion":
      case "onedrive":
      case "dropbox":
      case "website":
      case "audio":
      case "zip":
      default:
        return url;
    }
  } catch {
    return url;
  }
}

export function getYouTubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}
