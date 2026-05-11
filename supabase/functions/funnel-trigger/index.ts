import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { lead_id, landing_page_id } = await req.json();
    if (!lead_id || !landing_page_id) {
      return new Response(JSON.stringify({ error: "lead_id and landing_page_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is the owning coach of the landing page (or admin)
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userRes?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: lp } = await supabase.from("landing_pages").select("coach_id").eq("id", landing_page_id).single();
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const isAdmin = !!roleRow;
    if (!lp || (lp.coach_id !== userId && !isAdmin)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get funnel config for this landing page
    const { data: config } = await supabase
      .from("funnel_config")
      .select("*")
      .eq("landing_page_id", landing_page_id)
      .single();

    if (!config || !config.is_enabled) {
      return new Response(JSON.stringify({ message: "Funnel not enabled for this page" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get lead info
    const { data: lead } = await supabase
      .from("landing_page_leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log lead_created event
    await supabase.from("funnel_events").insert({
      lead_id, landing_page_id, event_type: "lead_created",
      metadata: { name: lead.name, email: lead.email },
    });

    const now = new Date();
    const jobs = [];

    // Welcome email job (immediate)
    jobs.push({
      lead_id, landing_page_id, job_type: "welcome_email",
      status: "pending", scheduled_at: now.toISOString(),
    });

    // Day 1 email
    if (config.day1_enabled) {
      const d1 = new Date(now.getTime() + (config.day1_delay_hours || 24) * 3600000);
      jobs.push({
        lead_id, landing_page_id, job_type: "day1_email",
        status: "pending", scheduled_at: d1.toISOString(),
      });
    }

    // Day 2 email
    if (config.day2_enabled) {
      const d2 = new Date(now.getTime() + (config.day2_delay_hours || 48) * 3600000);
      jobs.push({
        lead_id, landing_page_id, job_type: "day2_email",
        status: "pending", scheduled_at: d2.toISOString(),
      });
    }

    // Day 3 email
    if (config.day3_enabled) {
      const d3 = new Date(now.getTime() + (config.day3_delay_hours || 72) * 3600000);
      jobs.push({
        lead_id, landing_page_id, job_type: "day3_email",
        status: "pending", scheduled_at: d3.toISOString(),
      });
    }

    // WhatsApp welcome (if enabled)
    if (config.whatsapp_enabled) {
      jobs.push({
        lead_id, landing_page_id, job_type: "welcome_whatsapp",
        status: "pending", scheduled_at: now.toISOString(),
      });
    }

    // Insert all jobs
    const { error: jobError } = await supabase.from("funnel_jobs").insert(jobs);
    if (jobError) {
      console.error("Failed to insert funnel jobs:", jobError);
      return new Response(JSON.stringify({ error: "Failed to create funnel jobs" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update lead status to engaged
    await supabase.from("landing_page_leads").update({ lead_status: "engaged" }).eq("id", lead_id);

    return new Response(JSON.stringify({ success: true, jobs_created: jobs.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Funnel trigger error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
