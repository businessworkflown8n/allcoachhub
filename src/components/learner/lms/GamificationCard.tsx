import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Flame, Star, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const GamificationCard = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState<{ total_xp: number; level: number } | null>(null);
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number } | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [x, s, b] = await Promise.all([
        supabase.from("learner_xp" as any).select("total_xp, level").eq("user_id", user.id).maybeSingle(),
        supabase.from("learner_streaks" as any).select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
        supabase.from("learner_course_badges" as any).select("*, course_badges(name, icon, description)").eq("user_id", user.id).order("awarded_at", { ascending: false }).limit(6),
      ]);
      setXp((x.data as any) || { total_xp: 0, level: 1 });
      setStreak((s.data as any) || { current_streak: 0, longest_streak: 0 });
      setBadges((b.data as any) || []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Skeleton className="h-32 w-full" />;

  const nextLevel = (xp?.level || 1) * 100;
  const progress = Math.min(100, Math.round(((xp?.total_xp || 0) % 100)));

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Trophy className="h-4 w-4 text-yellow-400" />} label="Level" value={xp?.level || 1} />
        <Stat icon={<Star className="h-4 w-4 text-primary" />} label="Total XP" value={xp?.total_xp || 0} />
        <Stat icon={<Flame className="h-4 w-4 text-orange-400" />} label="Streak" value={`${streak?.current_streak || 0}d`} />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Next level: {nextLevel} XP</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {badges.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1"><Award className="h-3 w-3" /> Recent Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div key={b.id} title={b.course_badges?.description}
                className="flex items-center gap-1.5 rounded-full bg-secondary/70 px-3 py-1 text-xs">
                <span>{b.course_badges?.icon || "🏆"}</span>
                <span>{b.course_badges?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ icon, label, value }: any) => (
  <div className="rounded-xl bg-background/50 p-3 text-center">
    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">{icon} {label}</div>
    <p className="text-xl font-bold mt-1">{value}</p>
  </div>
);

export default GamificationCard;
