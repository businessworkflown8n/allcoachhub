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
  name: "search_coaches",
  title: "Search coaches",
  description:
    "Search public coach profiles on AI Coach Portal by keyword, category, city, or country.",
  inputSchema: {
    search: z.string().trim().optional().describe("Keyword matched against name, bio, job title."),
    category: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, category, city, country, limit }) => {
    const sb = anonSupabase();
    let q = sb
      .from("coach_public_profiles")
      .select("id, user_id, full_name, slug, avatar_url, bio, category, job_title, company_name, industry, country, city, tags")
      .limit(limit ?? 20);
    if (search) q = q.or(`full_name.ilike.%${search}%,bio.ilike.%${search}%,job_title.ilike.%${search}%`);
    if (category) q = q.ilike("category", `%${category}%`);
    if (city) q = q.ilike("city", `%${city}%`);
    if (country) q = q.ilike("country", `%${country}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { coaches: data ?? [] },
    };
  },
});
