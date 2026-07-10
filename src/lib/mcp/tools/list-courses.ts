import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function anonSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "list_courses",
  title: "List courses",
  description:
    "List published, approved courses on AI Coach Portal. Optional search by keyword and filter by category or level.",
  inputSchema: {
    search: z.string().trim().optional().describe("Keyword to search title/subtitle/description."),
    category: z.string().trim().optional().describe("Category slug or name to filter by."),
    level: z.string().trim().optional().describe("Course level (e.g. Beginner, Intermediate, Advanced)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, category, level, limit }) => {
    const sb = anonSupabase();
    let q = sb
      .from("courses")
      .select("id, slug, title, subtitle, category, level, language, duration_hours, price_usd, price_inr, thumbnail_url")
      .eq("is_published", true)
      .eq("approval_status", "approved")
      .limit(limit ?? 20);
    if (search) q = q.or(`title.ilike.%${search}%,subtitle.ilike.%${search}%,description.ilike.%${search}%`);
    if (category) q = q.ilike("category", `%${category}%`);
    if (level) q = q.ilike("level", `%${level}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
