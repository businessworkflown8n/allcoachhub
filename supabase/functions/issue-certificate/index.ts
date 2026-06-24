// Issues a certificate for a learner who completed a coach's course/workshop/ai-kids program.
// Coach (or admin) initiates the issuance — this is the "Manual coach approval" path.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEON = rgb(0.78, 1.0, 0.24);          // #C7FF3D
const DARK = rgb(0.02, 0.04, 0.06);          // #050A0F
const WHITE = rgb(0.98, 0.98, 0.98);
const MUTED = rgb(0.65, 0.7, 0.7);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const user = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user: u } } = await user.auth.getUser();
    if (!u) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { source_type = "course", source_id, learner_id } = body as {
      source_type?: "course" | "workshop" | "ai_kids" | "webinar";
      source_id?: string;
      learner_id?: string;
    };
    if (!source_id || !learner_id) return json({ error: "source_id and learner_id required" }, 400);

    // Authorize issuer: must be admin OR own the source OR learner self-issuing for webinars
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");

    let courseTitle = "";
    let coachId = "";
    let durationText = "";
    let webinarRowId: string | null = null;
    let certSignatureId: string | null = null;
    if (source_type === "course") {
      const { data: c } = await admin.from("courses").select("title, coach_id, duration").eq("id", source_id).maybeSingle();
      if (!c) return json({ error: "Course not found" }, 404);
      courseTitle = c.title;
      coachId = c.coach_id;
      durationText = c.duration ? `${c.duration}` : "";
    } else if (source_type === "workshop") {
      const { data: w } = await admin.from("workshops").select("title, coach_id, duration_minutes").eq("id", source_id).maybeSingle();
      if (!w) return json({ error: "Workshop not found" }, 404);
      courseTitle = w.title;
      coachId = w.coach_id;
      durationText = w.duration_minutes ? `${w.duration_minutes} min` : "";
    } else if (source_type === "webinar") {
      const { data: w } = await admin.from("webinars")
        .select("id, title, coach_id, duration_minutes, cert_enabled, cert_title, cert_signature_id")
        .eq("id", source_id).maybeSingle();
      if (!w) return json({ error: "Webinar not found" }, 404);
      if (!w.cert_enabled) return json({ error: "Certification is not enabled for this webinar" }, 403);
      courseTitle = w.cert_title || w.title;
      coachId = w.coach_id;
      durationText = w.duration_minutes ? `${w.duration_minutes} min` : "";
      webinarRowId = w.id;
      certSignatureId = w.cert_signature_id;

      // Learner self-issue: must have attended
      if (!isAdmin && coachId !== u.id) {
        if (u.id !== learner_id) return json({ error: "Forbidden" }, 403);
        const { data: reg } = await admin.from("webinar_registrations")
          .select("attended").eq("webinar_id", source_id).eq("learner_id", learner_id).maybeSingle();
        if (!reg?.attended) return json({ error: "Attendance not recorded for this webinar" }, 403);
      }

      // Admin global toggle check
      const { data: certCfg } = await admin.from("certificate_settings").select("webinar_cert_enabled, certificates_enabled").limit(1).maybeSingle();
      if (certCfg && (certCfg.certificates_enabled === false || certCfg.webinar_cert_enabled === false)) {
        return json({ error: "Webinar certificates are currently disabled by admin" }, 403);
      }
      const { data: cff } = await admin.from("coach_feature_flags").select("webinar_certification_access").eq("coach_id", coachId).maybeSingle();
      if (cff && cff.webinar_certification_access === false) {
        return json({ error: "Webinar certification disabled for this coach" }, 403);
      }
    } else {
      const { data: k } = await admin.from("ai_kids_enrollments").select("course_title, coach_id").eq("id", source_id).maybeSingle();
      if (!k) return json({ error: "Enrollment not found" }, 404);
      courseTitle = k.course_title || "AI Kids Pro";
      coachId = k.coach_id;
    }

    if (!isAdmin && coachId !== u.id) return json({ error: "Forbidden" }, 403);

    // Idempotent: return existing if found
    const { data: existing } = await admin
      .from("issued_certificates")
      .select("*")
      .eq("user_id", learner_id)
      .eq("source_id", source_id)
      .eq("source_type", source_type)
      .maybeSingle();
    if (existing?.pdf_url) {
      return json({ pdf_url: existing.pdf_url, certificate_number: existing.certificate_number, verification_token: existing.verification_token, reused: true });
    }

    // Learner info
    const { data: learnerProfile } = await admin.from("profiles").select("full_name, email").eq("user_id", learner_id).maybeSingle();
    const learnerName = learnerProfile?.full_name || learnerProfile?.email || "Learner";
    const learnerEmail = learnerProfile?.email || null;

    // Coach signature — prefer webinar-specific signature if set, else coach default
    const sigQuery = certSignatureId
      ? admin.from("coach_certificate_signatures").select("*").eq("id", certSignatureId).maybeSingle()
      : admin.from("coach_certificate_signatures").select("*").eq("coach_id", coachId).maybeSingle();
    const { data: sig } = await sigQuery;
    const { data: coachProfile } = await admin.from("profiles").select("full_name").eq("user_id", coachId).maybeSingle();
    const coachName = sig?.full_name || coachProfile?.full_name || "Authorized Signatory";
    const designation = sig?.designation || "Coach";
    const organization = sig?.organization || "AI Coach Portal";

    // Default template
    const { data: tmpl } = await admin
      .from("certificate_templates")
      .select("id")
      .eq("is_default", true)
      .eq("template_kind", source_type === "ai_kids" ? "ai_kids" : source_type)
      .limit(1)
      .maybeSingle();
    const fallbackTmpl = tmpl
      ? tmpl
      : (await admin.from("certificate_templates").select("id").eq("is_default", true).limit(1).maybeSingle()).data;

    // Next number
    const year = new Date().getFullYear();
    const { data: numRes, error: numErr } = await admin.rpc("next_certificate_number", { _coach_id: coachId, _year: year });
    if (numErr) throw numErr;
    const certNumber = numRes as string;
    const verificationToken = crypto.randomUUID();
    const completionDate = new Date();

    // QR
    const verifyUrl = `https://www.aicoachportal.com/verify-certificate/${verificationToken}`;
    const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, { width: 256, margin: 1, color: { dark: "#C7FF3D", light: "#050A0F" } });
    const qrPngBytes = Uint8Array.from(atob(qrPngDataUrl.split(",")[1]), (c) => c.charCodeAt(0));

    // Build PDF — A4 landscape (842 x 595 pt)
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const reg = await pdf.embedFont(StandardFonts.Helvetica);
    const obl = await pdf.embedFont(StandardFonts.HelveticaOblique);

    // Background
    page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: DARK });

    // Decorative circuit-style border (double neon rectangles)
    page.drawRectangle({ x: 18, y: 18, width: 806, height: 559, borderColor: NEON, borderWidth: 1.5 });
    page.drawRectangle({ x: 28, y: 28, width: 786, height: 539, borderColor: NEON, borderWidth: 0.5 });

    // Corner accents
    const cornerLen = 36;
    const corners = [
      [28, 567], [814, 567], [28, 28], [814, 28],
    ];
    corners.forEach(([cx, cy]) => {
      page.drawRectangle({ x: cx - 4, y: cy - 4, width: 8, height: 8, color: NEON });
      page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + (cx < 400 ? cornerLen : -cornerLen), y: cy }, thickness: 1.5, color: NEON });
      page.drawLine({ start: { x: cx, y: cy }, end: { x: cx, y: cy + (cy > 300 ? -cornerLen : cornerLen) }, thickness: 1.5, color: NEON });
    });

    // Header logo text
    page.drawText("AI COACH", { x: 60, y: 535, size: 14, font: bold, color: NEON });
    page.drawText("PORTAL", { x: 60, y: 520, size: 11, font: reg, color: WHITE });

    const center = (txt: string, y: number, font: any, size: number, color = WHITE) => {
      const w = font.widthOfTextAtSize(txt, size);
      page.drawText(txt, { x: (842 - w) / 2, y, size, font, color });
    };

    // Title
    center("CERTIFICATE", 475, bold, 48, NEON);
    center("OF COMPLETION", 445, reg, 14, WHITE);

    // Ribbon-style "THIS IS TO CERTIFY THAT"
    const ribbonW = 280, ribbonH = 28, ribbonX = (842 - ribbonW) / 2, ribbonY = 405;
    page.drawRectangle({ x: ribbonX, y: ribbonY, width: ribbonW, height: ribbonH, borderColor: NEON, borderWidth: 1 });
    center("THIS IS TO CERTIFY THAT", ribbonY + 9, bold, 11, NEON);

    // Learner name
    center(learnerName, 360, obl, 28, WHITE);
    page.drawLine({ start: { x: 220, y: 350 }, end: { x: 622, y: 350 }, thickness: 0.5, color: NEON, dashArray: [2, 3] });

    // Subline
    center("has successfully completed the course", 320, reg, 13, WHITE);

    // Course name
    center(courseTitle.toUpperCase(), 285, bold, 20, NEON);

    // Divider
    page.drawLine({ start: { x: 60, y: 240 }, end: { x: 782, y: 240 }, thickness: 0.7, color: NEON });

    // Footer band: Issued on | medal | Cert No
    page.drawText("Issued on", { x: 90, y: 200, size: 10, font: bold, color: NEON });
    page.drawText(completionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), { x: 90, y: 182, size: 11, font: reg, color: WHITE });
    page.drawLine({ start: { x: 90, y: 175 }, end: { x: 250, y: 175 }, thickness: 0.5, color: NEON });

    page.drawText("Certificate No.", { x: 580, y: 200, size: 10, font: bold, color: NEON });
    page.drawText(certNumber, { x: 580, y: 182, size: 11, font: reg, color: WHITE });
    page.drawLine({ start: { x: 580, y: 175 }, end: { x: 752, y: 175 }, thickness: 0.5, color: NEON });

    // Center medal (laurel — drawn as concentric circles + stars indicator)
    page.drawCircle({ x: 421, y: 175, size: 38, borderColor: NEON, borderWidth: 1.5 });
    page.drawCircle({ x: 421, y: 175, size: 30, borderColor: NEON, borderWidth: 0.5 });
    page.drawText("★ ★ ★", { x: 396, y: 188, size: 10, font: bold, color: NEON });

    // Signature
    if (sig?.signature_url) {
      try {
        const sigRes = await fetch(sig.signature_url);
        if (sigRes.ok) {
          const sigBytes = new Uint8Array(await sigRes.arrayBuffer());
          let sigImg;
          try { sigImg = await pdf.embedPng(sigBytes); } catch { sigImg = await pdf.embedJpg(sigBytes); }
          const sigW = 140;
          const ratio = sigImg.height / sigImg.width;
          page.drawImage(sigImg, { x: 421 - sigW / 2, y: 110, width: sigW, height: sigW * ratio });
        }
      } catch (e) { console.warn("Signature load failed", e); }
    }
    page.drawLine({ start: { x: 351, y: 105 }, end: { x: 491, y: 105 }, thickness: 0.5, color: WHITE });
    center("Authorized Signature", 92, bold, 10, NEON);
    center(coachName, 78, reg, 11, WHITE);
    center(`${designation}${organization ? " · " + organization : ""}`, 64, reg, 9, MUTED);

    // QR
    const qrImg = await pdf.embedPng(qrPngBytes);
    page.drawImage(qrImg, { x: 740, y: 70, width: 60, height: 60 });
    page.drawText("Scan to verify", { x: 738, y: 58, size: 7, font: reg, color: MUTED });

    // Footer URL
    center("www.aicoachportal.com", 42, reg, 10, NEON);

    const bytes = await pdf.save();
    const path = `${coachId}/${verificationToken}.pdf`;
    const { error: upErr } = await admin.storage.from("certificate-pdfs").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;
    const { data: signed } = await admin.storage.from("certificate-pdfs").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const pdfUrl = signed?.signedUrl || null;

    // Insert
    const { data: inserted, error: insErr } = await admin.from("issued_certificates").insert({
      template_id: fallbackTmpl?.id || null,
      user_id: learner_id,
      coach_id: coachId,
      source_type,
      source_id,
      course_id: source_type === "course" ? source_id : null,
      webinar_id: webinarRowId,
      certificate_number: certNumber,
      verification_token: verificationToken,
      pdf_url: pdfUrl,
      learner_name: learnerName,
      learner_email: learnerEmail,
      course_name: courseTitle,
      coach_name: coachName,
      coach_designation: designation,
      coach_organization: organization,
      coach_signature_url: sig?.signature_url || null,
      duration_text: durationText,
      completion_date: completionDate.toISOString().slice(0, 10),
      status: "valid",
      is_valid: true,
    }).select().single();
    if (insErr) throw insErr;

    // Sync legacy enrollments.certificate_url for backwards-compat
    if (source_type === "course") {
      await admin.from("enrollments").update({ certificate_url: pdfUrl }).eq("learner_id", learner_id).eq("course_id", source_id);
    }

    return json({ pdf_url: pdfUrl, certificate_number: certNumber, verification_token: verificationToken, id: inserted.id });
  } catch (e: any) {
    console.error("issue-certificate error:", e);
    return json({ error: e.message || "Failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
