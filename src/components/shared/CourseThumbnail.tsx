import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  alt: string;
  /** Course / item title used to render a branded fallback cover */
  title?: string;
  /** Tailwind classes for the outer aspect-ratio container */
  className?: string;
  /** Tailwind classes for the <img> itself (e.g. hover scale) */
  imgClassName?: string;
  /** Set true for above-the-fold/LCP thumbnails (first row) */
  priority?: boolean;
  /** sizes attribute — defaults assume card grid */
  sizes?: string;
  /** rounded corners on the container */
  rounded?: string;
}

const BREAKPOINTS = [320, 640, 960, 1280];

/**
 * Detect Supabase storage public URLs and rewrite them to use the
 * on-the-fly image transformer (`/render/image/public/...`) which supports
 * width, quality and WebP output. Falls back to the original URL on any
 * other host.
 */
const buildSupabaseSrc = (url: string, width: number) => {
  try {
    const u = new URL(url);
    if (!u.pathname.includes("/storage/v1/object/")) return null;
    u.pathname = u.pathname.replace(
      "/storage/v1/object/",
      "/storage/v1/render/image/",
    );
    u.searchParams.set("width", String(width));
    u.searchParams.set("quality", "75");
    u.searchParams.set("resize", "contain");
    return u.toString();
  } catch {
    return null;
  }
};

const buildSrcSet = (url: string) => {
  const parts = BREAKPOINTS.map((w) => {
    const transformed = buildSupabaseSrc(url, w);
    return transformed ? `${transformed} ${w}w` : null;
  }).filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : undefined;
};

// Deterministic gradient palette per title — looks branded, never random flicker.
const GRADIENTS: [string, string, string][] = [
  ["#7C3AED", "#2563EB", "#06B6D4"], // violet → blue → cyan
  ["#06B6D4", "#10B981", "#84CC16"], // cyan → emerald → lime
  ["#F59E0B", "#EF4444", "#DB2777"], // amber → red → pink
  ["#0EA5E9", "#6366F1", "#8B5CF6"], // sky → indigo → purple
  ["#10B981", "#0EA5E9", "#6366F1"], // emerald → sky → indigo
  ["#F43F5E", "#8B5CF6", "#3B82F6"], // rose → violet → blue
  ["#84CC16", "#22C55E", "#0EA5E9"], // lime → green → sky
  ["#EAB308", "#F97316", "#EF4444"], // yellow → orange → red
];

const hashTitle = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getInitials = (title: string) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "AI";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const CourseThumbnail = ({
  src,
  alt,
  title,
  className,
  imgClassName,
  priority,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  rounded = "rounded-t-xl",
}: Props) => {
  const label = title || alt;
  const fallback = useMemo(() => {
    const palette = GRADIENTS[hashTitle(label) % GRADIENTS.length];
    return {
      bg: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 50%, ${palette[2]} 100%)`,
      initials: getInitials(label),
    };
  }, [label]);

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-secondary/60",
        rounded,
        className,
      )}
      style={src ? { background: fallback.bg } : undefined}
    >
      {src ? (
        <img
          src={src}
          srcSet={buildSrcSet(src)}
          sizes={sizes}
          alt={alt}
          width={1280}
          height={720}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error - valid HTML attribute
          fetchpriority={priority ? "high" : "low"}
          className={cn(
            "h-full w-full object-contain transition-transform duration-300",
            imgClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-white",
            imgClassName,
          )}
          style={{ background: fallback.bg }}
          aria-label={alt}
          role="img"
        >
          {/* subtle pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.25) 0, transparent 45%)",
            }}
          />
          <div className="relative flex flex-col items-center justify-center px-4 text-center">
            <span className="text-3xl font-extrabold tracking-tight drop-shadow-md sm:text-4xl">
              {fallback.initials}
            </span>
            <span className="mt-1 line-clamp-2 max-w-[90%] text-[11px] font-medium uppercase tracking-wider text-white/85 sm:text-xs">
              {label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseThumbnail;
