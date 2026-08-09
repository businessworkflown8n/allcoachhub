// Compatibility export for the active backend while generated schema types are unavailable.
// The generated client remains the single runtime connection; this shim only relaxes
// compile-time table inference until the backend schema is introspected again.
import { supabase as generatedSupabase } from "./client";

export const supabase: any = generatedSupabase;
