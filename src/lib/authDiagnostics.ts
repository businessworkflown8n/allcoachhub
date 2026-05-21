// Lightweight auth diagnostics: timings, error codes, last request snapshot.
// Persisted in sessionStorage so support can read the last failure quickly.

export type AuthDiagEvent = {
  id: string;
  timestamp: string;
  phase: string; // e.g. "signInWithPassword", "getSession", "roleLookup", "oauth"
  durationMs: number;
  ok: boolean;
  status?: number | string;
  errorName?: string;
  errorMessage?: string;
  errorCode?: string;
  meta?: Record<string, unknown>;
};

const STORAGE_KEY = "auth_diagnostics_log";
const LAST_KEY = "auth_diagnostics_last";
const MAX_EVENTS = 25;

const isBrowser = () => typeof window !== "undefined";

const readLog = (): AuthDiagEvent[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthDiagEvent[]) : [];
  } catch {
    return [];
  }
};

const writeLog = (events: AuthDiagEvent[]) => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* quota — ignore */
  }
};

export const recordAuthEvent = (event: Omit<AuthDiagEvent, "id" | "timestamp">) => {
  const full: AuthDiagEvent = {
    id: Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
    ...event,
  };
  const events = readLog();
  events.push(full);
  writeLog(events);

  if (isBrowser()) {
    try {
      window.sessionStorage.setItem(LAST_KEY, JSON.stringify(full));
    } catch {
      /* ignore */
    }
  }

  // Console output — grouped for easy scanning in DevTools
  const tag = full.ok ? "✅ AUTH" : "❌ AUTH";
  const style = full.ok
    ? "color:#16a34a;font-weight:bold"
    : "color:#dc2626;font-weight:bold";
  // eslint-disable-next-line no-console
  console.groupCollapsed(`%c${tag} ${full.phase} (${full.durationMs}ms)`, style);
  // eslint-disable-next-line no-console
  console.log("event", full);
  if (!full.ok) {
    // eslint-disable-next-line no-console
    console.warn("error", full.errorName, full.errorMessage, "code:", full.errorCode, "status:", full.status);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();

  return full;
};

export const instrumentAuthCall = async <T>(
  phase: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    // Supabase-style results carry { data, error }
    const maybe = result as unknown as { error?: { message?: string; status?: number; name?: string; code?: string } };
    if (maybe && typeof maybe === "object" && "error" in maybe && maybe.error) {
      recordAuthEvent({
        phase,
        durationMs: duration,
        ok: false,
        status: maybe.error.status,
        errorName: maybe.error.name,
        errorMessage: maybe.error.message,
        errorCode: maybe.error.code,
        meta,
      });
    } else {
      recordAuthEvent({ phase, durationMs: duration, ok: true, meta });
    }
    return result;
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    const e = err as { name?: string; message?: string; code?: string; status?: number };
    recordAuthEvent({
      phase,
      durationMs: duration,
      ok: false,
      status: e?.status,
      errorName: e?.name ?? "Error",
      errorMessage: e?.message ?? String(err),
      errorCode: e?.code,
      meta,
    });
    throw err;
  }
};

export const getAuthDiagnostics = () => ({
  events: readLog(),
  last: (() => {
    if (!isBrowser()) return null;
    try {
      const raw = window.sessionStorage.getItem(LAST_KEY);
      return raw ? (JSON.parse(raw) as AuthDiagEvent) : null;
    } catch {
      return null;
    }
  })(),
});

export const clearAuthDiagnostics = () => {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(LAST_KEY);
};

// Expose globally for support: `__authDiag()` in browser console.
if (isBrowser()) {
  (window as unknown as { __authDiag?: () => unknown }).__authDiag = () => {
    const snapshot = getAuthDiagnostics();
    // eslint-disable-next-line no-console
    console.table(snapshot.events);
    return snapshot;
  };
}
