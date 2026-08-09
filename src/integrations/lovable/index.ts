// Kept for compatibility with any remaining imports.
// OAuth now uses native supabase.auth (see LoginForm) so Lovable Cloud is not required.

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft", opts?: SignInOptions) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri,
          queryParams: opts?.extraParams,
        },
      });
      if (error) {
        return { error };
      }
      return { data, redirected: true };
    },
  },
};
