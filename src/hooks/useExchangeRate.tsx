import { useEffect, useState } from "react";

/**
 * Lightweight USD → INR exchange-rate hook.
 * - Caches in localStorage for 12h
 * - Falls back to a sane default (86) if the API fails
 * - Never throws; safe to call from any component
 */
const CACHE_KEY = "fx_usd_inr_v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const FALLBACK_RATE = 86;

type Cached = { rate: number; ts: number };

let inFlight: Promise<number> | null = null;

const readCache = (): Cached | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.rate || !parsed?.ts) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (rate: number) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
  } catch {}
};

async function fetchRate(): Promise<number> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      const data = await res.json();
      const rate = Number(data?.rates?.INR);
      if (rate && rate > 0) {
        writeCache(rate);
        return rate;
      }
    } catch {}
    const cached = readCache();
    return cached?.rate || FALLBACK_RATE;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function useExchangeRate(): number {
  const initial = readCache()?.rate || FALLBACK_RATE;
  const [rate, setRate] = useState<number>(initial);

  useEffect(() => {
    const cached = readCache();
    const fresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;
    if (fresh) {
      setRate(cached.rate);
      return;
    }
    let cancelled = false;
    fetchRate().then((r) => {
      if (!cancelled) setRate(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return rate;
}

/** Convert an INR amount to the display USD price (INR/rate + 30%). */
export function inrToDisplayUsd(inr: number, rate: number): number {
  if (!inr || inr <= 0) return 0;
  const base = inr / (rate || FALLBACK_RATE);
  return Math.ceil(base * 1.3);
}

/** Convert USD → INR estimate (used when INR is missing). */
export function usdToInr(usd: number, rate: number): number {
  if (!usd || usd <= 0) return 0;
  return Math.round(usd * (rate || FALLBACK_RATE));
}
