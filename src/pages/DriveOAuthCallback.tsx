import { useEffect } from "react";

// Dedicated Google Drive OAuth callback (popup). Posts code back to opener.
const DriveOAuthCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const state = params.get("state");

    if (window.opener) {
      window.opener.postMessage(
        code
          ? { type: "drive_oauth_callback", code, state, redirect_uri: `${window.location.origin}/oauth/google-drive/callback` }
          : { type: "drive_oauth_error", error: error || "Authorization failed" },
        window.location.origin
      );
    }
    setTimeout(() => window.close(), 1200);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Connecting Google Drive…</p>
        <p className="text-xs text-muted-foreground">This window will close automatically.</p>
      </div>
    </div>
  );
};

export default DriveOAuthCallback;
