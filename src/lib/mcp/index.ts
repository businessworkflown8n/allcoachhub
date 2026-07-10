import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCourses from "./tools/list-courses";
import searchCoaches from "./tools/search-coaches";
import myEnrollments from "./tools/my-enrollments";
import myProfile from "./tools/my-profile";

// OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time so this stays
// import-safe (no runtime env read at module load).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ai-coach-portal-mcp",
  title: "AI Coach Portal",
  version: "0.1.0",
  instructions:
    "Tools for AI Coach Portal — the AI coaching marketplace. Use `list_courses` and `search_coaches` to explore the public catalog. Authenticated learners can use `my_enrollments` and `my_profile` to access their own data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCourses, searchCoaches, myEnrollments, myProfile],
});
