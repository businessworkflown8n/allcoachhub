// Shared certificate HTML renderer used by the preview UI and edge function.
// Renders a design_config + dynamic data into a self-contained HTML string
// sized for a printable certificate (A4 landscape/portrait).

export type CertificateOrientation = "landscape" | "portrait";

export interface CertificateDesignConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  titleFontFamily?: string;
  borderStyle?: "classic" | "double" | "ornate" | "minimal" | "ribbon" | "none";
  borderColor?: string;
  backgroundImageUrl?: string;
  backgroundPattern?: "none" | "circuit" | "marble" | "grid" | "waves" | "stars";
  watermarkText?: string;
  showLogo?: boolean;
  logoPosition?: "top-left" | "top-center" | "top-right";
  showQR?: boolean;
  qrPosition?: "bottom-left" | "bottom-right";
  signaturePosition?: "bottom-left" | "bottom-center" | "bottom-right";
  certificateTitle?: string;
  footerText?: string;
  badgeText?: string;
}

export interface CertificateData {
  learnerName: string;
  coachName?: string;
  itemName: string; // course/webinar/workshop name
  itemType?: string; // "Course" | "Webinar" | ...
  completionDate?: string;
  duration?: string;
  certificateId?: string;
  verificationUrl?: string;
  qrDataUrl?: string;
  signatureUrl?: string;
  organizationName?: string;
  platformLogoUrl?: string;
  coachLogoUrl?: string;
  /** Overrides design_config.primaryColor when present (coach branding). */
  coachPrimaryColor?: string;
  /** Overrides design_config.accentColor when present (coach branding). */
  coachAccentColor?: string;
}

const DEFAULTS: Required<Pick<CertificateDesignConfig,
  "primaryColor" | "secondaryColor" | "accentColor" | "backgroundColor" |
  "textColor" | "fontFamily" | "titleFontFamily" | "borderStyle" | "borderColor" |
  "certificateTitle" | "footerText"
>> = {
  primaryColor: "#0B1A3A",
  secondaryColor: "#C9A14A",
  accentColor: "#C9A14A",
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  fontFamily: "'Inter', 'Helvetica', sans-serif",
  titleFontFamily: "'Playfair Display', 'Georgia', serif",
  borderStyle: "classic",
  borderColor: "#C9A14A",
  certificateTitle: "Certificate of Completion",
  footerText: "Issued via AI Coach Portal",
};

