import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DriveConnection = {
  id: string;
  coach_id: string;
  google_account_email: string | null;
  status: "connected" | "expired" | "revoked";
  root_folder_id: string | null;
  subfolder_ids: Record<string, string>;
  quota_total: number | null;
  quota_used: number | null;
  last_sync_at: string | null;
  connected_at: string | null;
};

export function useDriveConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<DriveConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("drive_connections" as any).select("*").eq("coach_id", user.id).maybeSingle();
    setConnection((data as any) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("drive-oauth-start", {
      body: { redirect_origin: window.location.origin },
    });
    if (error || !data?.url) throw new Error(error?.message || "Failed to start OAuth");

    return new Promise<void>((resolve, reject) => {
      const popup = window.open(data.url, "drive-oauth", "width=520,height=640");
      if (!popup) return reject(new Error("Popup blocked"));

      const onMessage = async (evt: MessageEvent) => {
        if (evt.origin !== window.location.origin) return;
        if (evt.data?.type === "drive_oauth_callback" && evt.data.code) {
          window.removeEventListener("message", onMessage);
          try {
            const { error: cbErr } = await supabase.functions.invoke("drive-oauth-callback", {
              body: { code: evt.data.code, redirect_uri: evt.data.redirect_uri },
            });
            if (cbErr) throw cbErr;
            await refresh();
            resolve();
          } catch (e) { reject(e); }
        } else if (evt.data?.type === "drive_oauth_error") {
          window.removeEventListener("message", onMessage);
          reject(new Error(evt.data.error));
        }
      };
      window.addEventListener("message", onMessage);
    });
  }, [refresh]);

  const disconnect = useCallback(async () => {
    const { error } = await supabase.functions.invoke("drive-disconnect");
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const refreshStats = useCallback(async () => {
    await supabase.functions.invoke("drive-storage-stats");
    await refresh();
  }, [refresh]);

  return { connection, loading, connect, disconnect, refresh, refreshStats };
}
