// AI summary / transcript / tagging. For PDFs we fetch text via Drive; for
// other files we summarize from filename + metadata as a baseline.
import { corsHeaders, adminClient, getCoachFromAuth, getValidAccessToken, driveFetch } from "../_shared/driveAuth.ts";

async function callAI(messages: any[], model = "google/gemini-2.5-flash"): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const coachId = await getCoachFromAuth(req);
    if (!coachId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { file_id } = await req.json();
    const supa = adminClient();
    const { data: f } = await supa.from("drive_files").select("*").eq("id", file_id).eq("coach_id", coachId).maybeSingle();
    if (!f) throw new Error("File not found");

    const token = await getValidAccessToken(coachId);
    let textSample = "";
    // Try to get content for PDF / text / docs (best-effort, ≤200KB)
    if (f.mime_type?.startsWith("text/") || f.mime_type === "application/pdf") {
      try {
        const cr = await driveFetch(token, `/files/${f.drive_file_id}?alt=media`);
        const buf = new Uint8Array(await cr.arrayBuffer());
        const slice = buf.slice(0, 200_000);
        textSample = new TextDecoder("utf-8", { fatal: false }).decode(slice).replace(/[^\x20-\x7E\n\r\t]/g, " ").slice(0, 12000);
      } catch { /* ignore */ }
    }

    const summary = await callAI([
      { role: "system", content: "You summarize learning materials in 3 sentences for a coach's dashboard." },
      { role: "user", content: `File: ${f.name}\nType: ${f.mime_type}\n\nSample:\n${textSample || "(no extractable text)"}` },
    ]);
    const tagText = await callAI([
      { role: "system", content: "Return JSON array of 4-8 lowercase single-word topic tags. JSON only." },
      { role: "user", content: `File: ${f.name}\n${textSample.slice(0, 4000)}` },
    ], "google/gemini-2.5-flash-lite");
    let ai_tags: string[] = [];
    const m = tagText.match(/\[[\s\S]*\]/);
    if (m) { try { ai_tags = JSON.parse(m[0]).slice(0, 8); } catch {} }

    await supa.from("drive_files").update({
      ai_summary: summary.trim(),
      ai_tags: ai_tags.length ? ai_tags : f.ai_tags,
      ai_processed_at: new Date().toISOString(),
    }).eq("id", file_id);

    return new Response(JSON.stringify({ summary, ai_tags }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
