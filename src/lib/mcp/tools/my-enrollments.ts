import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function userSupabase(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_enrollments",
  title: "My enrollments",
  description:
    "List courses the signed-in learner is enrolled in, with progress and payment status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = userSupabase(ctx);
    const { data, error } = await sb
      .from("enrollments")
      .select("id, course_id, progress_percent, payment_status, amount_paid, currency, enrolled_at, completed_at, courses(title, slug, thumbnail_url)")
      .eq("learner_id", ctx.getUserId())
      .order("enrolled_at", { ascending: false })
      .limit(100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { enrollments: data ?? [] },
    };
  },
});
