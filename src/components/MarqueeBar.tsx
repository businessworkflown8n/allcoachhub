import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MarqueeMessage {
  id: string;
  message: string;
  text_color: string;
  bg_color: string;
  scroll_speed: number;
}

interface MarqueeBarProps {
  segment: "website" | "learner" | "coach";
  position?: "header" | "footer";
}

const MarqueeBar = ({ segment, position = "header" }: MarqueeBarProps) => {
  const [messages, setMessages] = useState<MarqueeMessage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const now = new Date().toISOString();
      const { data } = await (supabase
        .from("marquee_messages") as any)
        .select("id, message, text_color, bg_color, scroll_speed, position")
        .eq("segment", segment)
        .eq("is_active", true)
        .eq("position", position)
        .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order("sort_order");
      if (data?.length) setMessages(data);
      else setMessages([]);
    };
    fetchMessages();
  }, [segment, position]);

  if (!messages.length) return null;

  const combined = messages.map((m) => m.message).join("   •   ");
  const speed = messages[0]?.scroll_speed || 50;
  const duration = Math.max(10, combined.length * (100 / speed));

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: messages[0]?.bg_color || "hsl(var(--card))" }}
    >
      <div
        ref={containerRef}
        className="marquee-scroll whitespace-nowrap py-2 text-sm font-bold"
        style={{
          color: messages[0]?.text_color || "hsl(var(--primary))",
          animationDuration: `${duration}s`,
        }}
      >
        <span className="inline-block px-8">{combined}</span>
        <span className="inline-block px-8">{combined}</span>
      </div>
    </div>
  );
};

export default MarqueeBar;
