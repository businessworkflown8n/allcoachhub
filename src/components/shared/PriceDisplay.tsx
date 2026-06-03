import { useLocale } from "@/hooks/useLocale";
import { inrToDisplayUsd, usdToInr, useExchangeRate } from "@/hooks/useExchangeRate";

interface PriceDisplayProps {
  priceInr?: number | null;
  priceUsd?: number | null;
  originalPriceInr?: number | null;
  originalPriceUsd?: number | null;
  /** Visual size for the primary price */
  size?: "sm" | "md" | "lg" | "xl";
  /** Render layout: stacked (default) or inline */
  layout?: "stack" | "inline";
  /** Optional prefix shown before primary (e.g. "From ") */
  prefix?: string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}

const PRIMARY_SIZE: Record<NonNullable<PriceDisplayProps["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl sm:text-4xl",
};

const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const formatUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Dual-currency price display.
 *
 * - India locale → INR primary (large/bold), USD secondary (small/muted)
 * - Other locales → USD primary, INR secondary
 *
 * USD display is always derived from INR using live exchange rate + 30% margin
 * (per platform pricing policy). Falls back to stored USD when INR is missing.
 */
const PriceDisplay = ({
  priceInr,
  priceUsd,
  originalPriceInr,
  originalPriceUsd,
  size = "md",
  layout = "stack",
  prefix,
  className = "",
  primaryClassName = "",
  secondaryClassName = "",
}: PriceDisplayProps) => {
  const { locale } = useLocale();
  const rate = useExchangeRate();
  const isIndia = locale.currency === "INR";

  const inr = Number(priceInr || 0);
  const usdStored = Number(priceUsd || 0);
  // INR is the source of truth; derive USD from INR when available.
  const inrEffective = inr > 0 ? inr : usdToInr(usdStored, rate);
  const usdEffective = inr > 0 ? inrToDisplayUsd(inr, rate) : usdStored;

  const origInr = Number(originalPriceInr || 0);
  const origUsdStored = Number(originalPriceUsd || 0);
  const origInrEffective = origInr > 0 ? origInr : usdToInr(origUsdStored, rate);
  const origUsdEffective = origInr > 0 ? inrToDisplayUsd(origInr, rate) : origUsdStored;

  if (inrEffective <= 0 && usdEffective <= 0) {
    return <span className={`font-bold text-foreground ${PRIMARY_SIZE[size]} ${primaryClassName}`}>Free</span>;
  }

  const primaryText = isIndia ? formatINR(inrEffective) : formatUSD(usdEffective);
  const secondaryText = isIndia ? formatUSD(usdEffective) : formatINR(inrEffective);
  const primaryOrig = isIndia
    ? origInrEffective > inrEffective
      ? formatINR(origInrEffective)
      : null
    : origUsdEffective > usdEffective
      ? formatUSD(origUsdEffective)
      : null;
  const secondaryOrig = isIndia
    ? origUsdEffective > usdEffective
      ? formatUSD(origUsdEffective)
      : null
    : origInrEffective > inrEffective
      ? formatINR(origInrEffective)
      : null;

  const wrapper = layout === "inline" ? "inline-flex items-baseline gap-2" : "flex flex-col leading-tight";

  return (
    <div className={`${wrapper} ${className}`}>
      <span className={`inline-flex items-baseline gap-2 font-bold text-primary ${PRIMARY_SIZE[size]} ${primaryClassName}`}>
        {prefix && <span className="text-xs font-medium text-muted-foreground">{prefix}</span>}
        <span>{primaryText}</span>
        {primaryOrig && (
          <span className="text-xs font-medium text-muted-foreground line-through sm:text-sm">{primaryOrig}</span>
        )}
      </span>
      {secondaryText && (
        <span className={`inline-flex items-baseline gap-1.5 text-xs text-muted-foreground sm:text-sm ${secondaryClassName}`}>
          <span>{secondaryText}</span>
          {secondaryOrig && <span className="line-through opacity-70">{secondaryOrig}</span>}
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;
