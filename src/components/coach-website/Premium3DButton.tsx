import { motion } from "framer-motion";
import { ReactNode, MouseEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  themeColor?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "neon";
  className?: string;
  type?: "button" | "submit";
}

const Premium3DButton = ({
  children,
  onClick,
  themeColor = "#84cc16",
  size = "lg",
  variant = "solid",
  className,
  type = "button",
}: Props) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: (e.clientX - r.left - r.width / 2) * 0.15, y: (e.clientY - r.top - r.height / 2) * 0.15 });
  };

  const sizeCls = { sm: "px-4 py-2 text-sm", md: "px-6 py-3 text-base", lg: "px-8 py-4 text-base md:text-lg" }[size];

  const baseStyle =
    variant === "outline"
      ? { backgroundColor: "transparent", border: `2px solid ${themeColor}`, color: themeColor }
      : variant === "neon"
      ? {
          background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
          color: "#0B0F1A",
          boxShadow: `0 10px 30px -8px ${themeColor}80, 0 0 24px ${themeColor}55, inset 0 1px 0 rgba(255,255,255,0.4)`,
        }
      : {
          background: `linear-gradient(135deg, ${themeColor}, ${themeColor}d8)`,
          color: "#0B0F1A",
          boxShadow: `0 12px 28px -8px ${themeColor}70, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15)`,
        };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 250, damping: 18 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      style={baseStyle}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-tight",
        "transition-shadow duration-200 will-change-transform",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        sizeCls,
        className
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      {variant !== "outline" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle at center, ${themeColor}40, transparent 70%)` }}
        />
      )}
    </motion.button>
  );
};

export default Premium3DButton;
