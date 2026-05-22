import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { user } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(4);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const dashboardHref = user ? "/learner" : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        {sessionId ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Payment successful</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We're activating your purchase now. You'll receive an email confirmation shortly.
            </p>
            <p className="mt-4 text-xs text-muted-foreground/70">Session: {sessionId.slice(0, 24)}…</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to={dashboardHref}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
              >
                Go to dashboard
              </Link>
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
                Back to home
              </Link>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No session information found.</p>
            <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
              Return home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