export function renderCertificateHTML(
  config: CertificateDesignConfig,
  data: CertificateData,
  orientation: CertificateOrientation = "landscape",
): string {
  const c = {
    ...DEFAULTS,
    ...config,
    ...(data.coachPrimaryColor ? { primaryColor: data.coachPrimaryColor, borderColor: data.coachPrimaryColor } : {}),
    ...(data.coachAccentColor ? { accentColor: data.coachAccentColor, secondaryColor: data.coachAccentColor } : {}),
  };
  const w = orientation === "landscape" ? 1123 : 794;
  const h = orientation === "landscape" ? 794 : 1123;

  const border = renderBorder(c.borderStyle, c.borderColor);
  const bg = c.backgroundImageUrl
    ? `background-image: linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.92)), url('${c.backgroundImageUrl}'); background-size: cover; background-position: center;`
    : `background: ${c.backgroundColor};`;

  const watermark = c.watermarkText
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:.06;font-size:140px;font-weight:900;color:${c.primaryColor};transform:rotate(-25deg);">${escape(c.watermarkText)}</div>`
    : "";

  const qr = c.showQR !== false && data.qrDataUrl
    ? `<div style="position:absolute;${c.qrPosition === "bottom-left" ? "left:48px" : "right:48px"};bottom:48px;text-align:center;">
         <img src="${data.qrDataUrl}" alt="QR" style="width:88px;height:88px;border:4px solid ${c.primaryColor};border-radius:8px;background:#fff;"/>
         <div style="font-size:10px;color:${c.textColor};margin-top:4px;">Verify</div>
       </div>`
    : "";

  const signature = data.signatureUrl
    ? `<img src="${data.signatureUrl}" alt="Signature" style="height:54px;object-fit:contain;margin:0 auto 4px;display:block;"/>`
    : `<div style="height:54px;border-bottom:2px solid ${c.primaryColor};margin:0 auto 4px;width:220px;"></div>`;

  const platformLogo = c.showLogo !== false && data.platformLogoUrl
    ? `<img src="${data.platformLogoUrl}" alt="Logo" style="position:absolute;top:40px;${c.logoPosition === "top-right" ? "right:48px" : c.logoPosition === "top-center" ? "left:50%;transform:translateX(-50%)" : "left:48px"};height:46px;"/>`
    : "";

  const coachLogo = data.coachLogoUrl
    ? `<img src="${data.coachLogoUrl}" alt="Coach Logo" style="position:absolute;top:40px;right:48px;height:64px;max-width:160px;object-fit:contain;background:rgba(255,255,255,0.6);padding:6px;border-radius:8px;"/>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;font-family:${c.fontFamily};">
<div style="position:relative;width:${w}px;height:${h}px;${bg};color:${c.textColor};box-sizing:border-box;overflow:hidden;">
  ${border}
  ${watermark}
  ${platformLogo}
  ${coachLogo}
  <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:96px 72px 120px;text-align:center;">
    ${c.badgeText ? `<div style="display:inline-block;padding:6px 18px;border:1.5px solid ${c.accentColor};color:${c.accentColor};font-size:12px;letter-spacing:.3em;font-weight:600;text-transform:uppercase;border-radius:999px;margin-bottom:18px;">${escape(c.badgeText)}</div>` : ""}
    <h1 style="font-family:${c.titleFontFamily};font-size:54px;margin:0 0 6px;color:${c.primaryColor};letter-spacing:.02em;">${escape(c.certificateTitle)}</h1>
    <div style="width:120px;height:3px;background:${c.accentColor};margin:8px auto 28px;border-radius:2px;"></div>
    <div style="font-size:15px;letter-spacing:.25em;text-transform:uppercase;color:${c.textColor};opacity:.7;">This is to certify that</div>
    <div style="font-family:${c.titleFontFamily};font-size:44px;margin:18px 0;color:${c.primaryColor};font-weight:700;">${escape(data.learnerName)}</div>
    <div style="font-size:15px;max-width:680px;line-height:1.6;color:${c.textColor};">
      has successfully completed <strong>${escape(data.itemName)}</strong>${data.itemType ? ` (${escape(data.itemType)})` : ""}${data.duration ? ` — ${escape(data.duration)}` : ""}.
    </div>
    <div style="display:flex;gap:80px;margin-top:46px;align-items:flex-end;justify-content:center;">
      ${data.coachName ? `<div style="text-align:center;">
        ${signature}
        <div style="font-weight:700;color:${c.primaryColor};font-size:14px;">${escape(data.coachName)}</div>
        <div style="font-size:11px;color:${c.textColor};opacity:.7;letter-spacing:.15em;text-transform:uppercase;">Coach</div>
      </div>` : ""}
      <div style="text-align:center;">
        <div style="font-weight:700;color:${c.primaryColor};font-size:14px;">${escape(data.completionDate ?? "")}</div>
        <div style="font-size:11px;color:${c.textColor};opacity:.7;letter-spacing:.15em;text-transform:uppercase;">Date</div>
      </div>
    </div>
    ${data.certificateId ? `<div style="margin-top:24px;font-size:11px;color:${c.textColor};opacity:.7;letter-spacing:.1em;">Certificate ID: ${escape(data.certificateId)}</div>` : ""}
    ${c.footerText ? `<div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;font-size:10px;color:${c.textColor};opacity:.55;letter-spacing:.2em;text-transform:uppercase;">${escape(c.footerText)}</div>` : ""}
  </div>
  ${qr}
</div>
</body></html>`;
}

function renderBorder(style: CertificateDesignConfig["borderStyle"], color = "#C9A14A"): string {
  switch (style) {
    case "none":
      return "";
    case "double":
      return `<div style="position:absolute;inset:18px;border:3px double ${color};pointer-events:none;"></div>`;
    case "ornate":
      return `<div style="position:absolute;inset:14px;border:6px solid ${color};pointer-events:none;"></div>
              <div style="position:absolute;inset:26px;border:1px solid ${color};pointer-events:none;"></div>`;
    case "minimal":
      return `<div style="position:absolute;inset:24px;border:1px solid ${color};pointer-events:none;"></div>`;
    case "ribbon":
      return `<div style="position:absolute;inset:20px;border:2px solid ${color};pointer-events:none;"></div>
              <div style="position:absolute;top:-30px;left:50%;transform:translateX(-50%) rotate(45deg);width:60px;height:60px;background:${color};"></div>`;
    case "classic":
    default:
      return `<div style="position:absolute;inset:20px;border:4px solid ${color};pointer-events:none;"></div>
              <div style="position:absolute;inset:32px;border:1px solid ${color};pointer-events:none;"></div>`;
  }
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[m]!));
}

export function sampleData(): CertificateData {
  return {
    learnerName: "Jane Doe",
    coachName: "Coach Sample",
    itemName: "Mastering AI Coaching",
    itemType: "Course",
    completionDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    duration: "12 hours",
    certificateId: "ACP-PREVIEW-2026-001",
    organizationName: "AI Coach Portal",
  };
}
