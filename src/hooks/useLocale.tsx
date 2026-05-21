import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { ALL_COUNTRIES, CountryLocale, DEFAULT_LOCALE, findCountryByCode } from "@/data/countries";
import { supabase } from "@/integrations/supabase/client";

interface LocaleContextValue {
  locale: CountryLocale;
  setLocale: (country: CountryLocale) => void;
  /** Convenience: returns price_inr for INR, price_usd for everything else */
  priceKey: "price_inr" | "price_usd";
  originalPriceKey: "original_price_inr" | "original_price_usd";
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "user_locale_country";

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<CountryLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    // 1. Check sessionStorage (user already chose)
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
      const found = findCountryByCode(cached);
      if (found) { setLocaleState(found); return; }
    }

    // 2. Fetch the admin-configured default country from DB and use it
    const init = async () => {
      let dbDefault: CountryLocale | undefined;
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "default_country")
          .single();
        if (data?.value) {
          dbDefault = findCountryByCode(data.value);
        }
      } catch {}

      // Use the DB default (admin-configured) as the primary fallback
      const fallback = dbDefault || DEFAULT_LOCALE;
      setLocaleState(fallback);
      sessionStorage.setItem(STORAGE_KEY, fallback.code);
    };

    init();
  }, []);

  const setLocale = useCallback((country: CountryLocale) => {
    setLocaleState(country);
    sessionStorage.setItem(STORAGE_KEY, country.code);
  }, []);

  const priceKey = locale.currency === "INR" ? "price_inr" as const : "price_usd" as const;
  const originalPriceKey = locale.currency === "INR" ? "original_price_inr" as const : "original_price_usd" as const;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, priceKey, originalPriceKey }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
};

/** Backwards-compatible hook for existing components using useCurrency */
export const useCurrencyFromLocale = () => {
  const { locale, priceKey, originalPriceKey } = useLocale();
  const isIndia = locale.currency === "INR";
  return {
    currency: isIndia ? "INR" as const : "USD" as const,
    symbol: isIndia ? "₹" : "$",
    priceKey,
    originalPriceKey,
  };
};
