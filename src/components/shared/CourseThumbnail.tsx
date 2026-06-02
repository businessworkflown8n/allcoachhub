import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  alt: string;
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
    // /storage/v1/object/(public|sign|authenticated)/<bucket>/<path>
    u.pathname = u.pathname.replace(
      "/storage/v1/object/",
      "/storage/v1/render/image/",
    );
    u.searchParams.set("width", String(width));
    u.searchParams.set("quality", "75");
    u.searchParams.set("resize", "cover");
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

const CourseThumbnail = ({
  src,
  alt,
  className,
  imgClassName,
  priority,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  rounded = "rounded-t-xl",
}: Props) => {
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-secondary/60",
        rounded,
        className,
      )}
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
            "h-full w-full object-cover transition-transform duration-300",
            imgClassName,
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <GraduationCap className="h-12 w-12" />
        </div>
      )}
    </div>
  );
};

export default CourseThumbnail;
