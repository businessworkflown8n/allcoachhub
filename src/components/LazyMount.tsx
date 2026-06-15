import { ReactNode, useEffect, useRef, useState } from "react";

interface LazyMountProps {
  children: ReactNode;
  /** Min height reserved before mount to prevent CLS */
  minHeight?: number;
  /** Root margin for IntersectionObserver */
  rootMargin?: string;
  fallback?: ReactNode;
}

/**
 * Mounts children only when scrolled near viewport.
 * Reduces initial JS execution & main-thread work on mobile.
 */
const LazyMount = ({
  children,
  minHeight = 300,
  rootMargin = "400px 0px",
  fallback = null,
}: LazyMountProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={!visible ? { minHeight } : undefined}>
      {visible ? children : fallback}
    </div>
  );
};

export default LazyMount;
