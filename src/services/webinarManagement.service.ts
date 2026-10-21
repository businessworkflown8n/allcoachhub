import { supabase } from "@/integrations/supabase/compatClient";

export type WebinarManagementAction = "list" | "save_draft" | "discard_draft" | "publish" | "retry";

export interface WebinarManagementResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/** Calls the webinar-management edge function and normalises its error shape. */
export async function callWebinarManagement<T = any>(
  action: WebinarManagementAction,
  body: Record<string, unknown> = {},
): Promise<WebinarManagementResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke("webinar-management", { body: { action, ...body } });
    if (!error && data?.success) return { ok: true, data };
    const res: Response | undefined = error?.context instanceof Response ? error.context : undefined;
    if (res) {
      const parsed = await res.clone().json().catch(() => null);
      if (parsed?.error) return { ok: false, error: String(parsed.error), code: parsed.code };
      return { ok: false, error: `Webinar service error (HTTP ${res.status})` };
    }
    return { ok: false, error: data?.error ?? error?.message ?? "Could not reach the webinar service.", code: data?.code };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Could not reach the webinar service." };
  }
}
