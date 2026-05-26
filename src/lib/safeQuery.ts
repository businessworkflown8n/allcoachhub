/**
 * safeQuery — thin, opt-in wrapper around Supabase calls.
 *
 * Goal: centralize error handling and logging without changing any existing
 * component code. New service-layer functions use it; legacy components keep
 * working unchanged.
 */
export type SafeResult<T> = { data: T | null; error: Error | null };

export async function safeQuery<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await fn();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[safeQuery${context ? `:${context}` : ""}]`, error.message || error);
      return { data: null, error: new Error(error.message || "Query failed") };
    }
    return { data: data as T, error: null };
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(`[safeQuery${context ? `:${context}` : ""}] threw`, e);
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function withRetry<T>(
  fn: () => Promise<SafeResult<T>>,
  attempts = 2,
  delayMs = 250
): Promise<SafeResult<T>> {
  let last: SafeResult<T> = { data: null, error: new Error("no attempt") };
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (!last.error) return last;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
  }
  return last;
}
