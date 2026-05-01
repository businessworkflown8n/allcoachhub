import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { course_id } = await req.json();
    if (!course_id) return new Response(JSON.stringify({ error: "course_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify completion
    const { data: enr } = await admin.from("enrollments").select("*").eq("learner_id", user.id).eq("course_id", course_id).maybeSingle();
    if (!enr || Number(enr.progress_percent) < 100) {
      return new Response(JSON.stringify({ error: "Course not completed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Reuse if already issued
    const { data: existing } = await admin.from("issued_certificates").select("*").eq("user_id", user.id).eq("course_id", course_id).maybeSingle();
    if (existing?.pdf_url) {
      return new Response(JSON.stringify({ pdf_url: existing.pdf_url, certificate_number: existing.certificate_number }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: course } = await admin.from("courses").select("title, coach_id").eq("id", course_id).single();
    const learnerName = enr.full_name || user.email || "Learner";
    const certNumber = `ACP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const issuedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Build PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]); // A4 landscape
    const helv = await pdf.embedFont(StandardFonts.HelveticaBold);
    const helvR = await pdf.embedFont(StandardFonts.Helvetica);
    const lime = rgb(0.78, 1, 0.32);
    const dark = rgb(0.05, 0.06, 0.10);
    const text = rgb(0.95, 0.95, 0.95);

    // Background
    page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: dark });
    // Border
    page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderColor: lime, borderWidth: 3 });
    page.drawRectangle({ x: 36, y: 36, width: 770, height: 523, borderColor: lime, borderWidth: 1 });

    const center = (txt: string, y: number, font: any, size: number, color = text) => {
      const w = font.widthOfTextAtSize(txt, size);
      page.drawText(txt, { x: (842 - w) / 2, y, size, font, color });
    };

    center("CERTIFICATE OF COMPLETION", 470, helv, 28, lime);
    center("AI Coach Portal", 440, helvR, 12, text);
    center("This is to certify that", 380, helvR, 14, text);
    center(learnerName, 340, helv, 32, text);
    center("has successfully completed the course", 290, helvR, 14, text);
    center(course?.title || "Course", 250, helv, 22, lime);
    center(`Issued on ${issuedDate}`, 180, helvR, 12, text);
    center(`Certificate No: ${certNumber}`, 160, helvR, 10, text);
    center("www.aicoachportal.com", 80, helvR, 10, lime);

    const bytes = await pdf.save();
    const path = `${user.id}/${course_id}-${certNumber}.pdf`;
    const { error: upErr } = await admin.storage.from("certificates").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = admin.storage.from("certificates").getPublicUrl(path);

    // Find or create a default template (issued_certificates requires template_id)
    let templateId: string | null = null;
    const { data: tmpl } = await admin.from("certificate_templates").select("id").eq("coach_id", course!.coach_id).limit(1).maybeSingle();
    if (tmpl) templateId = tmpl.id;
    else {
      const { data: newTmpl } = await admin.from("certificate_templates").insert({ coach_id: course!.coach_id, title: "Default Auto-Generated", course_id }).select("id").single();
      templateId = newTmpl?.id || null;
    }

    if (templateId) {
      await admin.from("issued_certificates").insert({
        template_id: templateId, user_id: user.id, course_id, certificate_number: certNumber, pdf_url: pub.publicUrl,
      });
    }
    await admin.from("enrollments").update({ certificate_url: pub.publicUrl }).eq("id", enr.id);

    return new Response(JSON.stringify({ pdf_url: pub.publicUrl, certificate_number: certNumber }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("generate-certificate error:", e);
    return new Response(JSON.stringify({ error: e.message || "Failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
