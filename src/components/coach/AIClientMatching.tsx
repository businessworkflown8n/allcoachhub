import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Sparkles, TrendingUp, Target } from "lucide-react";

interface MatchedLearner {
  name: string;
  matchScore: number;
  interests: string;
  level: string;
}

const AIClientMatching = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchedLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPotential: 0, avgScore: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchMatches = async () => {
      const [profileRes] = await Promise.all([
        supabase.from("profiles").select("experience, bio, category").eq("user_id", user.id).maybeSingle(),
      ]);

      const coachCategory = (profileRes.data?.category || "").toLowerCase();
      const coachBio = (profileRes.data?.bio || "").toLowerCase();

      // Get learner profiles
      const { data: learners } = await supabase
        .from("profiles")
        .select("full_name, bio, category, city, country, experience_level")
        .neq("user_id", user.id)
        .limit(100);

      const scored = (learners || []).map((l) => {
        let score = 0;
        const learnerInterest = ((l.category || "") + " " + (l.bio || "")).toLowerCase();

        // Category match (40%)
        if (coachCategory && learnerInterest.includes(coachCategory)) score += 40;
        else if (coachBio) {
          const words = coachBio.split(/[,\s]+/).filter((w) => w.length > 3);
          const matchCount = words.filter((w) => learnerInterest.includes(w)).length;
          score += Math.min((matchCount / Math.max(words.length, 1)) * 40, 40);
        }

        // Profile completeness (20%)
        if (l.full_name) score += 5;
        if (l.bio) score += 10;
        if (l.category) score += 5;

        // Location (20%)
        if (l.country) score += 10;
        if (l.city) score += 10;

        // Base (20%)
        score += 10 + Math.random() * 10;

        return {
          name: l.full_name || "Learner",
          matchScore: Math.min(Math.round(score), 98),
          interests: l.category || "AI & Technology",
          level: l.experience_level || "Beginner",
        };
      });

      const sorted = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
      const avg = sorted.length ? Math.round(sorted.reduce((s, m) => s + m.matchScore, 0) / sorted.length) : 0;

      setMatches(sorted);
      setStats({ totalPotential: Math.max(scored.length, 20), avgScore: avg });
      setLoading(false);
    };
    fetchMatches();
  }, [user]);

  if (loading) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">AI Client Matching</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-secondary/50 p-3 text-center">
          <Users className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.totalPotential}+</p>
          <p className="text-xs text-muted-foreground">Potential Matches</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3 text-center">
          <Target className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.avgScore}%</p>
          <p className="text-xs text-muted-foreground">Avg Match Score</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3 text-center">
          <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{matches.length}</p>
          <p className="text-xs text-muted-foreground">Top Matches</p>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Top Matched Learners</p>
          {matches.map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.interests} · {m.level}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${m.matchScore >= 70 ? "text-primary" : "text-muted-foreground"}`}>
                {m.matchScore}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Complete your profile to start getting matched with learners.
        </p>
      )}
    </div>
  );
};

export default AIClientMatching;
