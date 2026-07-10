import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function userSupabase(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_profile",
  title: "My profile",
  description: "Return the signed-in user's profile record from AI Coach Portal.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = userSupabase(ctx);
    const [{ data: profile, error: pErr }, { data: roles }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", ctx.getUserId()).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", ctx.getUserId()),
    ]);
    if (pErr) return { content: [{ type: "text", text: pErr.message }], isError: true };
    const result = { profile, roles: (roles ?? []).map((r: any) => r.role), email: ctx.getUserEmail() };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
