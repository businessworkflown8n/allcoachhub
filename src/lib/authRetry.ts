// Retry helper for transient Supabase auth/network failures.
// Retries only on network-level errors (Failed to fetch / TypeError / 5xx),
// never on credential errors so we don't lock users out or spam the backend.

export type RetryableResult<T> = { data: T | null; error: any | null };

const isTransient = (err: any): boolean => {
  if (!err) return false;
  const msg = String(err?.message || err).toLowerCase();
  if (err?.name === "TypeError") return true;
  if (msg.includes("failed to fetch")) return true;
  if (msg.includes("networkerror")) return true;
  if (msg.includes("load failed")) return true;
  if (msg.includes("timeout")) return true;
  if (msg.includes("temporarily unavailable")) return true;
  const status = err?.status ?? err?.statusCode;
  if (typeof status === "number" && status >= 500 && status < 600) return true;
  return false;
};

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });

export async function withAuthRetry<T>(
  fn: () => Promise<RetryableResult<T>>,
  opts: { retries?: number; timeoutMs?: number; backoffMs?: number } = {}
): Promise<RetryableResult<T>> {
  const { retries = 2, timeoutMs = 15000, backoffMs = 800 } = opts;
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withTimeout(fn(), timeoutMs);
      if (res.error && isTransient(res.error) && attempt < retries) {
        lastErr = res.error;
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (!isTransient(e) || attempt === retries) {
        return { data: null, error: e };
      }
      await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
    }
  }
  return { data: null, error: lastErr };
}

export const friendlyAuthError = (err: any): { title: string; description: string } => {
  const msg = String(err?.message || err || "").toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
    return {
      title: "Incorrect email or password",
      description: "Please check your credentials and try again.",
    };
  }
  if (isTransient(err)) {
    return {
      title: "Connection issue",
      description:
        "We couldn't reach the login service. Check your internet connection and try again in a few seconds.",
    };
  }
  return { title: "Login failed", description: err?.message || "Something went wrong. Please try again." };
};
