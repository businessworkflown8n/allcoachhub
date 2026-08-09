import { supabase as generatedSupabase } from "./client";

/**
 * Compatibility client used while the connected backend schema is being
 * provisioned. Runtime behavior is identical to the generated client; this
 * keeps legacy table queries usable when generated typings are temporarily
 * empty.
 */
export const supabase = generatedSupabase as any;
