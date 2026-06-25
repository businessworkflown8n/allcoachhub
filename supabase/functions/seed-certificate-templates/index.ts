import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedTemplate {
  name: string;
  category: string;
  orientation: "landscape" | "portrait";
  is_premium?: boolean;
  style_tags?: string[];
  design_config: Record<string, unknown>;
  supported_sources?: string[];
}

const ALL_SOURCES = ["course", "webinar", "workshop", "masterclass", "challenge", "membership", "event"];

const TEMPLATES: SeedTemplate[] = [
  // Professional Corporate (4)
  { name: "Corporate White & Gold", category: "corporate", orientation: "landscape", style_tags: ["elegant"],
    design_config: { primaryColor: "#0B1A3A", accentColor: "#C9A14A", borderColor: "#C9A14A", borderStyle: "classic", certificateTitle: "Certificate of Achievement", footerText: "Issued via AI Coach Portal" } },
  { name: "Corporate Navy & Gold", category: "corporate", orientation: "landscape", style_tags: ["premium"], is_premium: true,
    design_config: { primaryColor: "#0F2A5A", accentColor: "#D4AF37", backgroundColor: "#F9F7F1", borderColor: "#D4AF37", borderStyle: "double", certificateTitle: "Certificate of Excellence" } },
  { name: "Corporate Black & Silver", category: "corporate", orientation: "landscape", style_tags: ["modern"],
    design_config: { primaryColor: "#111", accentColor: "#9CA3AF", borderColor: "#9CA3AF", borderStyle: "minimal", certificateTitle: "Certificate of Completion" } },
  { name: "Corporate Deep Blue", category: "corporate", orientation: "portrait", style_tags: ["formal"],
    design_config: { primaryColor: "#0E2A47", accentColor: "#B89B5E", borderStyle: "classic", certificateTitle: "Certificate of Recognition" } },

  // AI Certification (5)
  { name: "AI Neural Network", category: "ai", orientation: "landscape", style_tags: ["futuristic"], is_premium: true,
    design_config: { primaryColor: "#0A1128", accentColor: "#00D4FF", textColor: "#0A1128", borderColor: "#00D4FF", borderStyle: "minimal", certificateTitle: "AI Certification", badgeText: "Artificial Intelligence" } },
  { name: "Cyber Grid", category: "ai", orientation: "landscape", style_tags: ["tech"],
    design_config: { primaryColor: "#1A0F3D", accentColor: "#A855F7", borderColor: "#A855F7", borderStyle: "minimal", certificateTitle: "AI Certified", badgeText: "Generative AI" } },
  { name: "Holographic Lines", category: "ai", orientation: "landscape", style_tags: ["holographic"], is_premium: true,
    design_config: { primaryColor: "#001F3F", accentColor: "#7DF9FF", borderColor: "#7DF9FF", borderStyle: "double", certificateTitle: "AI Mastery", badgeText: "Prompt Engineering" } },
  { name: "Digital Brain", category: "ai", orientation: "portrait", style_tags: ["abstract"],
    design_config: { primaryColor: "#0B0B2A", accentColor: "#22D3EE", borderColor: "#22D3EE", borderStyle: "minimal", certificateTitle: "AI Practitioner" } },
  { name: "Neon Glow AI", category: "ai", orientation: "landscape", style_tags: ["neon"], is_premium: true,
    design_config: { primaryColor: "#020617", accentColor: "#C7FF3D", textColor: "#020617", backgroundColor: "#0F172A", borderColor: "#C7FF3D", borderStyle: "double", certificateTitle: "Certified AI Expert", footerText: "AI Coach Portal" } },

  // Modern Minimal (3)
  { name: "Minimal White", category: "minimal", orientation: "landscape", style_tags: ["clean"],
    design_config: { primaryColor: "#111", accentColor: "#111", borderColor: "#E5E7EB", borderStyle: "minimal", certificateTitle: "Certificate" } },
  { name: "Minimal Off-White", category: "minimal", orientation: "landscape", style_tags: ["soft"],
    design_config: { primaryColor: "#1F2937", accentColor: "#6B7280", backgroundColor: "#FAFAF7", borderColor: "#D1D5DB", borderStyle: "minimal" } },
  { name: "Minimal Mono", category: "minimal", orientation: "portrait", style_tags: ["typographic"],
    design_config: { primaryColor: "#000", accentColor: "#000", borderColor: "#000", borderStyle: "minimal", titleFontFamily: "'Inter', sans-serif" } },

  // Luxury (3)
  { name: "Luxury Gold Foil", category: "luxury", orientation: "landscape", style_tags: ["gold"], is_premium: true,
    design_config: { primaryColor: "#1A1208", accentColor: "#D4AF37", borderColor: "#D4AF37", backgroundColor: "#FFF8E7", borderStyle: "ornate", certificateTitle: "Certificate of Distinction" } },
  { name: "Luxury Marble", category: "luxury", orientation: "landscape", style_tags: ["marble"], is_premium: true,
    design_config: { primaryColor: "#2A1810", accentColor: "#B89B5E", borderColor: "#B89B5E", borderStyle: "double", certificateTitle: "Certificate of Excellence" } },
  { name: "Luxury Ribbon", category: "luxury", orientation: "portrait", style_tags: ["ribbon"], is_premium: true,
    design_config: { primaryColor: "#3B0A0A", accentColor: "#C9A14A", borderColor: "#C9A14A", borderStyle: "ribbon", certificateTitle: "Award of Honor" } },

  // Education (3)
  { name: "Academy Classic", category: "education", orientation: "landscape", style_tags: ["academic"],
    design_config: { primaryColor: "#1E3A8A", accentColor: "#B45309", borderColor: "#B45309", borderStyle: "double", certificateTitle: "Certificate of Completion" } },
  { name: "University Crest", category: "education", orientation: "landscape", style_tags: ["formal"],
    design_config: { primaryColor: "#7F1D1D", accentColor: "#C9A14A", borderColor: "#7F1D1D", borderStyle: "ornate", certificateTitle: "Diploma" } },
  { name: "Bootcamp Modern", category: "education", orientation: "landscape", style_tags: ["bootcamp"],
    design_config: { primaryColor: "#0E7490", accentColor: "#F59E0B", borderColor: "#0E7490", borderStyle: "minimal", certificateTitle: "Bootcamp Completion" } },

  // Creative (3)
  { name: "Creative Blocks", category: "creative", orientation: "landscape", style_tags: ["colorful"],
    design_config: { primaryColor: "#9333EA", accentColor: "#F472B6", borderColor: "#F472B6", borderStyle: "minimal", certificateTitle: "Certificate of Creativity" } },
  { name: "Geometry Bold", category: "creative", orientation: "landscape", style_tags: ["geometric"],
    design_config: { primaryColor: "#1F2937", accentColor: "#EF4444", borderColor: "#EF4444", borderStyle: "minimal", certificateTitle: "Creative Achievement" } },
  { name: "Pastel Abstract", category: "creative", orientation: "portrait", style_tags: ["abstract"],
    design_config: { primaryColor: "#4C1D95", accentColor: "#A78BFA", borderColor: "#A78BFA", backgroundColor: "#FAF5FF", borderStyle: "minimal" } },

  // Webinar (3)
  { name: "Webinar Participation Classic", category: "webinar", orientation: "landscape", style_tags: ["webinar"],
    design_config: { primaryColor: "#0B1A3A", accentColor: "#3B82F6", borderColor: "#3B82F6", borderStyle: "classic", certificateTitle: "Certificate of Participation", badgeText: "Webinar" } },
  { name: "Webinar Modern Blue", category: "webinar", orientation: "landscape", style_tags: ["modern"],
    design_config: { primaryColor: "#1E40AF", accentColor: "#60A5FA", borderColor: "#60A5FA", borderStyle: "minimal", certificateTitle: "Webinar Attendance", badgeText: "Live Webinar" } },
  { name: "Webinar Premium Dark", category: "webinar", orientation: "landscape", style_tags: ["dark"], is_premium: true,
    design_config: { primaryColor: "#F9FAFB", accentColor: "#C7FF3D", textColor: "#F9FAFB", backgroundColor: "#0B0F1A", borderColor: "#C7FF3D", borderStyle: "double", certificateTitle: "Certificate of Attendance" } },

  // Course Completion (3)
  { name: "Course Completion Gold", category: "course", orientation: "landscape", style_tags: ["completion"],
    design_config: { primaryColor: "#0B1A3A", accentColor: "#D4AF37", borderColor: "#D4AF37", borderStyle: "classic", certificateTitle: "Certificate of Completion", badgeText: "Course" } },
  { name: "Course Completion Modern", category: "course", orientation: "landscape", style_tags: ["modern"],
    design_config: { primaryColor: "#0F766E", accentColor: "#14B8A6", borderColor: "#14B8A6", borderStyle: "minimal", certificateTitle: "Course Completed" } },
  { name: "Course Completion Portrait", category: "course", orientation: "portrait", style_tags: ["portrait"],
    design_config: { primaryColor: "#1E3A8A", accentColor: "#F59E0B", borderColor: "#F59E0B", borderStyle: "classic", certificateTitle: "Certificate of Completion" } },

  // Workshop (3)
  { name: "Workshop Classic", category: "workshop", orientation: "landscape", style_tags: ["workshop"],
    design_config: { primaryColor: "#7C2D12", accentColor: "#F97316", borderColor: "#F97316", borderStyle: "classic", certificateTitle: "Workshop Completion", badgeText: "Workshop" } },
  { name: "Masterclass Premium", category: "workshop", orientation: "landscape", style_tags: ["masterclass"], is_premium: true,
    design_config: { primaryColor: "#111827", accentColor: "#D4AF37", borderColor: "#D4AF37", borderStyle: "ornate", certificateTitle: "Masterclass Certificate", badgeText: "Masterclass" } },
  { name: "Workshop Modern", category: "workshop", orientation: "landscape", style_tags: ["modern"],
    design_config: { primaryColor: "#0E7490", accentColor: "#06B6D4", borderColor: "#06B6D4", borderStyle: "minimal", certificateTitle: "Workshop Achievement" } },

  // Premium Dark (3)
  { name: "Matte Black & Gold", category: "dark", orientation: "landscape", style_tags: ["dark", "gold"], is_premium: true,
    design_config: { primaryColor: "#F9FAFB", accentColor: "#D4AF37", textColor: "#F9FAFB", backgroundColor: "#0A0A0A", borderColor: "#D4AF37", borderStyle: "double", certificateTitle: "Certificate of Excellence" } },
  { name: "Dark Neon Lime", category: "dark", orientation: "landscape", style_tags: ["neon"], is_premium: true,
    design_config: { primaryColor: "#F9FAFB", accentColor: "#C7FF3D", textColor: "#F9FAFB", backgroundColor: "#0B0F1A", borderColor: "#C7FF3D", borderStyle: "minimal", certificateTitle: "Certified Achievement" } },
  { name: "Dark Metallic", category: "dark", orientation: "portrait", style_tags: ["metallic"], is_premium: true,
    design_config: { primaryColor: "#E5E7EB", accentColor: "#A1A1AA", textColor: "#E5E7EB", backgroundColor: "#18181B", borderColor: "#A1A1AA", borderStyle: "double", certificateTitle: "Certificate of Honor" } },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let inserted = 0;
    for (const t of TEMPLATES) {
      const { data: existing } = await service.from("certificate_templates").select("id").eq("name", t.name).eq("is_system", true).maybeSingle();
      if (existing) continue;
      const { error } = await service.from("certificate_templates").insert({
        name: t.name,
        category: t.category,
        orientation: t.orientation,
        style_tags: t.style_tags ?? [],
        is_premium: t.is_premium ?? false,
        is_active: true,
        is_system: true,
        supported_sources: t.supported_sources ?? ALL_SOURCES,
        design_config: t.design_config,
      });
      if (!error) inserted++;
    }

    return new Response(JSON.stringify({ inserted, total: TEMPLATES.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
