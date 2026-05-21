const DEFAULT_TIMEOUT_MS = 12000;

export class RequestTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

export const withTimeout = async <T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new RequestTimeoutError()), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const isNetworkAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return [
    "failed to fetch",
    "networkerror",
    "load failed",
    "timed out",
    "timeout",
    "522",
    "connection terminated",
  ].some((token) => normalized.includes(token));
};

export const getAuthFallbackMessage = (error: unknown) => {
  if (isNetworkAuthError(error)) {
    return {
      title: "Service temporarily unavailable",
      description: "The login service is not responding right now. Please try again in a moment.",
    };
  }

  return {
    title: "Authentication error",
    description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
  };
};

export const retryOnce = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation();
  } catch (error) {
    if (!isNetworkAuthError(error)) throw error;
    return operation();
  }
};

export const resolvePrimaryRole = (roles: Array<string | null | undefined>) => {
  const normalized = roles.filter(Boolean) as string[];
  const priority = ["admin", "coach", "learner"];
  return priority.find((role) => normalized.includes(role)) ?? normalized[0] ?? null;
};