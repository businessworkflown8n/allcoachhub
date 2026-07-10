import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace — keep a tiny local typed wrapper so this compiles.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const supabaseOAuth = (): OAuthNs => (supabase.auth as any).oauth as OAuthNs;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?mode=login&redirect=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await supabaseOAuth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message ?? String(error));
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await supabaseOAuth().approveAuthorization(authorizationId)
      : await supabaseOAuth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message ?? String(error));
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
          <h1 className="mb-2 text-xl font-bold text-foreground">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const redirectUri = details.client?.redirect_uri ?? details.client?.redirect_uris?.[0];
  const scopes: string[] = details.scopes ?? details.requested_scopes ?? [];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">
          Connect {clientName} to AI Coach Portal
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {clientName} will be able to call AI Coach Portal's tools while you are signed in.
        </p>

        {redirectUri && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground break-all">
            Redirects to: <span className="text-foreground">{redirectUri}</span>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm font-medium text-foreground">This app will be able to:</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Read the public course and coach catalog</li>
            <li>• Access your own profile and enrollments</li>
            {scopes.filter((s) => !["openid", "email", "profile"].includes(s)).map((s) => (
              <li key={s}>• Additional permission: {s}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            This does not bypass AI Coach Portal's permissions or backend policies.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="glow-lime flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Working..." : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="w-full rounded-lg border border-border bg-secondary px-4 py-3 font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
