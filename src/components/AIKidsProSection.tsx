import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, GraduationCap, Rocket, Award, Video, BookOpen } from "lucide-react";

const levels = [
  { name: "AI Explorer", grade: "Class 5–6", weeks: "4 Weeks · 8 Live Sessions", color: "from-emerald-500/20 to-teal-500/10", icon: "🌱" },
  { name: "AI Creator", grade: "Class 7–8", weeks: "6 Weeks · 12 Live Sessions", color: "from-sky-500/20 to-blue-500/10", icon: "🎨" },
  { name: "AI Innovator", grade: "Class 9–10", weeks: "8 Weeks · 16 Live Sessions", color: "from-violet-500/20 to-fuchsia-500/10", icon: "💡" },
  { name: "AI Future Leader", grade: "Class 11–12", weeks: "10 Weeks · 20 Live Sessions", color: "from-amber-500/20 to-orange-500/10", icon: "🚀" },
];

const bullets = [
  "ChatGPT & Generative AI",
  "AI-Powered Creativity",
  "AI Tools for School Projects",
  "AI Website Creation",
  "AI Video Creation",
  "AI Automation Basics",
  "Future Career Skills",
  "Digital Productivity",
];

const modes = [
  { icon: Video, label: "Live Classes" },
  { icon: BookOpen, label: "Self-Paced" },
  { icon: Video, label: "Recordings" },
  { icon: GraduationCap, label: "Assignments" },
  { icon: Rocket, label: "Projects" },
  { icon: Award, label: "Certificates" },
];

const AIKidsProSection = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase
      .from("course_categories" as any)
      .select("is_visible")
      .eq("slug", "ai-kids-pro")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data && data.is_visible === false) setVisible(false);
      });
  }, []);

  if (!visible) return null;

  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-background via-primary/5 to-background py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> NEW · Future Skills Academy
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
            🚀 AI Kids Pro
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            Future Skills Program for <span className="font-semibold text-foreground">Class 5–12</span> students.
            Give your child a head start in the AI-powered world.
          </p>
        </div>

        {/* What they'll learn */}
        <div className="mx-auto mb-10 grid max-w-5xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {bullets.map((b) => (
            <div key={b} className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm">
              <span className="text-emerald-500">✅</span>
              <span className="text-foreground">{b}</span>
            </div>
          ))}
        </div>

        {/* 4 Levels */}
        <div className="mx-auto mb-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((lv, i) => (
            <div
              key={lv.name}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${lv.color} p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10`}
            >
              <div className="mb-2 text-3xl">{lv.icon}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Level {i + 1}</div>
              <h3 className="mt-1 text-lg font-bold text-foreground">{lv.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{lv.grade}</p>
              <p className="mt-3 text-xs font-medium text-foreground/80">{lv.weeks}</p>
            </div>
          ))}
        </div>

        {/* Learning modes */}
        <div className="mx-auto mb-10 flex max-w-4xl flex-wrap items-center justify-center gap-2">
          {modes.map((m) => (
            <div key={m.label} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
              <m.icon className="h-3.5 w-3.5 text-primary" /> {m.label}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/courses?category=AI%20Kids%20Pro" className="cta-3d primary">
            Explore AI Kids Pro <span className="cta-arrow">→</span>
          </Link>
          <Link to="/signup" className="cta-3d secondary">
            Enroll Your Child
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AIKidsProSection;
