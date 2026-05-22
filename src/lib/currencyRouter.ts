// Detects buyer country via Cloudflare's trace endpoint (works in browser).
// Returns "INR" for India, "USD" for everyone else. Cached in localStorage.

const KEY = "payments_currency_v1";
const COUNTRY_KEY = "payments_country_v1";

export type SupportedCurrency = "INR" | "USD";

export async function detectCurrency(): Promise<SupportedCurrency> {
  try {
    const cached = localStorage.getItem(KEY);
    if (cached === "INR" || cached === "USD") return cached;

    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
    const text = await res.text();
    const match = text.match(/loc=([A-Z]{2})/);
    const country = match?.[1] || "US";
    const currency: SupportedCurrency = country === "IN" ? "INR" : "USD";

    localStorage.setItem(KEY, currency);
    localStorage.setItem(COUNTRY_KEY, country);
    return currency;
  } catch {
    return "USD";
  }
}

export function getCachedCurrency(): SupportedCurrency {
  const c = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  return c === "INR" ? "INR" : "USD";
}

export function priceForCurrency(course: { price_usd?: number | null; price_inr?: number | null }, currency: SupportedCurrency): number {
  return currency === "INR"
    ? Number(course.price_inr || 0)
    : Number(course.price_usd || 0);
}
