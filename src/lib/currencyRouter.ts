// Currency routing. Default/primary currency is INR (India-first).
// Non-IN visitors fall back to USD only when we can confidently detect
// their country isn't IN; otherwise we keep INR as the default.

const KEY = "payments_currency_v1";
const COUNTRY_KEY = "payments_country_v1";

export type SupportedCurrency = "INR" | "USD";

export const DEFAULT_CURRENCY: SupportedCurrency = "INR";

export async function detectCurrency(): Promise<SupportedCurrency> {
  try {
    const cached = localStorage.getItem(KEY);
    if (cached === "INR" || cached === "USD") return cached;

    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
    const text = await res.text();
    const match = text.match(/loc=([A-Z]{2})/);
    const country = match?.[1];
    // Primary is INR. Only switch to USD when we positively detect a
    // non-IN country. Unknown/failed detection stays INR.
    const currency: SupportedCurrency = !country || country === "IN" ? "INR" : "USD";

    localStorage.setItem(KEY, currency);
    if (country) localStorage.setItem(COUNTRY_KEY, country);
    return currency;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function getCachedCurrency(): SupportedCurrency {
  const c = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  return c === "USD" ? "USD" : DEFAULT_CURRENCY;
}

export function priceForCurrency(course: { price_usd?: number | null; price_inr?: number | null }, currency: SupportedCurrency): number {
  return currency === "INR"
    ? Number(course.price_inr || 0)
    : Number(course.price_usd || 0);
}
